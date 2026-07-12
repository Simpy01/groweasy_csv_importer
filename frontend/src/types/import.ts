export interface CsvPreviewRow {
  [key: string]: string;
}

export interface ImportedLead {
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
  crm_status_display?: string;
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
}

export interface SkippedRecord {
  rowNumber: number;
  reason: string;
  record: CsvPreviewRow;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  importedRecords: ImportedLead[];
  skippedRecords: SkippedRecord[];
  skipReasons: Record<string, number>;
}
