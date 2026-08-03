import { useState } from "react";
import { Download, Loader2, ExternalLink, ChevronDown } from "lucide-react";

interface Mirror {
  label: string;
  url: string;
}

interface DownloadButtonProps {
  md5: string;
  title: string;
  format?: string;
}

export function DownloadButton({ md5, title, format = "pdf" }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mirrors, setMirrors] = useState<Mirror[]>([]);
  const [showMirrors, setShowMirrors] = useState(false);

  const handleDownload = async () => {
    if (!md5) {
      setError("No download link available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ md5, format }),
      });

      if (!response.ok) {
        throw new Error("Download request failed");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // Server returned mirror links
        const data = await response.json();
        if (data.success && data.mirrors && data.mirrors.length > 0) {
          setMirrors(data.mirrors);
          // Open the first mirror automatically (Anna's Archive)
          window.open(data.mirrors[0].url, "_blank", "noopener,noreferrer");
          setShowMirrors(true);
        } else {
          throw new Error("No download links available");
        }
      } else if (!contentType.includes("text/html")) {
        // Direct file download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Unexpected response from download server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
      // Fallback to Anna's Archive directly
      window.open(`https://annas-archive.org/md5/${md5}`, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 relative">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 transition disabled:opacity-60 shadow-lg shadow-primary/20"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {loading ? "Opening..." : `Download ${format.toUpperCase()}`}
      </button>

      {mirrors.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowMirrors((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary/10 text-secondary rounded-md text-xs font-medium hover:bg-secondary/20 transition border border-secondary/20"
          >
            Mirrors <ChevronDown className="w-3 h-3" />
          </button>
          {showMirrors && (
            <div
              className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-xl overflow-hidden"
              onMouseLeave={() => setShowMirrors(false)}
            >
              <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground tracking-widest uppercase border-b border-border">
                Download Mirrors
              </div>
              {mirrors.map((m) => (
                <a
                  key={m.url}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => setShowMirrors(false)}
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {m.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <span className="text-[10px] text-destructive">{error}</span>
      )}
    </div>
  );
}
