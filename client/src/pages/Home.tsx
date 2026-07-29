import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { Loader2, Search, BookOpen, Zap } from "lucide-react";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  // Fetch featured books
  const { data: books, isLoading: booksLoading } = trpc.books.list.useQuery({
    limit: 12,
    offset: 0,
  });

  // Fetch genres
  const { data: genres } = trpc.genres.list.useQuery();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleBrowseCatalog = () => {
    navigate("/catalog");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold neon-glow">LUMINA</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBrowseCatalog}
              className="text-foreground hover:text-primary"
            >
              Catalog
            </Button>
            {user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/bookshelf")}
                  className="text-foreground hover:text-primary"
                >
                  My Bookshelf
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/downloads")}
                  className="text-foreground hover:text-primary"
                >
                  Downloads
                </Button>
                {user.role === "admin" && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/import")}
                      className="text-foreground hover:text-primary"
                    >
                      Import
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/admin")}
                      className="text-foreground hover:text-primary"
                    >
                      Admin
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate("/bookshelf")}
                  className="text-foreground"
                >
                  {user.name || "Account"}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => startLogin()}
                className="btn-neon"
              >
                Sign In
              </Button>
            )}
            {user && (
              <Button
                variant="ghost"
                onClick={async () => {
                  // Logout logic would go here
                  navigate("/");
                }}
                className="text-foreground hover:text-primary"
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        
        {/* Vertical accent lines */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent via-primary to-accent opacity-40" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-primary opacity-40" />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-bold mb-6 neon-glow">
              DISCOVER TIMELESS CLASSICS
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              Explore thousands of free ebooks from Project Gutenberg. Build your personal library, track your reading history, and dive into literature's greatest works.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative flex gap-2">
                <Input
                  type="text"
                  placeholder="Search by title, author, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-card border-accent/50 focus:border-primary text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  className="btn-neon gap-2"
                >
                  <Search className="w-5 h-5" />
                  Search
                </Button>
              </div>
            </form>

            {/* CTA Buttons */}
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={handleBrowseCatalog}
                className="btn-neon gap-2 px-8 py-3 text-lg"
              >
                <Zap className="w-5 h-5" />
                Browse Catalog
              </Button>
              <Button
                onClick={() => navigate("/import")}
                className="btn-neon-outline gap-2 px-8 py-3 text-lg"
              >
                Import Book
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Books Section */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="flex items-center gap-4 mb-12">
            <div className="accent-line-left">
              <h3 className="text-3xl font-bold neon-glow">FEATURED COLLECTION</h3>
            </div>
          </div>

          {booksLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books?.map((book) => (
                <div
                  key={book.id}
                  onClick={() => navigate(`/book/${book.id}`)}
                  className="card-neon cursor-pointer group"
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
                  <h4 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition">
                    {book.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                    {book.author || "Unknown Author"}
                  </p>
                  <div className="flex gap-2 text-xs text-accent">
                    {book.language && <span className="px-2 py-1 bg-accent/10 rounded">
                      {book.language.toUpperCase()}
                    </span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Genres Section */}
      <section className="py-20 border-t border-border bg-card/30">
        <div className="container">
          <div className="flex items-center gap-4 mb-12">
            <div className="accent-line-left">
              <h3 className="text-3xl font-bold neon-glow">EXPLORE BY GENRE</h3>
            </div>
          </div>

          {genres && genres.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => navigate(`/catalog?genre=${genre.slug}`)}
                  className="p-4 card-neon text-center hover:bg-primary/20 transition group"
                >
                  <p className="font-bold text-lg group-hover:text-primary transition">
                    {genre.name}
                  </p>
                  {genre.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {genre.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No genres available yet.</p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-neon accent-line-left">
              <div className="text-4xl mb-4">📚</div>
              <h4 className="text-xl font-bold mb-3 text-primary">Vast Library</h4>
              <p className="text-muted-foreground">
                Access thousands of free classic books from Project Gutenberg, all available in multiple formats.
              </p>
            </div>
            <div className="card-neon accent-line-left">
              <div className="text-4xl mb-4">🔍</div>
              <h4 className="text-xl font-bold mb-3 text-primary">Smart Search</h4>
              <p className="text-muted-foreground">
                Find books instantly by title, author, or subject. Advanced filtering by genre and language.
              </p>
            </div>
            <div className="card-neon accent-line-left">
              <div className="text-4xl mb-4">⭐</div>
              <h4 className="text-xl font-bold mb-3 text-primary">Personal Bookshelf</h4>
              <p className="text-muted-foreground">
                Save your favorite books, track your reading history, and organize your digital library.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card/50">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h5 className="font-bold text-primary mb-4">LUMINA BOOKS</h5>
              <p className="text-sm text-muted-foreground">
                A cinematic ebook platform powered by Project Gutenberg.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4">EXPLORE</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={handleBrowseCatalog} className="hover:text-primary transition">Catalog</button></li>
                <li><button onClick={() => navigate("/search")} className="hover:text-primary transition">Search</button></li>
                <li><button onClick={() => navigate("/import")} className="hover:text-primary transition">Import</button></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4">ACCOUNT</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {user ? (
                  <>
                    <li><button onClick={() => navigate("/bookshelf")} className="hover:text-primary transition">My Bookshelf</button></li>
                    <li><button onClick={() => navigate("/downloads")} className="hover:text-primary transition">Downloads</button></li>
                  </>
                ) : (
                  <li><button onClick={() => startLogin()} className="hover:text-primary transition">Sign In</button></li>
                )}
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4">ABOUT</h5>
              <p className="text-sm text-muted-foreground">
                Built with <span className="text-primary">❤</span> for book lovers everywhere.
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 Lumina Books. All books are in the public domain via Project Gutenberg.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
