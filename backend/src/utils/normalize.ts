const allowedStatuses = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
const allowedSources = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];

export function normalizeStatus(value?: string) {
  const text = (value || '').trim().toLowerCase();
  if (!text) return '';
  if (['interested', 'follow up', 'follow-up', 'good lead', 'good lead follow up', 'call back', 'callback'].includes(text)) return 'GOOD_LEAD_FOLLOW_UP';
  if (['no response', 'did not connect', 'not connected', 'busy', 'call later'].includes(text)) return 'DID_NOT_CONNECT';
  if (['wrong number', 'bad lead', 'not interested', 'invalid'].includes(text)) return 'BAD_LEAD';
  if (['deal closed', 'sale done', 'closed', 'won'].includes(text)) return 'SALE_DONE';
  return '';
}

export function normalizeSource(value?: string) {
  const normalized = (value || '').trim().toLowerCase();
  return allowedSources.includes(normalized) ? normalized : '';
}

export function normalizeDate(value?: string) {
  if (!value) return '';
  const trimmed = value.trim();
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

export function normalizePhone(value?: string) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';

  const hasDateLikeChars = /[-/:.]/.test(trimmed);
  const looksLikeDate = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:?\d{2}(?::?\d{2})?)?$/.test(trimmed);
  if (hasDateLikeChars && looksLikeDate) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  return digits;
}

export function normalizeEmail(value?: string) {
  if (!value) return '';
  const trimmed = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : '';
}

export function stripUndefined<T extends object>(input: T): T {
  const result: Record<string, unknown> = {};
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  });
  return result as T;
}
