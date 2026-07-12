"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvBuffer = parseCsvBuffer;
const papaparse_1 = require("papaparse");
function parseCsvBuffer(buffer) {
    const text = buffer.toString('utf8');
    const result = (0, papaparse_1.parse)(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
    });
    if (result.errors && result.errors.length) {
        const firstError = result.errors[0];
        throw new Error(`CSV parsing issue: ${firstError.message}`);
    }
    return result.data.filter((row) => Object.values(row).some((value) => value && value.length > 0));
}
