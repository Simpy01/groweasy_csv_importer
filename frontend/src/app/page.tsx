"use client";

import { useState } from "react";
import Papa from "papaparse";
import Header from "@/components/layout/Header";
import UploadCard from "@/components/upload/UploadCard";
import DataTable from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { uploadCsvFile } from "@/services/importService";
import type { CsvPreviewRow, ImportResult } from "@/types/import";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = (file: File) => {
    setError(null);
    setImportResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      complete: (result: any) => {
        setPreviewRows(result.data.slice(0, 15));
      },
      error: () => {
        setError("The selected file could not be parsed as CSV.");
      },
    });
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await uploadCsvFile(selectedFile);
      setImportResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="container mx-auto max-w-6xl px-6 py-10 space-y-8">
        <UploadCard
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          onFileSelected={handleFileSelected}
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {selectedFile && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">CSV Preview</h2>
                <p className="text-sm text-slate-500">
                  Review the uploaded rows before sending them for AI
                  extraction.
                </p>
              </div>
              <Button onClick={handleConfirmImport} disabled={isLoading}>
                {isLoading ? "Importing..." : "Confirm Import"}
              </Button>
            </div>

            <DataTable
              data={previewRows}
              title="Uploaded Rows"
              emptyMessage="No preview rows available."
            />
          </div>
        )}

        {importResult && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Total Rows</p>
                <p className="text-2xl font-semibold">
                  {importResult.totalRows}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Imported</p>
                <p className="text-2xl font-semibold text-green-600">
                  {importResult.importedCount}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Skipped</p>
                <p className="text-2xl font-semibold text-amber-600">
                  {importResult.skippedCount}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Status</p>
                <p className="text-2xl font-semibold">
                  {importResult.success ? "Ready" : "Failed"}
                </p>
              </div>
            </div>

            {Object.keys(importResult.skipReasons || {}).length > 0 && (
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold">Skip Reasons</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {Object.entries(importResult.skipReasons || {}).map(
                    ([reason, count]) => (
                      <li key={reason}>
                        {reason}: {count}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            <DataTable
              data={importResult.importedRecords}
              title="Parsed CRM Records"
              emptyMessage="No records were imported."
            />
            <DataTable
              data={importResult.skippedRecords}
              title="Skipped Records"
              emptyMessage="No records were skipped."
            />
          </div>
        )}
      </section>
    </main>
  );
}
