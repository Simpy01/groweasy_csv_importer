export interface ParsedCsvRow {
  [key: string]: string;
}

export interface ExtractedLead {
  rowNumber?: number;
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: string;
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
  [key: string]: string | number | undefined;
}

export interface SkippedRecord {
  rowNumber: number;
  reason: string;
  record: ParsedCsvRow;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  importedRecords: ExtractedLead[];
  skippedRecords: SkippedRecord[];
}
