import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface DownloadButtonProps {
  md5?: string | null;
  title: string;
  format?: string;
  url?: string | null;
  query?: string;
  directDownloadAllowed?: boolean;
  sourceUrl?: string | null;
  onSuccess?: () => void;
  author?: string | null;
  bookId?: number | null;
  rightsStatus?: string | null;
  language?: string | null;
}

function safeFilename(title: string, format: string) {
  const name = title.replace(/[^a-z0-9]+/gi, " ").trim().slice(0, 80) || "document";
  return `${name}.${format.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf"}`;
}

async function saveDownload(response: Response, filename: string) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    let msg = "Download unavailable";
    try { const d = await response.json(); msg = d?.message || d?.error || msg; } catch {}
    throw new Error(msg);
  }
  if (contentType.includes("application/json") || contentType.includes("text/html") || contentType.includes("text/plain")) {
    let msg = "Download unavailable";
    try { const d = await response.json(); msg = d?.message || d?.error || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await response.blob();
  if (blob.size < 1000 && !response.headers.get("content-disposition")) {
    throw new Error("The source did not return a complete document");
  }
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

async function requestDownload(
  candidate: { md5?: string | null; title: string; author?: string | null; bookId?: number | null; format: string; language?: string | null },
  onSuccess?: () => void,
) {
  const filename = safeFilename(candidate.title, candidate.format);

  // Build request body
  const body: Record<string, unknown> = { format: candidate.format, title: candidate.title };
  if (candidate.md5 && /^[a-f0-9]{32}$/i.test(candidate.md5)) body.md5 = candidate.md5;
  if (candidate.author) body.author = candidate.author;
  if (candidate.bookId) body.bookId = candidate.bookId;
  if (candidate.language) body.language = candidate.language;

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/pdf,application/octet-stream,*/*" },
      body: JSON.stringify(body),
    });
    await saveDownload(response, filename);
    onSuccess?.();
  } catch (e) {
    throw e;
  }
}

export function DownloadButton({ md5, title, format = "pdf", author, bookId, rightsStatus, language, onSuccess }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const handleDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (loading) return;
    setLoading(true);
    setError("");
    setStatus("Downloading...");
    try {
      await requestDownload({ md5, title, author, bookId, format, language }, onSuccess);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Book not available right now.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  // Always show "Download PDF" — never "Search & Download"
  const label = loading ? (status || "Downloading...") : error ? "Try Again" : "Download PDF";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-pink-600 px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition hover:scale-105 hover:shadow-lg hover:shadow-primary/40 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span>{label}</span>
      </button>
      {error && <span className="min-w-0 truncate text-[10px] font-medium text-destructive" role="alert">{error}</span>}
    </div>
  );
}
