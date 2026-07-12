import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import type { ExtractedLead, ParsedCsvRow, SkippedRecord } from '../types/lead.js';
import { normalizeDate, normalizeEmail, normalizePhone, normalizeSource, normalizeStatus, stripUndefined } from '../utils/normalize.js';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY not set');
  process.exit(1);
}

const ai = new GoogleGenAI({});
const BATCH_SIZE = 10;
const MAX_CONCURRENCY = 3;

function extractContactDetails(row: ParsedCsvRow) {
  const phoneCandidates = Object.values(row)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => normalizePhone(value))
    .map((value) => normalizePhone(value)!);

  const emailCandidates = Object.values(row)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => normalizeEmail(value))
    .map((value) => normalizeEmail(value)!);

  const firstEmail = emailCandidates[0] || '';
  const otherEmails = emailCandidates.slice(1);
  const firstPhone = phoneCandidates[0] || '';
  const otherPhones = phoneCandidates.slice(1);

  return { firstEmail, otherEmails, firstPhone, otherPhones };
}

function buildPrompt(rows: ParsedCsvRow[], headers: string[]) {
  return `You are extracting CRM leads from CSV rows. Use the CSV headers as the primary signal and only use row values as fallback evidence.

Headers: ${headers.join(', ')}

Rows:
${JSON.stringify(rows)}

Return valid JSON as an array of objects in the same order as the input rows. Each object must contain these fields only: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.

Rules:
- Use header names first to infer meaning. Example mappings: email / primary email / email address -> email; phone / mobile / mobile no / telephone -> mobile_without_country_code; company / organization / organisation / firm -> company; lead full name / customer name / client / full name -> name; city -> city; province / region -> state; nation / country -> country; assigned to / sales person / lead owner -> lead_owner; created on / created date / timestamp -> created_at; remarks / notes / comments / status remarks -> crm_note; source / campaign / origin -> data_source.
- A column is a DATE if its values look like timestamps (contain '-', '/', or ':' patterns, or match YYYY-MM-DD). A column is a PHONE if its values are pure digit strings, typically 7-15 digits, with no date-like separators.
- Never map a date/timestamp value into mobile_without_country_code, even if it is numeric-only after removing punctuation.
- crm_status must be one of GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE or empty.
- data_source must be one of leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots or empty.
- created_at must be a JavaScript-compatible date string or empty.
- If multiple emails exist, use the first valid email and append the rest to crm_note separated by '; '.
- If multiple mobile numbers exist, use the first valid phone and append the rest to crm_note separated by '; '.
- Never invent content. Leave unknown fields empty.
- Return only a JSON array with no markdown and no extra explanation.`;
}

function validateLead(record: ExtractedLead): ExtractedLead | null {
  const email = normalizeEmail(String(record.email || ''));
  const phone = normalizePhone(String(record.mobile_without_country_code || ''));

  if (!email && !phone) {
    return null;
  }

  return {
    ...record,
    email,
    mobile_without_country_code: phone,
    created_at: normalizeDate(String(record.created_at || '')),
    crm_status: normalizeStatus(String(record.crm_status || '')),
    data_source: normalizeSource(String(record.data_source || '')),
    crm_note: String(record.crm_note || '').trim(),
  };
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

async function processWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>) {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function extractBatch(rows: ParsedCsvRow[], startIndex: number): Promise<ExtractedLead[]> {
  const normalizedRows = rows.map((row) => Object.entries(row).reduce((acc, [key, value]) => {
    acc[key] = value || '';
    return acc;
  }, {} as ParsedCsvRow));

  const headers = Object.keys(normalizedRows[0] || {});
  const prompt = buildPrompt(normalizedRows, headers);

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }));

    const text = response.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error('Gemini response was not a JSON array.');
    }

    return parsed.map((item: Record<string, unknown>, rowIndex: number) => {
      const row = rows[rowIndex];
      const { firstEmail, firstPhone } = extractContactDetails(row);

      const normalizedLead: ExtractedLead = {
        rowNumber: startIndex + rowIndex + 2,
        created_at: String(item.created_at || ''),
        name: String(item.name || ''),
        email: String(item.email || firstEmail),
        country_code: String(item.country_code || ''),
        mobile_without_country_code: String(item.mobile_without_country_code || firstPhone),
        company: String(item.company || ''),
        city: String(item.city || ''),
        state: String(item.state || ''),
        country: String(item.country || ''),
        lead_owner: String(item.lead_owner || ''),
        crm_status: normalizeStatus(String(item.crm_status || '')),
        crm_note: String(item.crm_note || ''),
        data_source: normalizeSource(String(item.data_source || '')),
        possession_time: String(item.possession_time || ''),
        description: String(item.description || ''),
      };

      return normalizeLead(normalizedLead, row, firstEmail, firstPhone);
    });
  } catch (error) {
    console.error(`Batch extraction failed for rows ${startIndex + 2}..${startIndex + rows.length + 1}:`, error);
    return rows.map((row, rowIndex) => {
      const { firstEmail, firstPhone } = extractContactDetails(row);
      const fallback: ExtractedLead = {
        rowNumber: startIndex + rowIndex + 2,
        created_at: row.created_at || row.CreatedAt || row.date || '',
        name: row.name || row.Name || row.full_name || row['Lead Name'] || '',
        email: firstEmail,
        country_code: row.country_code || row.CountryCode || '',
        mobile_without_country_code: firstPhone,
        company: row.company || row.Company || row.organization || '',
        city: row.city || row.City || '',
        state: row.state || row.State || '',
        country: row.country || row.Country || '',
        lead_owner: row.lead_owner || row.LeadOwner || '',
        crm_status: normalizeStatus(row.crm_status || row.CRMStatus || ''),
        crm_note: '',
        data_source: normalizeSource(row.data_source || row.DataSource || ''),
        possession_time: row.possession_time || row.PossessionTime || '',
        description: row.description || row.Description || row.notes || '',
      };

      return stripUndefined(fallback);
    });
  }
}

