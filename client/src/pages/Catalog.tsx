import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Grid3x3, List, BookOpen, ChevronLeft, ChevronRight, Filter } from "lucide-react";

export default function Catalog() {
  const [, navigate] = useLocation();
  const [search] = useSearch();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "downloads" | "title" | "author">("newest");

  // Parse URL query params
  const params = useMemo(() => new URLSearchParams(search), [search]);

  // Initialize filters from URL params
  useState(() => {
    const genre = params.get("genre");
    const level = params.get("level");
    const source = params.get("source");
    if (genre) setSelectedGenre(genre);
    if (level) setSelectedLevel(level);
    if (source) setSelectedSource(source);
  });

  const pageSize = 20;
  const offset = currentPage * pageSize;

  // Fetch books with all filters
  const { data: books, isLoading: booksLoading } = trpc.books.list.useQuery({
    limit: pageSize,
    offset,
    genre: selectedGenre || undefined,
    language: selectedLanguage || undefined,
    educationalLevel: selectedLevel || undefined,
    source: selectedSource || undefined,
    sort: sortBy,
  });

  // Fetch genres
  const { data: genres } = trpc.genres.list.useQuery();

  // Calculate pagination
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

  const clearFilters = () => {
    setSelectedGenre("");
    setSelectedLanguage("");
    setSelectedLevel("");
    setSelectedSource("");
    setSortBy("newest");
    setCurrentPage(0);
  };

  const activeFilters = [selectedGenre, selectedLanguage, selectedLevel, selectedSource].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="text-2xl font-bold neon-glow hover:opacity-80 transition">LUMINA</button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-foreground hover:text-primary">Home</Button>
            <Button variant="ghost" onClick={() => navigate("/search")} className="text-foreground hover:text-primary">Search</Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">BOOK CATALOG</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">Browse our multi-source collection of free ebooks</p>
        </div>

        {/* Filters Panel */}
        <div className="card-neon p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              <h3 className="font-bold">Filters</h3>
              {activeFilters > 0 && (
                <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">{activeFilters} active</span>
              )}
            </div>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Genre Filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => { setSelectedGenre(e.target.value); setCurrentPage(0); }}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
              >
                <option value="">All Genres</option>
                {genres?.map((genre) => (
                  <option key={genre.id} value={genre.slug}>{genre.name}</option>
                ))}
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => { setSelectedLanguage(e.target.value); setCurrentPage(0); }}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
              >
                <option value="">All Languages</option>
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="es">Spanish</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ar">Arabic</option>
                <option value="sw">Swahili</option>
              </select>
            </div>

            {/* Educational Level Filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Education Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => { setSelectedLevel(e.target.value); setCurrentPage(0); }}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
              >
                <option value="">All Levels</option>
                <option value="primary">Primary School</option>
                <option value="middle_school">Middle School</option>
                <option value="high_school">High School</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="professional">Professional</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Source</label>
              <select
                value={selectedSource}
                onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(0); }}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
              >
                <option value="">All Sources</option>
                <option value="gutenberg">Project Gutenberg</option>
                <option value="doab">DOAB</option>
                <option value="open_textbook">Open Textbook</option>
                <option value="kicd">KICD</option>
                <option value="knec">KNEC</option>
                <option value="ajol">AJOL</option>
                <option value="unesco">UNESCO</option>
                <option value="worldbank">World Bank</option>
                <option value="google_books">Google Books</option>
              </select>
            </div>
          </div>

          {/* Sort and View */}
          <div className="flex flex-wrap gap-4 items-center mt-4 pt-4 border-t border-border">
            <div className="flex gap-2 border border-border rounded-lg p-1">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="gap-2">
                <Grid3x3 className="w-4 h-4" /> Grid
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="gap-2">
                <List className="w-4 h-4" /> List
              </Button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(0); }}
              className="bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="downloads">Most Downloaded</option>
              <option value="title">Title (A-Z)</option>
              <option value="author">Author (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Books Display */}
        {booksLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : books && books.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {books.map((book) => (
                  <div key={book.id} onClick={() => handleBookClick(book.id)} className="card-neon cursor-pointer group h-full flex flex-col">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt={book.title} className="w-full h-64 object-cover rounded mb-4 group-hover:opacity-80 transition" />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded mb-4 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition flex-1">{book.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{book.author || "Unknown Author"}</p>
                    <div className="flex gap-2 flex-wrap">
                      {book.language && <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded">{book.language.toUpperCase()}</span>}
                      {book.source && <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">{book.source}</span>}
                      {book.educationalLevel && <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded">{book.educationalLevel.replace("_", " ")}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 mb-12">
                {books.map((book) => (
                  <div key={book.id} onClick={() => handleBookClick(book.id)} className="card-neon cursor-pointer group flex gap-6 hover:bg-card transition p-4">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt={book.title} className="w-24 h-32 object-cover rounded group-hover:opacity-80 transition flex-shrink-0" />
                    ) : (
                      <div className="w-24 h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded flex items-center justify-center flex-shrink-0">
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
                        {book.downloadCount ? <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">{book.downloadCount} downloads</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <Button onClick={handlePreviousPage} disabled={currentPage === 0} className="btn-neon gap-2">
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <span className="text-muted-foreground">Page {currentPage + 1}</span>
              <Button onClick={handleNextPage} disabled={!hasMorePages} className="btn-neon gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-2">No books found matching your filters</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or clearing them</p>
            <Button onClick={clearFilters} className="btn-neon-outline mt-4">Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
