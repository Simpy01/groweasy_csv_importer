import { parse } from 'papaparse';
export function parseCsvBuffer(buffer) {
    const text = buffer.toString('utf8');
    const result = parse(text, {
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
