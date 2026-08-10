import { useState } from "react";
import { Loader2, Download, BookOpen, ExternalLink, ChevronDown, Globe, FileText, Hash, X, Calendar, User, Building2, BookMarked } from "lucide-react";
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
  let title = book.title || '';
  title = title.replace(/^\d+[\.\)\s]+/, '');
  title = title.replace(/DOI:\s*\S+/gi, '');
  title = title.replace(/ISBN[\s:-]*[\d\-Xx]+/gi, '');
  title = title.replace(/\([^)]*(?:Springer|Elsevier|Wiley|Routledge|Palgrave|Oxford|Cambridge)[^)]*\)/gi, '');
  title = title.replace(/\[[^\]]*(?:Springer|Elsevier|Wiley|Routledge)[^\]]*\]/gi, '');
  title = title.replace(/\s+/g, ' ').trim();
  if (title.length > 0) {
    if (/^DOI:\s/i.test(title) || /^10\.\d{4}\//i.test(title)) {
      return book.author ? `${book.author} - Article` : 'Article';
    }
    if (title.length < 3 || /^[\d\s\.\-:;,]+$/.test(title)) {
      if (book.author) return `${book.author} - ${book.year || 'Book'}`;
      return 'Book';
    }
    return title;
  }
  if (book.author) return `${book.author} - ${book.year || 'Book'}`;
  return 'Book';
}

// ── Book Details Modal ──────────────────────────────────────────────────────
function BookDetailsModal({ book, onClose }: { book: LibGenBook; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");
  const [showMirrors, setShowMirrors] = useState(false);

  // Derive cover URL from Open Library ISBN or Google Books
  const coverUrl = book.md5
    ? `https://annas-archive.li/md5/${book.md5}`
    : null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    setDlError("");
    try {
      const resp = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          md5: book.md5,
          format: book.format?.toLowerCase() || "pdf",
          title: book.title,
          author: book.author,
          language: book.language,
        }),
      });
      if (resp.ok) {
        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.includes("application/json") && !contentType.includes("text/html")) {
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
      const data = await resp.json().catch(() => ({}));
      setDlError(data?.message || "Download unavailable. Try a mirror below.");
    } catch {
      setDlError("Server download unavailable. Try a mirror below.");
    }
    setDownloading(false);
  };

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Header: cover + basic info */}
          <div className="flex gap-5 mb-6">
            {/* Book cover placeholder */}
            <div className="w-24 h-32 shrink-0 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center shadow-lg border border-border/50">
              <BookOpen className="w-10 h-10 text-primary/70" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold leading-snug mb-2 text-foreground">{cleanTitle(book)}</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {book.format && <FormatBadge format={book.format} />}
                {book.language && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent">
                    <Globe className="w-3 h-3" />
                    {book.language.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {book.author && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium text-foreground">{book.author}</span>
                  </div>
                )}
                {book.publisher && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{book.publisher}</span>
                  </div>
                )}
                {book.year && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{book.year}</span>
                  </div>
                )}
                {book.pages && (
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span>{book.pages} pages</span>
                  </div>
                )}
                {book.filesize && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>{book.filesize}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MD5 identifier */}
          {book.md5 && (
            <div className="mb-5 p-3 rounded-lg bg-muted/20 border border-border/40">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <BookMarked className="w-3 h-3" />
                Book Identifier (MD5)
              </p>
              <p className="text-xs font-mono text-foreground/80 break-all">{book.md5}</p>
            </div>
          )}

          {/* Download section */}
          <div className="border-t border-border/50 pt-5">
            <h3 className="text-sm font-bold mb-3 text-foreground">Download</h3>
            <div className="flex flex-wrap items-center gap-3">
              {/* Primary download button */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-pink-600 text-primary-foreground rounded-lg text-sm font-bold hover:shadow-lg hover:shadow-primary/40 hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-md"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              {/* Mirrors dropdown */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowMirrors(true)}
                  onClick={() => setShowMirrors((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-secondary/15 text-secondary rounded-lg text-sm font-semibold hover:bg-secondary/25 transition border border-secondary/30 hover:border-secondary/50"
                >
                  <span>Mirrors</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMirrors ? 'rotate-180' : ''}`} />
                </button>
                {showMirrors && (
                  <MirrorsMenu book={book} onClose={() => setShowMirrors(false)} />
                )}
              </div>

              {/* Direct Anna's Archive link */}
              {book.annaUrl && (
                <a
                  href={book.annaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-muted/20 text-muted-foreground rounded-lg text-sm hover:text-primary hover:bg-muted/40 transition border border-border/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Anna's Archive</span>
                </a>
              )}
            </div>

            {dlError && (
              <p className="mt-3 text-xs text-destructive font-medium">{dlError}</p>
            )}

            <p className="mt-3 text-[11px] text-muted-foreground/70">
              The server will attempt to download via Anna's Archive, Internet Archive, and LibGen. If the server download fails, use a mirror link above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Book Card ───────────────────────────────────────────────────────────────
function LibGenBookCard({ book, onBookSelect }: { book: LibGenBook; onBookSelect?: (b: LibGenBook) => void }) {
  const [showMirrors, setShowMirrors] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    setDlError("");

    try {
      const resp = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          md5: book.md5,
          format: book.format?.toLowerCase() || "pdf",
          title: book.title,
          author: book.author,
          language: book.language,
        }),
      });

      if (resp.ok) {
        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.includes("application/json") && !contentType.includes("text/html")) {
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
      setDlError("Server download unavailable. Click Mirrors ↗ to try a direct source.");
    } catch {
      setDlError("Server download unavailable. Click Mirrors ↗ to try a direct source.");
    }

    setDownloading(false);
  };

  const handleCardClick = () => {
    if (onBookSelect) {
      onBookSelect(book);
    } else {
      setShowDetails(true);
    }
  };

  return (
    <>
      {showDetails && (
        <BookDetailsModal book={book} onClose={() => setShowDetails(false)} />
      )}
      <div
        className="card-neon cursor-pointer group hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 p-4 hover:-translate-y-0.5"
        onClick={handleCardClick}
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
          <span className="text-[10px] text-primary/60 ml-auto opacity-0 group-hover:opacity-100 transition">
            Click for details →
          </span>
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
                <span>Downloading...</span>
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
    </>
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
        <span className="text-[10px] opacity-60 bg-muted/30 px-2 py-1 rounded-full">Click any book for details</span>
      </div>
      <div className="space-y-3">
        {books.map((book, index) => (
          <LibGenBookCard key={book.md5 || index} book={book} onBookSelect={onBookSelect} />
        ))}
      </div>
    </div>
  );
}
