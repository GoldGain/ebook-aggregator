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
}

interface SearchCandidate {
  md5?: string;
  downloadUrl?: string;
  sourceUrl?: string;
  formats?: { pdf?: string };
  title?: string;
}

function safeFilename(title: string, format: string) {
  const name = title
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .slice(0, 80) || "document";
  const extension = format.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
  return `${name}.${extension}`;
}

async function saveDownload(response: Response, filename: string) {
  const contentType = response.headers.get("content-type") || "";
  const contentDisposition = response.headers.get("content-disposition") || "";

  if (!response.ok) {
    let message = "Download unavailable";
    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch {
      // Keep the concise fallback message for non-JSON errors.
    }
    throw new Error(message);
  }

  if (contentType.includes("application/json") || contentType.includes("text/html") || contentType.includes("text/plain")) {
    let message = "Download unavailable";
    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch {
      // The proxy may return a non-JSON error page; do not expose it in the UI.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  if (blob.size < 1000 && !contentDisposition) {
    throw new Error("The source did not return a complete document");
  }

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

async function requestDownload(
  candidate: { md5?: string | null; url?: string | null; format: string; title: string; author?: string | null },
  onSuccess?: () => void,
) {
  const filename = safeFilename(candidate.title, candidate.format);

  // Try with the MD5, passing title and author for server-side verification and fallback
  const tryMd5 = async (md5?: string | null) => {
    if (!md5 || !/^[a-f0-9]{32}$/i.test(md5)) return false;
    try {
      const body: Record<string, string> = { md5, format: candidate.format, title: candidate.title };
      if (candidate.author) body.author = candidate.author;

      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/pdf,application/octet-stream,*/*" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await saveDownload(response, filename);
        return true;
      }

      // Check if server found an alternative MD5 (title mismatch)
      if (response.status === 404) {
        try {
          const data = await response.json();
          if (data?.error === 'Title mismatch') {
            console.log(`[download] Server reported title mismatch for MD5 ${md5}`);
          }
        } catch {}
      }

      return false;
    } catch {
      return false;
    }
  };

  // Try the URL directly if available
  const tryUrl = async (url?: string | null) => {
    if (!url || !/^https?:\/\//i.test(url)) return false;
    try {
      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`, {
        headers: { Accept: "application/pdf,application/octet-stream,*/*" },
      });
      await saveDownload(response, filename);
      return true;
    } catch {
      return false;
    }
  };

  // Extract MD5 from URL if present
  const urlMd5 = candidate.url?.match(/(?:md5=|\/md5\/)([a-f0-9]{32})/i)?.[1] || null;

  // Try primary MD5
  if (await tryMd5(candidate.md5)) { onSuccess?.(); return; }
  // Try URL-extracted MD5
  if (urlMd5 && urlMd5 !== candidate.md5 && await tryMd5(urlMd5)) { onSuccess?.(); return; }
  // Try URL
  if (await tryUrl(candidate.url)) { onSuccess?.(); return; }

  throw new Error("This book is not available for download right now. Please try again later or search for a different edition.");
}

export function DownloadButton({ md5, title, format = "pdf", url, query, author, onSuccess }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (loading) return;

    setLoading(true);
    setError("");
    try {
      await requestDownload({ md5, url, format, title, author }, onSuccess);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Book not available right now. Try another source.");
    } finally {
      setLoading(false);
    }
  };

  const label = loading ? "Downloading..." : error ? "Try Again" : "Download PDF";

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
