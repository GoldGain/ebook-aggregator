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
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-pink-600 text-primary-foreground rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-primary/40 hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-md"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {loading ? "Opening..." : "Download PDF"}
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
              className="absolute right-0 top-full mt-2 z-50 min-w-[240px] rounded-lg border border-border/60 bg-card shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-sm"
              onMouseLeave={() => setShowMirrors(false)}
            >
              <div className="px-4 py-3 text-[11px] font-bold text-muted-foreground tracking-widest uppercase border-b border-border/40 bg-muted/20">
                Download Mirrors
              </div>
              {mirrors.map((m, idx) => (
                <a
                  key={m.url}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 px-4 py-3 text-xs hover:bg-primary/15 hover:text-primary transition-all group ${
                    idx !== mirrors.length - 1 ? 'border-b border-border/20' : ''
                  }`}
                  onClick={() => setShowMirrors(false)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m.label}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}div>
          )}
        </div>
      )}

      {error && (
        <span className="text-[10px] text-destructive">{error}</span>
      )}
    </div>
  );
}
