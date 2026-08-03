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
    book.annaUrl ? { label: "Anna's Archive", url: book.annaUrl, desc: "Most reliable" } : null,
    { label: "LibGen.li",    url: `https://libgen.li/ads.php?md5=${book.md5}`, desc: "Fast" },
    { label: "LibGen.rs",    url: `https://libgen.rs/ads.php?md5=${book.md5}`, desc: "Alternative" },
    { label: "LibGen.rocks", url: `https://libgen.rocks/ads.php?md5=${book.md5}`, desc: "Backup" },
  ].filter(Boolean) as { label: string; url: string; desc: string }[];

  return (
    <div
      className="absolute right-0 top-full mt-2 z-50 min-w-[240px] rounded-lg border border-border/60 bg-card shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-sm"
      onMouseLeave={onClose}
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
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
            <div className="min-w-0">
              <p className="font-medium truncate">{m.label}</p>
              <p className="text-[10px] text-muted-foreground/70">{m.desc}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function cleanTitle(book: LibGenBook) {
  if (book.title && !book.title.includes('DOI:') && !book.title.includes('ISBN:')) {
    return book.title;
  }
  if (book.author) {
    return `${book.author} - ${book.year || 'Book'}`;
  }
  return 'Book';
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
      // Try server-side direct download first (streams the PDF if it works)
      const resp = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ md5: book.md5, format: book.format?.toLowerCase() || "pdf" }),
      });

      if (resp.ok) {
        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.includes("application/json") && !contentType.includes("text/html")) {
          // Server streamed a real binary PDF — save it
          const blob = await resp.blob();
          if (blob.size > 10000) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${cleanTitle(book)}.${book.format?.toLowerCase() || "pdf"}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDownloading(false);
            return;
          }
        }
      }
    } catch {
      // Server blocked — fall through to direct mirror
    }

    // Direct open on Anna's Archive (always reliable, user downloads from there)
    const annaUrl = book.annaUrl || `https://annas-archive.li/md5/${book.md5}`;
    window.open(annaUrl, "_blank", "noopener,noreferrer");
    setDownloading(false);
  };

  return (
    <div
      className="card-neon cursor-pointer group hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 p-4 hover:-translate-y-0.5"
      onClick={() => onBookSelect?.(book)}
    >
      {/* Top row: icon + title + badges */}
      <div className="flex gap-3">
        <div className="w-12 h-14 bg-gradient-to-br from-primary/30 to-secondary/20 rounded-lg shrink-0 flex items-center justify-center shadow-md">
          <BookOpen className="w-6 h-6 text-primary/80" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold line-clamp-2 group-hover:text-primary transition leading-snug text-foreground">
            {cleanTitle(book)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            <span className="font-medium">{book.author || "Unknown Author"}</span>
            {book.year ? <span className="ml-1.5 opacity-70">({book.year})</span> : null}
          </p>
          {book.publisher && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-1">
              {book.publisher}
            </p>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {book.format && <FormatBadge format={book.format} />}
        {book.filesize && (
          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 px-2 py-0.5 bg-muted/20 rounded-full">
            <FileText className="w-3 h-3" />
            <span className="font-medium">{book.filesize}</span>
          </span>
        )}
        {book.pages && (
          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 px-2 py-0.5 bg-muted/20 rounded-full">
            <Hash className="w-3 h-3" />
            <span className="font-medium">{book.pages} pages</span>
          </span>
        )}
        {book.language && (
          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 px-2 py-0.5 bg-muted/20 rounded-full">
            <Globe className="w-3 h-3" />
            <span className="font-medium">{book.language}</span>
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-pink-600 text-primary-foreground rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-primary/40 hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-md"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Opening...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </>
          )}
        </button>

        <div className="relative">
          <button
            onMouseEnter={() => setShowMirrors(true)}
            onClick={() => setShowMirrors((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary/15 text-secondary rounded-lg text-xs font-semibold hover:bg-secondary/25 transition border border-secondary/30 hover:border-secondary/50"
          >
            <span>Mirrors</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMirrors ? 'rotate-180' : ''}`} />
          </button>
          {showMirrors && (
            <MirrorsMenu book={book} onClose={() => setShowMirrors(false)} />
          )}
        </div>

        {dlError && (
          <span className="text-[10px] text-destructive font-medium ml-auto">{dlError}</span>
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
          setBooks(data.books.filter((b: LibGenBook) => b.format?.toLowerCase() === 'pdf'));
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
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/50 pb-4">
        <span className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span><strong className="text-foreground text-sm">{books.length}</strong> <span className="text-muted-foreground">PDF results from LibGen</span></span>
        </span>
        <span className="text-[10px] opacity-60 bg-muted/30 px-2 py-1 rounded-full">PDF only</span>
      </div>
      <div className="space-y-3">
        {books.map((book, index) => (
          <LibGenBookCard key={book.md5 || index} book={book} onBookSelect={onBookSelect} />
        ))}
      </div>
    </div>
  );
}
