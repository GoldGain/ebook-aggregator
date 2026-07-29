import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { Loader2, Search, BookOpen, ChevronRight, TrendingUp } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const recentBooks = trpc.books.recent.useQuery({ limit: 12 });
  const popularBooks = trpc.books.popular.useQuery({ limit: 12 });
  const genres = trpc.genres.list.useQuery();
  const bookCount = trpc.books.count.useQuery();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const EDUCATIONAL_LEVELS = [
    { key: "primary", label: "Primary", icon: "🏫" },
    { key: "middle_school", label: "Middle School", icon: "📚" },
    { key: "high_school", label: "High School", icon: "🎓" },
    { key: "college", label: "College", icon: "🏛️" },
    { key: "university", label: "University", icon: "🔬" },
    { key: "professional", label: "Professional", icon: "💼" },
    { key: "general", label: "General", icon: "📖" },
  ];

  const SOURCES = [
    { key: "gutenberg", label: "Project Gutenberg", count: "70,000+", icon: "📕" },
    { key: "doab", label: "DOAB", count: "60,000+", icon: "📗" },
    { key: "open_textbook", label: "Open Textbook", count: "1,500+", icon: "📘" },
    { key: "kicd", label: "KICD", count: "500+", icon: "📙" },
    { key: "knec", label: "KNEC", count: "300+", icon: "📓" },
  ];

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
            <Button variant="ghost" onClick={() => navigate("/catalog")} className="text-foreground hover:text-primary">Catalog</Button>
            <Button variant="ghost" onClick={() => navigate("/search")} className="text-foreground hover:text-primary">Search</Button>
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate("/bookshelf")} className="text-foreground hover:text-primary">Bookshelf</Button>
                <Button variant="ghost" onClick={() => navigate("/recommendations")} className="text-foreground hover:text-primary">Recommendations</Button>
                <Button variant="ghost" onClick={() => navigate("/downloads")} className="text-foreground hover:text-primary">Downloads</Button>
                {user.role === "admin" && (
                  <Button variant="ghost" onClick={() => navigate("/admin")} className="text-foreground hover:text-primary">Admin</Button>
                )}
                <Button variant="ghost" onClick={() => navigate("/")} className="text-foreground hover:text-primary">{user.name || "Account"}</Button>
              </>
            ) : (
              <Button onClick={() => startLogin()} className="btn-neon">Sign In</Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent via-primary to-accent opacity-40" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-primary opacity-40" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-medium">
                Multi-Source Ebook Aggregator
              </span>
            </div>
            <h2 className="text-5xl md:text-7xl font-bold mb-6 neon-glow">
              YOUR DIGITAL LIBRARY
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              Access thousands of free ebooks from Project Gutenberg, DOAB, Open Textbook Library,
              KICD, KNEC, and more — all in one place.
            </p>
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative flex gap-2">
                <Input type="text" placeholder="Search by title, author, or subject..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-card border-accent/50 focus:border-primary text-foreground placeholder:text-muted-foreground" />
                <Button type="submit" className="btn-neon gap-2">
                  <Search className="w-5 h-5" />
                  Search
                </Button>
              </div>
            </form>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              <div className="card-neon text-center py-3">
                <p className="text-2xl font-bold text-primary">{bookCount.data?.toLocaleString() || "0"}</p>
                <p className="text-xs text-muted-foreground">Books</p>
              </div>
              <div className="card-neon text-center py-3">
                <p className="text-2xl font-bold text-accent">5+</p>
                <p className="text-xs text-muted-foreground">Sources</p>
              </div>
              <div className="card-neon text-center py-3">
                <p className="text-2xl font-bold gradient-text">13</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
              <div className="card-neon text-center py-3">
                <p className="text-2xl font-bold text-secondary">Free</p>
                <p className="text-xs text-muted-foreground">Forever</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sources Section */}
      <section className="py-12 border-t border-border">
        <div className="container">
          <div className="flex items-center gap-4 mb-8">
            <div className="accent-line-left">
              <h3 className="text-3xl font-bold">OUR SOURCES</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {SOURCES.map((source) => (
              <button key={source.key} onClick={() => navigate(`/catalog?source=${source.key}`)} className="card-neon text-center py-4 hover:border-primary transition group">
                <span className="text-3xl mb-2 block">{source.icon}</span>
                <p className="font-semibold text-sm group-hover:text-primary transition">{source.label}</p>
                <p className="text-xs text-muted-foreground">{source.count}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Educational Levels */}
      <section className="py-12">
        <div className="container">
          <div className="flex items-center gap-4 mb-8">
            <div className="accent-line-left">
              <h3 className="text-3xl font-bold">BY EDUCATION LEVEL</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {EDUCATIONAL_LEVELS.map((level) => (
              <button key={level.key} onClick={() => navigate(`/catalog?level=${level.key}`)} className="card-neon text-center py-4 hover:border-primary transition group">
                <span className="text-2xl mb-1 block">{level.icon}</span>
                <p className="text-xs font-medium group-hover:text-primary transition">{level.label}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Books */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="flex items-center gap-4 mb-12">
            <div className="accent-line-left">
              <h3 className="text-3xl font-bold">RECENTLY ADDED</h3>
            </div>
          </div>
          {recentBooks.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentBooks.data?.map((book) => (
                <div key={book.id} onClick={() => navigate(`/book/${book.id}`)} className="card-neon cursor-pointer group">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-64 object-cover rounded mb-4 group-hover:opacity-80 transition" />
                  ) : (
                    <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded mb-4 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <h4 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition">{book.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{book.author || "Unknown Author"}</p>
                  <div className="flex gap-2 text-xs">
                    {book.language && <span className="px-2 py-1 bg-accent/10 text-accent rounded">{book.language.toUpperCase()}</span>}
                    {book.source && <span className="px-2 py-1 bg-primary/10 text-primary rounded">{book.source}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <Button onClick={() => navigate("/catalog")} className="btn-neon-outline gap-2">
              View All Books <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Popular Books */}
      <section className="py-20 border-t border-border bg-card/30">
        <div className="container">
          <div className="flex items-center gap-4 mb-12">
            <div className="accent-line-left">
              <h3 className="text-3xl font-bold">MOST POPULAR</h3>
            </div>
            <TrendingUp className="w-6 h-6 text-accent" />
          </div>
          {popularBooks.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {popularBooks.data?.map((book) => (
                <div key={book.id} onClick={() => navigate(`/book/${book.id}`)} className="card-neon cursor-pointer group">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-64 object-cover rounded mb-4 group-hover:opacity-80 transition" />
                  ) : (
                    <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded mb-4 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <h4 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition">{book.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{book.author || "Unknown Author"}</p>
                  <div className="flex gap-2 text-xs">
                    {book.language && <span className="px-2 py-1 bg-accent/10 text-accent rounded">{book.language.toUpperCase()}</span>}
                    {book.downloadCount && <span className="px-2 py-1 bg-primary/10 text-primary rounded">{book.downloadCount} downloads</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="flex items-center gap-4 mb-12">
            <div className="accent-line-left">
              <h3 className="text-3xl font-bold">EXPLORE BY GENRE</h3>
            </div>
          </div>
          {genres.data && genres.data.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {genres.data.map((genre) => (
                <button key={genre.id} onClick={() => navigate(`/catalog?genre=${genre.slug}`)} className="p-4 card-neon text-center hover:bg-primary/20 transition group">
                  <p className="font-bold text-lg group-hover:text-primary transition">{genre.name}</p>
                  {genre.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{genre.description}</p>}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No genres available yet.</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card/50">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h5 className="font-bold text-primary mb-4">LUMINA BOOKS</h5>
              <p className="text-sm text-muted-foreground">A cinematic multi-source ebook aggregator platform.</p>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4">EXPLORE</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/catalog")} className="hover:text-primary transition">Catalog</button></li>
                <li><button onClick={() => navigate("/search")} className="hover:text-primary transition">Search</button></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4">ACCOUNT</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {user ? (
                  <>
                    <li><button onClick={() => navigate("/bookshelf")} className="hover:text-primary transition">My Bookshelf</button></li>
                    <li><button onClick={() => navigate("/recommendations")} className="hover:text-primary transition">Recommendations</button></li>
                    <li><button onClick={() => navigate("/downloads")} className="hover:text-primary transition">Downloads</button></li>
                  </>
                ) : (
                  <li><button onClick={() => startLogin()} className="hover:text-primary transition">Sign In</button></li>
                )}
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4">ABOUT</h5>
              <p className="text-sm text-muted-foreground">Aggregating knowledge from Gutenberg, DOAB, Open Textbook, KICD, KNEC & more.</p>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Lumina Books. Free open-access ebooks for everyone.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
