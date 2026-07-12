import axios from "axios";
import type { ImportResult } from "@/types/import";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function uploadCsvFile(file: File) {
  const formData = new FormData();
  formData.append("csvFile", file);

  const response = await axios.post<ImportResult>(`${API_URL}/api/import`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
