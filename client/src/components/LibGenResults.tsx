import { useState, useEffect } from "react";
import { Loader2, Download, BookOpen } from "lucide-react";

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
  formats: {
    pdf?: string;
    epub?: string;
  };
}

interface LibGenResultsProps {
  query: string;
  onBookSelect?: (book: LibGenBook) => void;
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
          `/api/libgen?q=${encodeURIComponent(query)}&limit=10`
        );
        const data = await response.json();
        if (data.success) {
          setBooks(data.books);
        } else {
          setError(data.error || "Failed to fetch from LibGen");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchLibGen, 500);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!query || query.length < 2) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Searching LibGen...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-sm text-red-500">{error}</div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No books found on LibGen
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border pb-3">
        <BookOpen className="w-4 h-4" />
        <span>Found {books.length} books on LibGen</span>
      </div>
      {books.map((book, index) => (
        <div
          key={book.md5 || index}
          className="card-neon cursor-pointer group hover:border-primary/60 transition-all duration-200 flex gap-4 p-4"
          onClick={() => onBookSelect?.(book)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{book.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {book.author}
              {book.year ? ` · ${book.year}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={book.formats.pdf || book.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs hover:bg-primary/20 transition"
              onClick={(e) => {
                e.stopPropagation();
                onBookSelect?.(book);
              }}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </a>
            {book.formats.epub && (
              <a
                href={book.formats.epub}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-secondary/10 text-secondary rounded-md text-xs hover:bg-secondary/20 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">EPUB</span>
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