function normalizeLead(record: ExtractedLead, row: ParsedCsvRow, firstEmail: string, firstPhone: string) {
  const fallback: ExtractedLead = {
    rowNumber: record.rowNumber,
    created_at: row.created_at || row.CreatedAt || row.date || '',
    name: row.name || row.Name || row.full_name || row['Lead Name'] || '',
    email: firstEmail,
    country_code: row.country_code || row.CountryCode || '',
    mobile_without_country_code: firstPhone,
    company: row.company || row.Company || row.organization || '',
    city: row.city || row.City || '',
    state: row.state || row.State || '',
    country: row.country || row.Country || '',
    lead_owner: row.lead_owner || row.LeadOwner || '',
    crm_status: normalizeStatus(row.crm_status || row.CRMStatus || ''),
    crm_note: '',
    data_source: normalizeSource(row.data_source || row.DataSource || ''),
    possession_time: row.possession_time || row.PossessionTime || '',
    description: row.description || row.Description || row.notes || '',
  };

  const validatedLead = validateLead(record);
  return validatedLead || stripUndefined(fallback);
}

export async function extractLeadsFromRows(rows: ParsedCsvRow[]): Promise<{ importedRecords: ExtractedLead[]; skippedRecords: SkippedRecord[] }> {
  const importedRecords: ExtractedLead[] = [];
  const skippedRecords: SkippedRecord[] = [];

  const rowBatches: ParsedCsvRow[][] = [];
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    rowBatches.push(rows.slice(index, index + BATCH_SIZE));
  }

  const batchResults = await processWithConcurrency(rowBatches, MAX_CONCURRENCY, async (batch, batchIndex) => {
    const startIndex = batchIndex * BATCH_SIZE;
    return extractBatch(batch, startIndex);
  });

  for (const [batchIndex, batchResult] of batchResults.entries()) {
    const startIndex = batchIndex * BATCH_SIZE;
    for (const [rowIndex, record] of batchResult.entries()) {
      const row = rows[startIndex + rowIndex];
      const { firstEmail, firstPhone } = extractContactDetails(row);
      if (!firstEmail && !firstPhone) {
        skippedRecords.push({
          rowNumber: startIndex + rowIndex + 2,
          reason: 'Missing email or mobile number',
          record: row,
        });
        continue;
      }

      const hasValidLead = Boolean(record.email || record.mobile_without_country_code);
      if (!hasValidLead) {
        skippedRecords.push({
          rowNumber: startIndex + rowIndex + 2,
          reason: 'Missing email or mobile number after validation',
          record: row,
        });
        continue;
      }

      importedRecords.push(record);
    }
  }

  return { importedRecords, skippedRecords };
}
