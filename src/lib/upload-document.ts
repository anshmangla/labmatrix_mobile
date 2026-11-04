import { api } from "@/lib/api";
import type { DocumentPickerAsset } from "expo-document-picker";

export interface UploadedDocument {
  url: string;
  name: string;
  size?: number;
}

export async function uploadDocument(asset: DocumentPickerAsset): Promise<string> {
  const filename = asset.name || "document.pdf";
  const formData = new FormData();

  formData.append("file", {
    uri: asset.uri,
    name: filename,
    type: asset.mimeType || "application/pdf",
  } as any);

  const res = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000, // 30s timeout for document uploads
  });

  return res.data.url;
}
