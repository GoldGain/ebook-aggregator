import { useState, useEffect } from "react";
import { Loader2, Download, FileText, GraduationCap, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KicdBook {
  id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  subjects: string[];
  downloadUrl: string;
  coverUrl: string;
  publishedDate: string;
  educationalLevel: string;
  sourceUrl: string;
}

interface KICDResultsProps {
  query: string;
}

export function KICDResults({ query }: KICDResultsProps) {
  const [books, setBooks] = useState<KicdBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<"all" | "sw">("all");

  useEffect(() => {
    if (!query || query.length < 2) {
      setBooks([]);
      return;
    }

    const fetchKICD = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/kicd?q=${encodeURIComponent(query)}&limit=50`
        );
        const data = await response.json();
        if (data.success) {
          const filtered = data.books.filter((b: KicdBook) =>
            selectedLang === "all" ||
            b.language === "sw" ||
            b.title.toLowerCase().includes("kiswahili") ||
            b.title.toLowerCase().includes("swahili")
          );
          setBooks(selectedLang === "all" ? data.books : filtered);
        } else {
          setError(data.error || "Failed to fetch KICD/KNEC materials");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchKICD, 500);
    return () => clearTimeout(timeout);
  }, [query, selectedLang]);

  if (!query || query.length < 2) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Searching KICD &amp; KNEC...
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
        No KICD/KNEC materials found for this search
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="w-4 h-4" />
          <span>Found {books.length} KICD/KNEC materials</span>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={selectedLang === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLang("all")}
            className="h-7 text-xs px-2.5"
          >
            All
          </Button>
          <Button
            variant={selectedLang === "sw" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLang("sw")}
            className="h-7 text-xs px-2.5"
          >
            <Languages className="w-3 h-3 mr-1" />
            Kiswahili
          </Button>
        </div>
      </div>
      {books.map((book, index) => (
        <div
          key={book.id || index}
          className="card-neon hover:border-primary/60 transition-all duration-200 flex gap-4 p-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{book.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {book.author}
              {book.educationalLevel ? ` · ${book.educationalLevel}` : ""}
            </p>
            {book.subjects && book.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {book.subjects.slice(0, 3).map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {book.downloadUrl ? (
              <a
                href={book.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs hover:bg-primary/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => window.open(book.sourceUrl, "_blank")}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                View
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
