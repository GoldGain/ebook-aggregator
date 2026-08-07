import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AuthModal } from "@/components/AuthModal";
import {
  Loader2, Search, BookOpen, ChevronRight, TrendingUp, Star,
  Globe, GraduationCap, Users, Download, Zap, Shield, Library,
  BookMarked, ChevronLeft, ArrowRight
} from "lucide-react";

const SOURCE_CATEGORIES = [
  {
    category: "Global Open Access",
    sources: [
      { key: "gutenberg", label: "Project Gutenberg", count: "70,000+", color: "from-blue-500/20 to-blue-600/10", icon: "📕" },
      { key: "doab", label: "DOAB", count: "60,000+", color: "from-green-500/20 to-green-600/10", icon: "📗" },
      { key: "open_textbook", label: "Open Textbook Library", count: "1,500+", color: "from-purple-500/20 to-purple-600/10", icon: "📘" },
      { key: "internet_archive", label: "Internet Archive", count: "20M+", color: "from-yellow-500/20 to-yellow-600/10", icon: "🏛️" },
      { key: "open_library", label: "Open Library", count: "3M+", color: "from-red-500/20 to-red-600/10", icon: "📚" },
      { key: "openstax", label: "OpenStax", count: "50+", color: "from-cyan-500/20 to-cyan-600/10", icon: "🔬" },
    ],
  },
  {
    category: "Academic & Research",
    sources: [
      { key: "doaj", label: "DOAJ", count: "7M+", color: "from-indigo-500/20 to-indigo-600/10", icon: "📄" },
      { key: "pubmed", label: "PubMed Central", count: "9M+", color: "from-teal-500/20 to-teal-600/10", icon: "🧬" },
      { key: "mit_ocw", label: "MIT OpenCourseWare", count: "2,500+", color: "from-orange-500/20 to-orange-600/10", icon: "🎓" },
      { key: "saylor", label: "Saylor Academy", count: "300+", color: "from-pink-500/20 to-pink-600/10", icon: "🏫" },
      { key: "oer_commons", label: "OER Commons", count: "50,000+", color: "from-violet-500/20 to-violet-600/10", icon: "🌐" },
      { key: "libretexts", label: "LibreTexts", count: "400+", color: "from-emerald-500/20 to-emerald-600/10", icon: "📓" },
    ],
  },
  {
    category: "Kenyan Education",
    sources: [
      { key: "kicd", label: "KICD", count: "500+", color: "from-red-600/20 to-red-700/10", icon: "🇰🇪" },
      { key: "knec", label: "KNEC", count: "300+", color: "from-green-600/20 to-green-700/10", icon: "📝" },
      { key: "ajol", label: "AJOL", count: "500K+", color: "from-yellow-600/20 to-yellow-700/10", icon: "🌍" },
      { key: "easy_elimu", label: "Easy Elimu", count: "1,000+", color: "from-blue-600/20 to-blue-700/10", icon: "✏️" },
      { key: "atika_school", label: "Atika School", count: "800+", color: "from-purple-600/20 to-purple-700/10", icon: "🏫" },
      { key: "cbc_resources", label: "CBC Resources", count: "600+", color: "from-cyan-600/20 to-cyan-700/10", icon: "📋" },
    ],
  },
];

const EDUCATIONAL_LEVELS = [
  { key: "primary", label: "Primary", icon: "🏫", desc: "Grades 1–6" },
  { key: "middle_school", label: "Middle School", icon: "📚", desc: "Grades 7–9" },
  { key: "high_school", label: "High School", icon: "🎓", desc: "Grades 10–12" },
  { key: "college", label: "College", icon: "🏛️", desc: "Diploma & Cert" },
  { key: "university", label: "University", icon: "🔬", desc: "Degree & Above" },
  { key: "professional", label: "Professional", icon: "💼", desc: "CPD & Skills" },
  { key: "general", label: "General", icon: "📖", desc: "All Ages" },
];

const FEATURES = [
  { icon: <Globe className="w-6 h-6" />, title: "50+ Sources", desc: "Aggregated from the world's best open-access repositories" },
  { icon: <Zap className="w-6 h-6" />, title: "Instant Search", desc: "Full-text search powered by PostgreSQL tsvector" },
  { icon: <GraduationCap className="w-6 h-6" />, title: "All Levels", desc: "Primary to PhD — CBC, KCSE, and beyond" },
  { icon: <Download className="w-6 h-6" />, title: "Free Downloads", desc: "PDF, EPUB, TXT — no subscription required" },
  { icon: <Shield className="w-6 h-6" />, title: "Open Access", desc: "Only legally free and open-licensed content" },
  { icon: <BookMarked className="w-6 h-6" />, title: "Personal Library", desc: "Save books, track reading, get recommendations" },
];

