import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const allowedStatuses = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
const allowedSources = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];
function normalizeStatus(value) {
    const text = (value || '').trim().toLowerCase();
    if (!text)
        return '';
    if (['interested', 'follow up', 'follow-up', 'good lead', 'good lead follow up', 'call back', 'callback'].includes(text))
        return 'GOOD_LEAD_FOLLOW_UP';
    if (['no response', 'did not connect', 'not connected', 'busy', 'call later'].includes(text))
        return 'DID_NOT_CONNECT';
    if (['wrong number', 'bad lead', 'not interested', 'invalid'].includes(text))
        return 'BAD_LEAD';
    if (['deal closed', 'sale done', 'closed', 'won'].includes(text))
        return 'SALE_DONE';
    return '';
}
function normalizeSource(value) {
    const normalized = (value || '').trim().toLowerCase();
    return allowedSources.includes(normalized) ? normalized : '';
}
function normalizeDate(value) {
    if (!value)
        return '';
    const trimmed = value.trim();
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}
function normalizePhone(value) {
    if (!value)
        return '';
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15)
        return '';
    return digits;
}
function normalizeEmail(value) {
    if (!value)
        return '';
    const trimmed = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : '';
}
function stripUndefined(input) {
    const result = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            result[key] = value;
        }
    });
    return result;
}
function extractContactDetails(row) {
    const phoneCandidates = Object.values(row)
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => normalizePhone(value))
        .map((value) => normalizePhone(value));
    const emailCandidates = Object.values(row)
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => normalizeEmail(value))
        .map((value) => normalizeEmail(value));
    const firstEmail = emailCandidates[0] || '';
    const otherEmails = emailCandidates.slice(1);
    const firstPhone = phoneCandidates[0] || '';
    const otherPhones = phoneCandidates.slice(1);
    return { firstEmail, otherEmails, firstPhone, otherPhones };
}
function buildPrompt(row, headers) {
    return `You are extracting CRM leads from a CSV row. Use the CSV headers as the primary signal and only use row values as fallback evidence.

Headers: ${headers.join(', ')}

Row data:
${JSON.stringify(row)}

Return valid JSON with a single object containing these fields only: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.

Rules:
- Use header names first to infer meaning. Example mappings: email / primary email / email address -> email; phone / mobile / mobile no / telephone -> mobile_without_country_code; company / organization / organisation / firm -> company; lead full name / customer name / client / full name -> name; city -> city; province / region -> state; nation / country -> country; assigned to / sales person / lead owner -> lead_owner; created on / created date / timestamp -> created_at; remarks / notes / comments / status remarks -> crm_note; source / campaign / origin -> data_source.
- crm_status must be one of GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE or empty.
- data_source must be one of leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots or empty.
- created_at must be a JavaScript-compatible date string or empty.
- If multiple emails exist, use the first valid email and append the rest to crm_note separated by '; '.
- If multiple mobile numbers exist, use the first valid phone and append the rest to crm_note separated by '; '.
- Never invent content. Leave unknown fields empty.
- Return only one JSON object with no markdown and no extra explanation.`;
}
function validateLead(record) {
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
export async function extractLeadsFromRows(rows) {
    const importedRecords = [];
    const skippedRecords = [];
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
        }, {});
        const headers = Object.keys(normalizedRow);
        const prompt = buildPrompt(normalizedRow, headers);
        if (!ai) {
            const fallback = {
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
            const normalizedLead = {
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
            const validatedLead = validateLead(normalizedLead);
            if (!validatedLead) {
                skippedRecords.push({
                    rowNumber: index + 2,
                    reason: 'Missing email or mobile number after validation',
                    record: row,
                });
                continue;
            }
            importedRecords.push(stripUndefined(validatedLead));
        }
        catch {
            const fallback = {
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
