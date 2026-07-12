"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";

interface UploadCardProps {
  selectedFile: File | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  onFileSelected: (file: File) => void;
}

export default function UploadCard({
  selectedFile,
  setSelectedFile,
  onFileSelected,
}: UploadCardProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelected(file);
    }
  }, [onFileSelected, setSelectedFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
    onDrop,
  });

  return (
    <div className="rounded-xl border bg-white p-10 shadow-sm">
      <div className="mx-auto max-w-2xl text-center">
        <Upload size={60} className="mx-auto mb-6 text-blue-600" />

        <h2 className="mb-3 text-3xl font-bold">Upload your CSV</h2>

        <p className="mb-8 text-slate-500">
          Import leads from any CRM export and inspect them before AI processing.
        </p>

        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-16 transition ${
            isDragActive
              ? "border-blue-600 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50"
          }`}
        >
          <input {...getInputProps()} />

          <Upload size={45} className="mx-auto mb-4 text-blue-600" />

          <p className="font-medium">
            {isDragActive ? "Drop the CSV here..." : "Drag & Drop CSV here"}
          </p>

          <p className="mt-2 text-slate-500">or click to browse</p>
        </div>

        {selectedFile && (
          <div className="mt-8 rounded-lg border bg-slate-50 p-4 text-left">
            <div className="flex items-center gap-3">
              <FileText className="text-green-600" />

              <div>
                <p className="font-semibold">{selectedFile.name}</p>

                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}