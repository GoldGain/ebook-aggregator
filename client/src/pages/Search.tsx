import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, BookOpen, Search as SearchIcon, X, SlidersHorizontal,
  ChevronLeft, ChevronRight, ArrowRight
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DownloadButton } from "@/components/DownloadButton";

const SOURCES = [
  { key: "", label: "All Sources" },
  { key: "gutenberg", label: "Project Gutenberg" },
  { key: "doab", label: "DOAB" },
  { key: "open_textbook", label: "Open Textbook Library" },
  { key: "internet_archive", label: "Internet Archive" },
  { key: "open_library", label: "Open Library" },
  { key: "openstax", label: "OpenStax" },
  { key: "libretexts", label: "LibreTexts" },
  { key: "wikibooks", label: "Wikibooks" },
  { key: "wikisource", label: "Wikisource" },
  { key: "doaj", label: "DOAJ" },
  { key: "pubmed", label: "PubMed Central" },
  { key: "saylor", label: "Saylor Academy" },
  { key: "oer_commons", label: "OER Commons" },
  { key: "mit_ocw", label: "MIT OpenCourseWare" },
  { key: "ck12", label: "CK-12" },
  { key: "openlearn", label: "OpenLearn" },
  { key: "kicd", label: "KICD" },
  { key: "knec", label: "KNEC" },
  { key: "ajol", label: "AJOL" },
  { key: "easy_elimu", label: "Easy Elimu" },
  { key: "atika_school", label: "Atika School" },
  { key: "kenyaplex", label: "KenyaPlex" },
  { key: "schools_net", label: "Schools Net Kenya" },
  { key: "cbc_resources", label: "CBC Resources" },
  { key: "teachers_updates", label: "Teachers Updates" },
];

