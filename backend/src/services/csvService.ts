import { parse } from 'papaparse';
import type { ParsedCsvRow } from '../types/lead.js';

export function parseCsvBuffer(buffer: Buffer): ParsedCsvRow[] {
  const text = buffer.toString('utf8');
  const result = parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  });

  if (result.errors && result.errors.length) {
    const firstError = result.errors[0];
    throw new Error(`CSV parsing issue: ${firstError.message}`);
  }

  return result.data.filter((row: Record<string, string>) => Object.values(row).some((value: string) => value && value.length > 0));
}
