import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import type { ExtractedLead, ParsedCsvRow, SkippedRecord } from '../types/lead';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const allowedStatuses = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
const allowedSources = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];

function normalizeStatus(value?: string) {
  const upper = (value || '').trim().toUpperCase();
  return allowedStatuses.includes(upper) ? upper : '';
}

function normalizeSource(value?: string) {
  const normalized = (value || '').trim().toLowerCase();
  return allowedSources.includes(normalized) ? normalized : '';
}

function stripUndefined<T extends Record<string, unknown>>(input: T): T {
  const result: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  });
  return result as T;
}

function extractContactDetails(row: ParsedCsvRow) {
  const phoneCandidates = Object.values(row)
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => /\d/.test(value) && value.length >= 7);

  const emailCandidates = Object.values(row)
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => /@/.test(value));

  const firstEmail = emailCandidates[0] || '';
  const otherEmails = emailCandidates.slice(1);
  const firstPhone = phoneCandidates[0] || '';
  const otherPhones = phoneCandidates.slice(1);

  return { firstEmail, otherEmails, firstPhone, otherPhones };
}

export async function extractLeadsFromRows(rows: ParsedCsvRow[]): Promise<{ importedRecords: ExtractedLead[]; skippedRecords: SkippedRecord[] }> {
  const importedRecords: ExtractedLead[] = [];
  const skippedRecords: SkippedRecord[] = [];

  for (const [index, row] of rows.entries()) {
    const { firstEmail, otherEmails, firstPhone, otherPhones } = extractContactDetails(row);

    if (!firstEmail && !firstPhone) {
      skippedRecords.push({
        rowNumber: index + 2,
        reason: 'Missing email or mobile number',
        record: row,
      });
      continue;
    }

    const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
      acc[key] = value || '';
      return acc;
    }, {} as ParsedCsvRow);

    const prompt = `You are extracting CRM leads from a CSV row. Use the provided data only. Return valid JSON with a single object containing fields: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.

Rules:
- crm_status must be one of ${allowedStatuses.join(', ')} or empty.
- data_source must be one of ${allowedSources.join(', ')} or empty.
- created_at must be a date string that JavaScript can parse.
- If multiple emails exist, use the first email and append the rest to crm_note separated by '; '.
- If multiple mobile numbers exist, use the first mobile and append the rest to crm_note separated by '; '.
- If the row contains neither an email nor a mobile, skip it.
- Keep each output in a single-line JSON object without markdown.

Row data:
${JSON.stringify(normalizedRow)}`;

    if (!ai) {
      const fallback: ExtractedLead = {
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
        crm_note: [otherEmails.join('; '), otherPhones.join('; ')].filter(Boolean).join(' | '),
        data_source: normalizeSource(row.data_source || row.DataSource || ''),
        possession_time: row.possession_time || row.PossessionTime || '',
        description: row.description || row.Description || row.notes || '',
      };

      importedRecords.push({ rowNumber: index + 2, ...stripUndefined(fallback) });
      continue;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const normalizedLead: ExtractedLead = {
        rowNumber: index + 2,
        created_at: parsed.created_at || '',
        name: parsed.name || '',
        email: parsed.email || firstEmail,
        country_code: parsed.country_code || '',
        mobile_without_country_code: parsed.mobile_without_country_code || firstPhone,
        company: parsed.company || '',
        city: parsed.city || '',
        state: parsed.state || '',
        country: parsed.country || '',
        lead_owner: parsed.lead_owner || '',
        crm_status: normalizeStatus(parsed.crm_status),
        crm_note: parsed.crm_note || '',
        data_source: normalizeSource(parsed.data_source),
        possession_time: parsed.possession_time || '',
        description: parsed.description || '',
      };

      importedRecords.push(stripUndefined(normalizedLead));
    } catch {
      const fallback: ExtractedLead = {
        rowNumber: index + 2,
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
        crm_note: [otherEmails.join('; '), otherPhones.join('; ')].filter(Boolean).join(' | '),
        data_source: normalizeSource(row.data_source || row.DataSource || ''),
        possession_time: row.possession_time || row.PossessionTime || '',
        description: row.description || row.Description || row.notes || '',
      };

      importedRecords.push(stripUndefined(fallback));
    }
  }

  return { importedRecords, skippedRecords };
}