const TESTIMONIALS = [
  { name: "Amina K.", role: "University Student", text: "ZAMIFU E-MATERIALS saved me hundreds of dollars on textbooks. I found everything I needed for my engineering degree.", avatar: "AK" },
  { name: "Mr. Odhiambo", role: "Secondary School Teacher", text: "The KICD and KNEC resources are exactly what my students need. This platform is a game-changer for Kenyan education.", avatar: "MO" },
  { name: "Dr. Njeri W.", role: "Researcher", text: "Having DOAJ, PubMed, and AJOL all in one place has transformed my research workflow.", avatar: "NW" },
];

function BookCard({ book, onClick }: { book: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="card-neon cursor-pointer group hover:border-primary/60 transition-all duration-300 hover:-translate-y-1"
    >
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={book.title}
          className="w-full h-56 object-cover rounded mb-3 group-hover:opacity-90 transition"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-full h-56 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 rounded mb-3 flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/50" />
        </div>
      )}
      <h4 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary transition leading-snug">{book.title}</h4>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{book.author || "Unknown Author"}</p>
      <div className="flex flex-wrap gap-1 text-xs">
        {book.language && (
          <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[10px]">
            {book.language.toUpperCase()}
          </span>
        )}
        {/* Source hidden */}
        {book.downloadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded text-[10px]">
            {book.downloadCount} ↓
          </span>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const recentBooks = trpc.books.recent.useQuery({ limit: 8 });
  const popularBooks = trpc.books.popular.useQuery({ limit: 8 });
  const genres = trpc.genres.list.useQuery();
  const bookCount = trpc.books.count.useQuery();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navigation ─── */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" />
            <span className="text-xl font-black tracking-widest neon-glow">ZAMIFU</span>
          </button>
          <div className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="text-muted-foreground hover:text-primary">Catalog</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/search")} className="text-muted-foreground hover:text-primary">Search</Button>
            {user && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/bookshelf")} className="text-muted-foreground hover:text-primary">Bookshelf</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/recommendations")} className="text-muted-foreground hover:text-primary">For You</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/downloads")} className="text-muted-foreground hover:text-primary">Downloads</Button>
                {user.role === "admin" && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-muted-foreground hover:text-primary">Admin</Button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => navigate("/bookshelf")} className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{user.name?.split(" ")[0] || "Account"}</span>
              </Button>
            ) : (
              <Button onClick={() => setAuthOpen(true)} className="btn-neon text-sm px-4 py-2">Sign In</Button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/8 pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-accent/40 to-transparent" />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 text-accent rounded-full text-sm font-medium">
              <Zap className="w-3.5 h-3.5" />
              50+ Open-Access Sources · Updated Daily
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 neon-glow leading-none tracking-tight">
              YOUR FREE<br />DIGITAL LIBRARY
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Access millions of free ebooks from Project Gutenberg, DOAB, Internet Archive, KICD, KNEC, OpenStax,
              and 44 more world-class sources — all in one beautifully designed platform.
            </p>
            <form onSubmit={handleSearch} className="mb-10 max-w-2xl mx-auto">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by title, author, subject, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-card border-border focus:border-primary text-foreground placeholder:text-muted-foreground h-12"
                  />
                </div>
                <Button type="submit" className="btn-neon h-12 px-6 gap-2 text-sm font-semibold">
                  <Search className="w-4 h-4" />
                  Search
                </Button>
              </div>
            </form>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
              <div className="card-neon text-center py-3 px-2">
                <p className="text-2xl font-black text-primary">{bookCount.data ? (bookCount.data > 999 ? `${(bookCount.data / 1000).toFixed(0)}K+` : bookCount.data) : "—"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Books</p>
              </div>
              <div className="card-neon text-center py-3 px-2">
                <p className="text-2xl font-black text-accent">50+</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Sources</p>
              </div>
              <div className="card-neon text-center py-3 px-2">
                <p className="text-2xl font-black gradient-text">7</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Levels</p>
              </div>
              <div className="card-neon text-center py-3 px-2">
                <p className="text-2xl font-black text-secondary">Free</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Always</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Strip ─── */}
      <section className="py-10 border-y border-border bg-card/20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2 p-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {f.icon}
                </div>
                <p className="text-sm font-bold">{f.title}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Sources by Category ─── */}
      <section className="py-16 border-b border-border">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="accent-line-left">
              <h2 className="text-3xl font-black">COLLECTIONS & CURRICULUM</h2>
              <p className="text-sm text-muted-foreground mt-1">Curated libraries, past papers, and curriculum guides</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="gap-1 text-muted-foreground hover:text-primary">
              Browse All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {/* Category tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {SOURCE_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategoryIdx(i)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeCategoryIdx === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {SOURCE_CATEGORIES[activeCategoryIdx].sources.map((source) => (
              <button
                key={source.key}
                onClick={() => navigate(`/catalog?source=${source.key}`)}
                className={`card-neon text-center py-5 px-3 hover:border-primary/60 transition-all group bg-gradient-to-br ${source.color}`}
              >
                <span className="text-2xl mb-2 block">{source.icon}</span>
                <p className="font-semibold text-xs group-hover:text-primary transition leading-tight">{source.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{source.count}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Educational Levels ─── */}
      <section className="py-16 border-b border-border bg-card/10">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="accent-line-left">
              <h2 className="text-3xl font-black">BY EDUCATION LEVEL</h2>
              <p className="text-sm text-muted-foreground mt-1">From primary school to PhD research</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {EDUCATIONAL_LEVELS.map((level) => (
              <button
                key={level.key}
                onClick={() => navigate(`/catalog?level=${level.key}`)}
                className="card-neon text-center py-5 hover:border-primary/60 transition-all group"
              >
                <span className="text-2xl mb-2 block">{level.icon}</span>
                <p className="text-xs font-bold group-hover:text-primary transition">{level.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{level.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Recently Added ─── */}
      <section className="py-16 border-b border-border">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="accent-line-left">
              <h2 className="text-3xl font-black">RECENTLY ADDED</h2>
              <p className="text-sm text-muted-foreground mt-1">Fresh content from all sources</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/catalog?sort=newest")} className="gap-1 text-muted-foreground hover:text-primary">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {recentBooks.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5">
              {recentBooks.data?.map((book) => (
                <BookCard key={book.id} book={book} onClick={() => navigate(`/book/${book.id}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Most Popular ─── */}
      <section className="py-16 border-b border-border bg-card/20">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="accent-line-left">
                <h2 className="text-3xl font-black">MOST POPULAR</h2>
                <p className="text-sm text-muted-foreground mt-1">Top downloads across all sources</p>
              </div>
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/catalog?sort=downloads")} className="gap-1 text-muted-foreground hover:text-primary">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {popularBooks.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5">
              {popularBooks.data?.map((book) => (
                <BookCard key={book.id} book={book} onClick={() => navigate(`/book/${book.id}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Genres ─── */}
      <section className="py-16 border-b border-border">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div className="accent-line-left">
              <h2 className="text-3xl font-black">EXPLORE BY GENRE</h2>
              <p className="text-sm text-muted-foreground mt-1">20 categories to discover</p>
            </div>
          </div>
          {genres.data && genres.data.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {genres.data.slice(0, 20).map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => navigate(`/catalog?genre=${genre.slug}`)}
                  className="p-4 card-neon text-left hover:bg-primary/10 hover:border-primary/50 transition-all group"
                >
                  <p className="font-bold text-sm group-hover:text-primary transition">{genre.name}</p>
                  {genre.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{genre.description}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Library className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Genres loading...</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-16 border-b border-border bg-card/20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="accent-line-left inline-block">
              <h2 className="text-3xl font-black">WHAT USERS SAY</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-neon p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      {!user && (
        <section className="py-20 border-b border-border">
          <div className="container">
            <div className="card-neon p-10 text-center bg-gradient-to-br from-primary/10 via-transparent to-accent/10 max-w-3xl mx-auto">
              <h2 className="text-4xl font-black mb-4 neon-glow">START READING TODAY</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Create a free account to save books, track your reading progress, and get personalised recommendations.
              </p>
              <Button onClick={() => setAuthOpen(true)} className="btn-neon px-8 py-3 text-base gap-2">
                <BookOpen className="w-5 h-5" />
                Get Started — It's Free
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-12 bg-card/50">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <h5 className="font-black text-primary tracking-widest">ZAMIFU E-MATERIALS</h5>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A world-class multi-source ebook aggregator. Free knowledge for everyone, everywhere.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4 text-sm uppercase tracking-wider">Explore</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/catalog")} className="hover:text-primary transition">Catalog</button></li>
                <li><button onClick={() => navigate("/search")} className="hover:text-primary transition">Search</button></li>
                <li><button onClick={() => navigate("/catalog?sort=newest")} className="hover:text-primary transition">New Arrivals</button></li>
                <li><button onClick={() => navigate("/catalog?sort=downloads")} className="hover:text-primary transition">Most Popular</button></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4 text-sm uppercase tracking-wider">Account</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {user ? (
                  <>
                    <li><button onClick={() => navigate("/bookshelf")} className="hover:text-primary transition">My Bookshelf</button></li>
                    <li><button onClick={() => navigate("/recommendations")} className="hover:text-primary transition">Recommendations</button></li>
                    <li><button onClick={() => navigate("/downloads")} className="hover:text-primary transition">Download History</button></li>
                    <li><button onClick={() => navigate("/reading")} className="hover:text-primary transition">Reading Progress</button></li>
                  </>
                ) : (
                  <li><button onClick={() => setAuthOpen(true)} className="hover:text-primary transition">Sign In / Register</button></li>
                )}
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-accent mb-4 text-sm uppercase tracking-wider">Sources</h5>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gutenberg · DOAB · Internet Archive · Open Library · OpenStax · KICD · KNEC · AJOL · MIT OCW · PubMed · and 40+ more.
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>&copy; 2026 ZAMIFU E-MATERIALS. All content is free and open-access.</p>
            <p>Built with ♥ for African learners and the global open-knowledge community.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