const LEVELS = [
  { key: "", label: "All Levels" },
  { key: "primary", label: "Primary" },
  { key: "middle_school", label: "Middle School" },
  { key: "high_school", label: "High School" },
  { key: "college", label: "College" },
  { key: "university", label: "University" },
  { key: "professional", label: "Professional" },
  { key: "general", label: "General" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "downloads", label: "Most Downloaded" },
  { key: "title", label: "Title A–Z" },
  { key: "author", label: "Author A–Z" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "sw", label: "Swahili" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
];

const POPULAR_SEARCHES = ["mathematics", "biology", "history", "physics", "economics", "literature", "computer science"];

function BookCard({ book, query, onClick }: { book: any; query: string; onClick?: () => void }) {
  const formats = typeof book.formats === "string"
    ? (() => { try { return JSON.parse(book.formats); } catch { return {}; } })()
    : (book.formats || {});
  const downloadUrl = book.downloadUrl || formats.pdf || book.sourceUrl || "";

  return (
    <div
      onClick={onClick}
      className={`card-neon group flex gap-4 p-4 transition-all duration-200 hover:border-primary/60 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex min-w-0 flex-1 gap-4">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-20 w-16 shrink-0 rounded object-cover transition group-hover:opacity-90"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded bg-gradient-to-br from-primary/20 to-secondary/20">
            <BookOpen className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3
            className={`mb-1 line-clamp-2 text-sm font-bold leading-snug transition ${onClick ? 'cursor-pointer group-hover:text-primary' : ''}`}
          >
            {book.title || "Untitled document"}
          </h3>
          <p className="mb-1 line-clamp-1 text-xs text-muted-foreground">{book.author || "Unknown Author"}</p>
          {(book.year || book.publishedDate || book.publisher) && (
            <p className="mb-2 line-clamp-1 text-[11px] text-muted-foreground/70">
              {book.year || book.publishedDate || ""}{book.publisher ? ` · ${book.publisher}` : ""}
            </p>
          )}
          {book.description && (
            <p className="mb-2 line-clamp-2 text-[11px] text-muted-foreground/70">{book.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1">
            <span className="rounded border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">PDF</span>
            {book.language && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">{String(book.language).toUpperCase()}</span>}
            {book.educationalLevel && <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] text-secondary">{String(book.educationalLevel).replace("_", " ")}</span>}
            {book.downloadCount > 0 && <span className="rounded bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">{book.downloadCount} ↓</span>}
          </div>
        </div>
      </div>
        <div className="flex shrink-0 items-end" onClick={(event) => event.stopPropagation()}>
        <DownloadButton
          md5={book.md5}
          title={book.title || "document"}
          format="pdf"
          url={downloadUrl}
          query={query}
          author={book.author || null}
          bookId={typeof book.id === "number" ? book.id : null}
          language={book.language || null}
        />
      </div>
    </div>
  );
}

export default function Search() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedSort, setSelectedSort] = useState<"newest" | "downloads" | "title" | "author">("newest");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const params = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const queryFromUrl = params.get("q") || "";

  const [searchInput, setSearchInput] = useState(queryFromUrl);
  const [query, setQuery] = useState(queryFromUrl);
  const debouncedQuery = useDebounce(searchInput, 350);

  useEffect(() => {
    if (debouncedQuery !== query) {
      setQuery(debouncedQuery);
      setCurrentPage(0);
      if (debouncedQuery) {
        window.history.replaceState({}, "", `?q=${encodeURIComponent(debouncedQuery)}`);
      }
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (queryFromUrl && queryFromUrl !== searchInput) {
      setSearchInput(queryFromUrl);
      setQuery(queryFromUrl);
    }
  }, [queryFromUrl]);

  const pageSize = 20;
  const genres = trpc.genres.list.useQuery();
  const [results, setResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const hasSearch = query.trim().length >= 2;
    const hasFilters = !!(selectedSource || selectedLevel || selectedLanguage || selectedGenre);
    if (!hasSearch && !hasFilters) {
      setResults([]);
      setTotalResults(0);
      setSearchError("");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchError("");
      try {
        const searchParams = new URLSearchParams();
        if (hasSearch) searchParams.set("q", query.trim());
        searchParams.set("limit", String(pageSize));
        searchParams.set("offset", String(currentPage * pageSize));
        if (selectedSource) searchParams.set("source", selectedSource);
        if (selectedLevel) searchParams.set("level", selectedLevel);
        if (selectedLanguage) searchParams.set("language", selectedLanguage);
        if (selectedGenre) searchParams.set("genre", selectedGenre);
        if (selectedSort !== "newest") searchParams.set("sort", selectedSort);

        const response = await fetch(`/api/search?${searchParams.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search is temporarily unavailable");
        const data = await response.json();
        if (active) {
          setResults(Array.isArray(data.books) ? data.books : []);
          if (typeof data.total === "number" && data.total >= 0) setTotalResults(data.total);
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setResults([]);
          setSearchError(error instanceof Error ? error.message : "Search is temporarily unavailable");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }, hasSearch ? 200 : 0);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, currentPage, selectedSource, selectedLevel, selectedLanguage, selectedGenre, selectedSort]);

  const totalResultsText = useMemo(() => {
    if (totalResults > 0) {
      const extra = results.length + currentPage * pageSize - totalResults;
      return totalResults.toLocaleString() + (extra > 0 ? " +" : "") + " results";
    }
    return "";
  }, [totalResults, results.length, currentPage]);

  const { data: suggestions } = trpc.books.autocomplete.useQuery(
    { query: searchInput, limit: 6 },
    { enabled: searchInput.length >= 2 && showSuggestions }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchInput.trim()) {
      setCurrentPage(0);
      setQuery(searchInput);
      window.history.pushState({}, "", `?q=${encodeURIComponent(searchInput)}`);
    }
  };

  const clearFilters = () => {
    setSelectedSource("");
    setSelectedLevel("");
    setSelectedLanguage("");
    setSelectedGenre("");
    setSelectedSort("newest");
    setCurrentPage(0);
  };

  const hasFilters = !!(selectedSource || selectedLevel || selectedLanguage || selectedGenre || selectedSort !== "newest");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center gap-4 h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 flex-shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="font-black text-lg neon-glow hidden sm:inline">ZAMIFU</span>
          </button>
          <form onSubmit={handleSearch} className="flex-1 relative">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search books, authors, subjects..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-9 pr-9 bg-card border-border focus:border-primary h-10 text-sm"
                autoFocus
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); setQuery(""); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => {
                      setSearchInput(s.title);
                      setQuery(s.title);
                      navigate(`/book/${s.id}`);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/10 transition text-left"
                  >
                    {s.coverUrl ? (
                      <img src={s.coverUrl} alt="" className="w-8 h-10 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-10 bg-primary/10 rounded flex-shrink-0 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary/50" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.author}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            )}
          </form>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 flex-shrink-0 ${hasFilters ? "border-primary text-primary" : ""}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
          </Button>
        </div>
      </header>

      <div className="container py-6">
        <div className="flex gap-6">
          {/* ─── Filters Sidebar ─── */}
          <aside className={`${showFilters ? "block" : "hidden"} lg:block lg:w-52 w-full flex-shrink-0`}>
            <div className="card-neon p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Filters</h3>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-primary transition">
                    Clear all
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort By</p>
                <div className="space-y-0.5">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSelectedSort(opt.key as any); setCurrentPage(0); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition ${
                        selectedSort === opt.key
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Source</p>
                <select
                  value={selectedSource}
                  onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(0); }}
                  className="w-full bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {SOURCES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Level */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Level</p>
                <div className="space-y-0.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => { setSelectedLevel(l.key); setCurrentPage(0); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition ${
                        selectedLevel === l.key
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Language</p>
                <div className="space-y-0.5">
                  <button
                    onClick={() => { setSelectedLanguage(""); setCurrentPage(0); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition ${
                      !selectedLanguage ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    All Languages
                  </button>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setSelectedLanguage(lang.code); setCurrentPage(0); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition ${
                        selectedLanguage === lang.code
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre */}
              {genres.data && genres.data.length > 0 && (
                <div className="mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p>
                  <select
                    value={selectedGenre}
                    onChange={(e) => { setSelectedGenre(e.target.value); setCurrentPage(0); }}
                    className="w-full bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">All Genres</option>
                    {genres.data.map((g) => (
                      <option key={g.id} value={g.slug}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </aside>

          {/* ─── Results ─── */}
          <main className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                {query ? (
                  <h2 className="text-base font-bold">
                    Results for <span className="text-primary">"{query}"</span>
                  </h2>
                ) : (
                  <h2 className="text-base font-bold text-muted-foreground">Search the library</h2>
                )}
                {results && query && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalResultsText || (results.length === pageSize ? `${pageSize}+ results` : `${results.length} result${results.length !== 1 ? "s" : ""}`)}
                    {currentPage > 0 && ` · Page ${currentPage + 1}`}
                  </p>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSource && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs">
                    {SOURCES.find(s => s.key === selectedSource)?.label}
                    <button onClick={() => setSelectedSource("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedLevel && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent rounded-full text-xs">
                    {LEVELS.find(l => l.key === selectedLevel)?.label}
                    <button onClick={() => setSelectedLevel("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedLanguage && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-secondary/10 text-secondary rounded-full text-xs">
                    {LANGUAGES.find(l => l.code === selectedLanguage)?.label}
                    <button onClick={() => setSelectedLanguage("")}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedSort !== "newest" && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-muted/30 text-muted-foreground rounded-full text-xs">
                    {SORT_OPTIONS.find(s => s.key === selectedSort)?.label}
                    <button onClick={() => setSelectedSort("newest")}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !searchError && !query && !selectedSource && !selectedLevel && !selectedLanguage && !selectedGenre && (
              <div className="text-center py-20">
                <SearchIcon className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-bold mb-2">Search ZAMIFU E-MATERIALS</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                  Search thousands of public-domain, open-access, and educational titles from Project Gutenberg, Open Library, the Internet Archive, OpenStax, KICD, and more.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {POPULAR_SEARCHES.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => { setSearchInput(tag); setQuery(tag); }}
                      className="px-3 py-1.5 bg-card border border-border rounded-full text-xs hover:border-primary hover:text-primary transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && searchError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive" role="alert">
                {searchError}
              </div>
            )}

            {!isLoading && !searchError && results.length === 0 && (query.length >= 2 || hasFilters) && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <SearchIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-base font-medium text-foreground">No results found</p>
                <p className="mt-1">Try another title, author, subject, or filter.</p>
                {hasFilters && <button onClick={clearFilters} className="mt-3 underline hover:text-primary transition">Clear filters</button>}
              </div>
            )}

            {/* Results list */}
            {!isLoading && results && results.length > 0 && (
              <>
                <div className="space-y-2.5">
                  {results.map((book, index) => (
                    <BookCard
                      key={`${book.md5 || book.id || book.title || "result"}-${index}`}
                      book={book}
                      query={query}
                      onClick={typeof book.id === "number" ? () => navigate(`/book/${book.id}`) : undefined}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {currentPage + 1}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={!results || results.length < pageSize}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
