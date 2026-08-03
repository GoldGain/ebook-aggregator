import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Download, Heart, Share2, ExternalLink, Calendar, Globe, ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const bookId = parseInt(id || "0", 10);

  // Fetch book details
  const { data: book, isLoading } = trpc.books.getById.useQuery(
    { id: bookId },
    { enabled: !!bookId }
  );

  // Check if in bookshelf
  const { data: inBookshelf } = trpc.bookshelf.isInBookshelf.useQuery(
    { bookId },
    { enabled: !!user && !!bookId }
  );

  // Reading progress
  const { data: readingProgress } = trpc.reading.get.useQuery(
    { bookId },
    { enabled: !!user && !!bookId }
  );

  // Bookshelf mutations
  const addToBookshelfMutation = trpc.bookshelf.add.useMutation({
    onSuccess: () => {
      setIsSaved(true);
      toast.success("Added to your bookshelf!");
    },
    onError: () => {
      toast.error("Failed to add to bookshelf");
    },
  });

  const removeFromBookshelfMutation = trpc.bookshelf.remove.useMutation({
    onSuccess: () => {
      setIsSaved(false);
      toast.success("Removed from your bookshelf");
    },
    onError: () => {
      toast.error("Failed to remove from bookshelf");
    },
  });

  // Download mutation
  const recordDownloadMutation = trpc.downloads.record.useMutation({
    onSuccess: () => {
      toast.success("Download recorded!");
    },
  });

  // Reading progress mutation
  const updateReadingMutation = trpc.reading.update.useMutation({
    onSuccess: () => {
      toast.success("Reading progress updated!");
    },
  });

  // Keep every hook above conditional render paths so React sees a stable hook order.
  const { data: similarBooks } = trpc.books.getSimilar.useQuery(
    { bookId, limit: 6 },
    { enabled: !!bookId }
  );

  const handleToggleBookshelf = () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (isSaved || inBookshelf) {
      removeFromBookshelfMutation.mutate({ bookId });
    } else {
      addToBookshelfMutation.mutate({ bookId });
    }
  };

  const handleDownload = (format: string, url: string) => {
    if (user) {
      recordDownloadMutation.mutate({ bookId, format: format as any });
    }
    // Create a temporary anchor element to trigger a proper download
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkAsRead = () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    updateReadingMutation.mutate({ bookId, percentage: 100 });
    toast.success("Marked as read!");
  };

  const handleStartReading = () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    updateReadingMutation.mutate({ bookId, currentPage: 1, percentage: 0 });
    toast.success("Started reading!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex items-center justify-between h-16">
            <button onClick={() => navigate("/")} className="text-2xl font-bold neon-glow hover:opacity-80 transition">LUMINA</button>
          </div>
        </nav>
        <div className="container py-12">
          <p className="text-muted-foreground">Book not found</p>
          <Button onClick={() => navigate("/catalog")} className="btn-neon mt-4">Back to Catalog</Button>
        </div>
      </div>
    );
  }

  const formats = book.formats ? JSON.parse(book.formats) : {};
  const subjects = book.subjects ? JSON.parse(book.subjects) : [];
  const canDownload = book.directDownloadAllowed && book.rightsStatus !== "metadata_only";

  const SOURCE_COLORS: Record<string, string> = {
    gutenberg: "bg-green-500/10 text-green-400",
    doab: "bg-blue-500/10 text-blue-400",
    open_textbook: "bg-orange-500/10 text-orange-400",
    kicd: "bg-purple-500/10 text-purple-400",
    knec: "bg-yellow-500/10 text-yellow-400",
    ajol: "bg-red-500/10 text-red-400",
    internet_archive: "bg-cyan-500/10 text-cyan-400",
    open_library: "bg-teal-500/10 text-teal-400",
    openstax: "bg-indigo-500/10 text-indigo-400",
    mit_ocw: "bg-pink-500/10 text-pink-400",
    pubmed: "bg-emerald-500/10 text-emerald-400",
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="font-black text-lg neon-glow hidden sm:inline">LUMINA</span>
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="text-muted-foreground hover:text-primary">Catalog</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/search")} className="text-muted-foreground hover:text-primary">Search</Button>
            {user?.role === "admin" && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-muted-foreground hover:text-primary">Admin</Button>
            )}
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-6 text-muted-foreground hover:text-primary gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div className="grid md:grid-cols-3 gap-12">
          {/* Book Cover and Actions */}
          <div className="md:col-span-1">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="w-full rounded-lg shadow-lg mb-6 neon-border" />
            ) : (
              <div className="w-full aspect-[3/4] bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg mb-6 flex items-center justify-center neon-border">
                <BookOpen className="w-16 h-16 text-muted-foreground" />
              </div>
            )}

            <div className="space-y-3">
              <Button onClick={handleToggleBookshelf} disabled={addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending} className={`w-full gap-2 ${isSaved || inBookshelf ? "btn-neon-outline" : "btn-neon"}`}>
                <Heart className={`w-5 h-5 ${isSaved || inBookshelf ? "fill-current" : ""}`} />
                {isSaved || inBookshelf ? "Saved" : "Save to Bookshelf"}
              </Button>

              {user && !readingProgress && (
                <Button variant="outline" className="w-full gap-2" onClick={handleStartReading}>
                  <BookOpen className="w-5 h-5" />
                  Start Reading
                </Button>
              )}

              {readingProgress && (readingProgress.percentage ?? 0) === 100 ? (
                <span className="block w-full text-center py-2 px-4 bg-primary/20 text-primary rounded text-sm font-medium">
                  Completed
                </span>
              ) : readingProgress && (readingProgress.percentage ?? 0) > 0 ? (
                <div className="card-neon p-3">
                  <p className="text-xs text-muted-foreground mb-1">Reading Progress</p>
                  <div className="w-full bg-background rounded-full h-2 mb-1">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${readingProgress.percentage ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-primary font-medium">{readingProgress.percentage ?? 0}% complete</p>
                </div>
              ) : null}

              {user && (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleMarkAsRead}>
                  Mark as Read
                </Button>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: book.title, text: `Check out "${book.title}" by ${book.author} on Lumina Books`, url: window.location.href });
                  } else {
                    handleCopyLink();
                  }
                }}>
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Book Info Card */}
            <div className="mt-8 space-y-4 card-neon p-4">
              {book.source && (
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${SOURCE_COLORS[book.source] || "bg-accent/10 text-accent"}`}>
                    {book.source}
                  </span>
                </div>
              )}
              {book.language && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Language</p>
                    <p className="font-semibold">{book.language.toUpperCase()}</p>
                  </div>
                </div>
              )}
              {book.downloadCount ? (
                <div>
                  <p className="text-sm text-muted-foreground">Downloads</p>
                  <p className="font-semibold">{book.downloadCount.toLocaleString()}</p>
                </div>
              ) : null}
              {book.educationalLevel && (
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="font-semibold capitalize">{book.educationalLevel.replace("_", " ")}</p>
                </div>
              )}
              {book.pages && (
                <div>
                  <p className="text-sm text-muted-foreground">Pages</p>
                  <p className="font-semibold">{book.pages}</p>
                </div>
              )}
              {book.publisher && (
                <div>
                  <p className="text-sm text-muted-foreground">Publisher</p>
                  <p className="font-semibold">{book.publisher}</p>
                </div>
              )}
              {book.isbn && (
                <div>
                  <p className="text-sm text-muted-foreground">ISBN</p>
                  <p className="font-semibold text-sm">{book.isbn}</p>
                </div>
              )}
              {book.publishedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <p className="font-semibold">{book.publishedDate}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Book Details */}
          <div className="md:col-span-2">
            <h1 className="text-4xl font-bold neon-glow mb-2">{book.title}</h1>
            <p className="text-xl text-muted-foreground mb-6">
              by <span className="text-primary font-semibold">{book.author || "Unknown Author"}</span>
            </p>

            {/* Reading Progress Bar (for logged in users) */}
            {user && readingProgress && (readingProgress.percentage ?? 0) > 0 && (
              <div className="mb-8 card-neon p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Your Progress</span>
                  <span className="text-sm text-primary">{readingProgress.percentage ?? 0}%</span>
                </div>
                <div className="w-full bg-background rounded-full h-3">
                  <div className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all" style={{ width: `${readingProgress.percentage ?? 0}%` }} />
                </div>
                {readingProgress.currentPage && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Page {readingProgress.currentPage} of {readingProgress.totalPages || "?"}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">About This Book</h2>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{book.description}</p>
              </div>
            )}

            {/* Subjects/Tags */}
            {subjects.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">Subjects</h2>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm">{subject}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Download Options */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-primary">{canDownload ? "Download" : "Access"}</h2>
              <div className="grid grid-cols-1 gap-4 max-w-sm">
                {canDownload && formats.pdf && (
                  <Button onClick={() => handleDownload("pdf", formats.pdf)} className="btn-neon gap-2 h-auto py-4 flex-col">
                    <Download className="w-6 h-6" />
                    <span className="text-lg font-bold">Download PDF</span>
                    <span className="text-xs opacity-75">Full high-quality document</span>
                  </Button>
                )}
              </div>
              {(!canDownload || Object.keys(formats).length === 0) && (
                <div className="card-neon p-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    {book.sourceUrl ? "This record links to the original source for access." : "No verified download formats are available for this record."}
                  </p>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-4 space-y-1">
                <p>{book.licenseName || "Rights information has not yet been verified for this record."}</p>
                {book.licenseUrl && (
                  <a href={book.licenseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:text-primary transition">
                    <ExternalLink className="w-3 h-3" /> License and access terms
                  </a>
                )}
              </div>
            </div>

            {/* Source URL */}
            {book.sourceUrl && (
              <div className="mb-8">
                <a href={book.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-accent hover:text-primary transition">
                  <ExternalLink className="w-4 h-4" />
                  View on {book.source || "source"}
                </a>
              </div>
            )}

            {/* Metadata */}
            <div className="card-neon p-6">
              <h3 className="font-bold text-primary mb-4">Book Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {book.gutenbergId && (
                  <div>
                    <p className="text-muted-foreground">Gutenberg ID</p>
                    <p className="font-semibold">{book.gutenbergId}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Added</p>
                  <p className="font-semibold">{new Date(book.importedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Books */}
        {similarBooks && similarBooks.length > 0 && (
          <div className="mt-16 border-t border-border pt-12">
            <h2 className="text-2xl font-black mb-6">YOU MAY ALSO LIKE</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similarBooks.map((sb: any) => (
                <div
                  key={sb.id}
                  onClick={() => navigate(`/book/${sb.id}`)}
                  className="card-neon cursor-pointer group hover:border-primary/60 transition-all"
                >
                  {sb.coverUrl ? (
                    <img src={sb.coverUrl} alt={sb.title} className="w-full h-36 object-cover rounded mb-2 group-hover:opacity-90 transition" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-secondary/20 rounded mb-2 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <p className="text-xs font-bold line-clamp-2 group-hover:text-primary transition">{sb.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{sb.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
