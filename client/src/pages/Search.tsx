import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, Search as SearchIcon } from "lucide-react";
import { useState, useEffect } from "react";

export default function Search() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [query, setQuery] = useState("");

  // Extract query from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    setQuery(q);
    setSearchQuery(q);
  }, []);
  const pageSize = 20;

  // Fetch search results
  const { data: results, isLoading } = trpc.books.search.useQuery(
    { query: query || "", limit: pageSize, offset: currentPage * pageSize },
    { enabled: !!query }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentPage(0);
      setQuery(searchQuery);
      window.history.pushState({}, "", `?q=${encodeURIComponent(searchQuery)}`);
    }
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
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold neon-glow hover:opacity-80 transition"
          >
            LUMINA
          </button>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/catalog")}
              className="text-foreground hover:text-primary"
            >
              Catalog
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Search Form */}
        <div className="mb-12">
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, or subject..."
                className="flex-1 bg-card border-accent/50 focus:border-primary text-foreground"
              />
              <Button type="submit" className="btn-neon gap-2">
                <SearchIcon className="w-5 h-5" />
                Search
              </Button>
            </div>
          </form>

          {query ? (
            <div>
              <h1 className="text-3xl font-bold neon-glow mb-2">
                Search Results for "{query}"
              </h1>
              <p className="text-muted-foreground">
                {isLoading ? "Searching..." : `Found ${results?.length || 0} books`}
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
          <div className="space-y-4 mb-12">
            {results.map((book) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book.id)}
                className="card-neon cursor-pointer group flex gap-6 hover:bg-card transition"
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-24 h-32 object-cover rounded group-hover:opacity-80 transition flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {book.author || "Unknown Author"}
                  </p>
                  {book.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {book.description}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {book.language && (
                      <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded">
                        {book.language.toUpperCase()}
                      </span>
                    )}
                    {book.downloadCount && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        {book.downloadCount} downloads
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : query ? (
          <div className="card-neon text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6">No books found matching your search</p>
            <Button onClick={() => navigate("/catalog")} className="btn-neon">
              Browse Catalog
            </Button>
          </div>
        ) : (
          <div className="card-neon text-center py-12">
            <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6">Enter a search query to get started</p>
          </div>
        )}

        {/* Pagination */}
        {results && results.length > 0 && (
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="btn-neon"
            >
              Previous
            </Button>
            <span className="text-muted-foreground">Page {currentPage + 1}</span>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!hasMorePages}
              className="btn-neon"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
