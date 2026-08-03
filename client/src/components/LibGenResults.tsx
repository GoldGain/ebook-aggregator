import { useState } from "react";
import { Loader2, Download, BookOpen, ExternalLink, ChevronDown, Globe, FileText, Hash } from "lucide-react";
import { useEffect } from "react";

interface LibGenBook {
  title: string;
  author: string;
  year: string;
  publisher: string;
  language: string;
  pages: string;
  format: string;
  filesize: string;
  md5: string;
  source: string;
  sourceUrl: string;
  annaUrl?: string;
  mirrors?: string[];
  formats: {
    pdf?: string;
    epub?: string;
  };
}

interface LibGenResultsProps {
  query: string;
  onBookSelect?: (book: LibGenBook) => void;
}

const FORMAT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pdf:  { bg: "bg-pink-500/20",   text: "text-pink-400",   label: "PDF"  },
  epub: { bg: "bg-blue-500/20",   text: "text-blue-400",   label: "EPUB" },
  djvu: { bg: "bg-amber-500/20",  text: "text-amber-400",  label: "DJVU" },
  mobi: { bg: "bg-green-500/20",  text: "text-green-400",  label: "MOBI" },
  azw3: { bg: "bg-teal-500/20",   text: "text-teal-400",   label: "AZW3" },
  fb2:  { bg: "bg-purple-500/20", text: "text-purple-400", label: "FB2"  },
};

function FormatBadge({ format }: { format: string }) {
  const key = format.toLowerCase();
  const style = FORMAT_STYLES[key] ?? { bg: "bg-slate-500/20", text: "text-slate-400", label: format.toUpperCase() };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function MirrorsMenu({ book, onClose }: { book: LibGenBook; onClose: () => void }) {
  const mirrors = [
    book.annaUrl ? { label: "Anna's Archive", url: book.annaUrl } : null,
    { label: "LibGen.li",    url: `https://libgen.li/get.php?md5=${book.md5}` },
    { label: "LibGen.rs",    url: `https://libgen.rs/get.php?md5=${book.md5}` },
    { label: "Library.lol", url: `https://library.lol/main/${book.md5}` },
    { label: "LibGen.rocks", url: `https://libgen.rocks/get.php?md5=${book.md5}` },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <div
      className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-xl shadow-black/50 overflow-hidden"
      onMouseLeave={onClose}
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
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          {m.label}
        </a>
      ))}
    </div>
  );
}

function LibGenBookCard({ book, onBookSelect }: { book: LibGenBook; onBookSelect?: (b: LibGenBook) => void }) {
  const [showMirrors, setShowMirrors] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    setDlError("");

    try {
      const resp = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ md5: book.md5, format: book.format?.toLowerCase() || "pdf" }),
      });

      if (resp.ok) {
        // Check content-type BEFORE reading the body so we can route correctly
        const contentType = resp.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          // Server returned mirror links (datacenter IP blocked from direct download)
          const data = await resp.json();
          if (data.mirrors && data.mirrors.length > 0) {
            // Open the first mirror — Anna's Archive is always index 0
            window.open(data.mirrors[0].url, "_blank", "noopener,noreferrer");
            setDownloading(false);
            return;
          }
        } else if (!contentType.includes("text/html")) {
          // Server managed a direct download — stream it to the user
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${book.title}.${book.format?.toLowerCase() || "pdf"}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setDownloading(false);
          return;
        }
      }
    } catch {
      // Network error — fall through to mirror fallback
    }

    // Final fallback: open Anna's Archive (always reliable)
    const fallbackUrl = book.annaUrl || `https://annas-archive.org/md5/${book.md5}`;
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    setDownloading(false);
  };

  return (
    <div
      className="card-neon cursor-pointer group hover:border-primary/60 transition-all duration-200 p-4"
      onClick={() => onBookSelect?.(book)}
    >
      {/* Top row: icon + title + badges */}
      <div className="flex gap-3">
        <div className="w-10 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded shrink-0 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-muted-foreground/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition leading-snug">
            {book.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {book.author}
            {book.year ? <span className="ml-1.5 opacity-60">· {book.year}</span> : null}
            {book.publisher ? <span className="ml-1.5 opacity-60">· {book.publisher}</span> : null}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {book.format && <FormatBadge format={book.format} />}
        {book.filesize && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <FileText className="w-3 h-3" />{book.filesize}
          </span>
        )}
        {book.pages && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Hash className="w-3 h-3" />{book.pages}pp
          </span>
        )}
        {book.language && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Globe className="w-3 h-3" />{book.language}
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 transition disabled:opacity-60 shadow-lg shadow-primary/20"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {downloading ? "Opening..." : `Download ${book.format || "PDF"}`}
        </button>

        <div className="relative">
          <button
            onMouseEnter={() => setShowMirrors(true)}
            onClick={() => setShowMirrors((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary/10 text-secondary rounded-md text-xs font-medium hover:bg-secondary/20 transition border border-secondary/20"
          >
            Mirrors <ChevronDown className="w-3 h-3" />
          </button>
          {showMirrors && (
            <MirrorsMenu book={book} onClose={() => setShowMirrors(false)} />
          )}
        </div>

        {dlError && (
          <span className="text-[10px] text-destructive ml-1">{dlError}</span>
        )}
      </div>
    </div>
  );
}

export function LibGenResults({ query, onBookSelect }: LibGenResultsProps) {
  const [books, setBooks] = useState<LibGenBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setBooks([]);
      return;
    }
    const fetchLibGen = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/libgen?q=${encodeURIComponent(query)}&limit=20`
        );
        const data = await response.json();
        if (data.success) {
          setBooks(data.books);
        } else {
          setError(data.error || "Failed to fetch from LibGen");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    const timeout = setTimeout(fetchLibGen, 600);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!query || query.length < 2) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Searching LibGen (20M+ books)...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-4 text-sm text-destructive">{error}</div>;
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No books found on LibGen for &ldquo;{query}&rdquo;
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-primary" />
          <span><strong className="text-foreground">{books.length}</strong> books from LibGen&apos;s 20M+ library</span>
        </span>
        <span className="text-[10px] opacity-60">Use Mirrors if Download fails</span>
      </div>
      {books.map((book, index) => (
        <LibGenBookCard key={book.md5 || index} book={book} onBookSelect={onBookSelect} />
      ))}
    </div>
  );
}
