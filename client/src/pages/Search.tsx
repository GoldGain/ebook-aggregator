import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Search as SearchIcon, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";

export default function Search() {
  const [, navigate] = useLocation();
  const [search] = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  // Parse query from URL
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const queryFromUrl = params.get("q") || "";

  const [query, setQuery] = useState(queryFromUrl);
  const [searchInput, setSearchInput] = useState(queryFromUrl);

  // Debounced search input
  const debouncedQuery = useDebounce(searchInput, 400);

  useEffect(() => {
    setSearchQuery(debouncedQuery);
  }, [debouncedQuery]);

  // Initialize from URL
  useEffect(() => {
    if (queryFromUrl) {
      setSearchInput(queryFromUrl);
      setQuery(queryFromUrl);
    }
  }, [queryFromUrl]);

  const pageSize = 20;

  // Fetch search results
  const { data: results, isLoading } = trpc.books.search.useQuery(
    {
      query: query || "",
      limit: pageSize,
      offset: currentPage * pageSize,
      source: selectedSource || undefined,
      educationalLevel: selectedLevel || undefined,
    },
    { enabled: !!query }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCurrentPage(0);
      setQuery(searchInput);
      window.history.pushState({}, "", `?q=${encodeURIComponent(searchInput)}`);
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setQuery("");
    setCurrentPage(0);
    setSelectedSource("");
    setSelectedLevel("");
    window.history.pushState({}, "", "/search");
  };

  const handleBookClick = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

  const hasMorePages = results && results.length === pageSize;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="text-2xl font-bold neon-glow hover:opacity-80 transition">LUMINA</button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/catalog")} className="text-foreground hover:text-primary">Catalog</Button>
            <Button variant="ghost" onClick={() => navigate("/bookshelf")} className="text-foreground hover:text-primary">Bookshelf</Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Search Form */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setCurrentPage(0); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e); }}
                  placeholder="Search by title, author, subject, or ISBN..."
                  className="w-full pl-10 pr-10 py-3 bg-card border border-accent/50 rounded-lg text-foreground focus:border-primary outline-none text-lg"
                />
                {searchInput && (
                  <button type="button" onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Button type="submit" className="btn-neon gap-2 px-6">
                <SearchIcon className="w-5 h-5" />
                Search
              </Button>
            </div>
          </form>

          {/* Filters */}
          {query && (
            <div className="flex gap-3 max-w-2xl mx-auto mb-4">
              <select value={selectedSource} onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(0); }} className="px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground focus:border-primary outline-none">
                <option value="">All Sources</option>
                <option value="gutenberg">Project Gutenberg</option>
                <option value="doab">DOAB</option>
                <option value="open_textbook">Open Textbook</option>
                <option value="kicd">KICD</option>
                <option value="knec">KNEC</option>
                <option value="ajol">AJOL</option>
              </select>
              <select value={selectedLevel} onChange={(e) => { setSelectedLevel(e.target.value); setCurrentPage(0); }} className="px-3 py-1.5 bg-background border border-border rounded text-sm text-foreground focus:border-primary outline-none">
                <option value="">All Levels</option>
                <option value="primary">Primary</option>
                <option value="middle_school">Middle School</option>
                <option value="high_school">High School</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="general">General</option>
              </select>
            </div>
          )}

          {query ? (
            <div className="text-center">
              <p className="text-muted-foreground">
                {isLoading ? "Searching..." : `Found ${results?.length || 0} book${results?.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          ) : null}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : results && results.length > 0 ? (
          <>
            <div className="space-y-4 mb-12">
              {results.map((book) => (
                <div key={book.id} onClick={() => handleBookClick(book.id)} className="card-neon cursor-pointer group flex gap-6 hover:bg-card transition p-4">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-20 h-28 object-cover rounded group-hover:opacity-80 transition flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-28 bg-gradient-to-br from-primary/20 to-secondary/20 rounded flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition">{book.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{book.author || "Unknown Author"}</p>
                    {book.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{book.description}</p>}
                    <div className="flex gap-2 flex-wrap">
                      {book.language && <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded">{book.language.toUpperCase()}</span>}
                      {book.source && <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">{book.source}</span>}
                      {book.educationalLevel && <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded">{book.educationalLevel.replace("_", " ")}</span>}
                      {book.downloadCount ? <span className="text-xs px-2 py-1 bg-muted/10 text-muted-foreground rounded">{book.downloadCount} downloads</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {hasMorePages && (
              <div className="flex items-center justify-between">
                <Button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="btn-neon">Previous</Button>
                <span className="text-muted-foreground">Page {currentPage + 1}</span>
                <Button onClick={() => setCurrentPage(currentPage + 1)} className="btn-neon">Next</Button>
              </div>
            )}
          </>
        ) : query ? (
          <div className="card-neon text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6">No books found matching "{query}"</p>
            <Button onClick={() => navigate("/catalog")} className="btn-neon">Browse Catalog</Button>
          </div>
        ) : (
          <div className="card-neon text-center py-12">
            <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-bold mb-4">Search the Library</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Search across all sources including Project Gutenberg, DOAB, Open Textbook Library, KICD, and more.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["fiction", "mathematics", "science", "history", "education"].map((tag) => (
                <button key={tag} onClick={() => { setSearchInput(tag); setQuery(tag); }} className="px-4 py-2 bg-background border border-border rounded-full text-sm hover:border-primary hover:text-primary transition">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
