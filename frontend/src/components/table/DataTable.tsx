"use client";

import { useMemo } from "react";

interface DataTableProps<T extends object> {
  data: T[];
  title: string;
  emptyMessage?: string;
}

export default function DataTable<T extends object>({
  data,
  title,
  emptyMessage = "No rows to display.",
}: DataTableProps<T>) {
  const columns = useMemo(() => {
    if (!data.length) return [] as string[];
    return Array.from(new Set(data.flatMap((row) => Object.keys(row))));
  }, [data]);

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-slate-500">{data.length} rows</span>
      </div>

      <div className="overflow-auto rounded-lg border">
        {data.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {data.map((row, idx) => (
                <tr key={`${title}-${idx}`} className="hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={`${column}-${idx}`} className="max-w-56 truncate px-3 py-3 align-top text-slate-700">
                      {String((row as Record<string, unknown>)[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
