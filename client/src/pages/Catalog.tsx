import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2, Grid3x3, List, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

export default function Catalog() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "downloads" | "title">("newest");

  const pageSize = 20;
  const offset = currentPage * pageSize;

  // Fetch books
  const { data: books, isLoading: booksLoading } = trpc.books.list.useQuery({
    limit: pageSize,
    offset,
  });

  // Fetch genres
  const { data: genres } = trpc.genres.list.useQuery();

  // Calculate total pages (estimate based on first page having fewer items)
  const hasMorePages = books && books.length === pageSize;

  const handlePreviousPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (hasMorePages) setCurrentPage(currentPage + 1);
  };

  const handleBookClick = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

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
              onClick={() => navigate("/")}
              className="text-foreground hover:text-primary"
            >
              Home
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">BOOK CATALOG</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            Browse our collection of classic books from Project Gutenberg
          </p>
        </div>

        {/* Controls */}
        <div className="mb-8 space-y-4">
          {/* View Mode and Sort */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2 border border-border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="gap-2"
              >
                <Grid3x3 className="w-4 h-4" />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-2"
              >
                <List className="w-4 h-4" />
                List
              </Button>
            </div>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <option value="newest">Newest First</option>
              <option value="downloads">Most Downloaded</option>
              <option value="title">Title (A-Z)</option>
            </Select>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <option value="">All Genres</option>
              {genres?.map((genre) => (
                <option key={genre.id} value={genre.slug}>
                  {genre.name}
                </option>
              ))}
            </Select>

            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <option value="">All Languages</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
            </Select>
          </div>
        </div>

        {/* Books Display */}
        {booksLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {books?.map((book) => (
              <div
                key={book.id}
                onClick={() => handleBookClick(book.id)}
                className="card-neon cursor-pointer group h-full flex flex-col"
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-64 object-cover rounded mb-4 group-hover:opacity-80 transition"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded mb-4 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition flex-1">
                  {book.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                  {book.author || "Unknown Author"}
                </p>
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
            ))}
          </div>
        ) : (
          <div className="space-y-4 mb-12">
            {books?.map((book) => (
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
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
            className="btn-neon gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {currentPage + 1}
          </span>
          <Button
            onClick={handleNextPage}
            disabled={!hasMorePages}
            className="btn-neon gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
