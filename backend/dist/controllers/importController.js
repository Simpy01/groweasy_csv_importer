"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCsv = importCsv;
const csvService_1 = require("../services/csvService");
const aiService_1 = require("../services/aiService");
async function importCsv(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });
        }
        const rows = (0, csvService_1.parseCsvBuffer)(req.file.buffer);
        const { importedRecords, skippedRecords } = await (0, aiService_1.extractLeadsFromRows)(rows);
        const skipReasons = skippedRecords.reduce((acc, item) => {
            acc[item.reason] = (acc[item.reason] || 0) + 1;
            return acc;
        }, {});
        const result = {
            success: true,
            totalRows: rows.length,
            importedCount: importedRecords.length,
            skippedCount: skippedRecords.length,
            importedRecords,
            skippedRecords,
            skipReasons,
        };
        return res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to process CSV.';
        return res.status(500).json({ success: false, message });
    }
}
