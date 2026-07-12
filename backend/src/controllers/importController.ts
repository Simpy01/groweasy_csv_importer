import type { Request, Response } from 'express';
import { parseCsvBuffer } from '../services/csvService';
import { extractLeadsFromRows } from '../services/aiService';
import type { ImportResult } from '../types/lead';

export async function importCsv(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });
    }

    const rows = parseCsvBuffer(req.file.buffer);
    const { importedRecords, skippedRecords } = await extractLeadsFromRows(rows);

    const skipReasons = skippedRecords.reduce<Record<string, number>>((acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1;
      return acc;
    }, {});

    const result: ImportResult = {
      success: true,
      totalRows: rows.length,
      importedCount: importedRecords.length,
      skippedCount: skippedRecords.length,
      importedRecords,
      skippedRecords,
      skipReasons,
    };

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process CSV.';
    return res.status(500).json({ success: false, message });
  }
}
