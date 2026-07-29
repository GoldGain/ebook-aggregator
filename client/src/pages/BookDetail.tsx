import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Download, Heart, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

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

  const handleToggleBookshelf = () => {
    if (!user) {
      navigate("/");
      toast.error("Please sign in first");
      return;
    }

    if (isSaved) {
      removeFromBookshelfMutation.mutate({ bookId });
    } else {
      addToBookshelfMutation.mutate({ bookId });
    }
  };

  const handleDownload = (format: string, url: string) => {
    if (user) {
      recordDownloadMutation.mutate({ bookId, format: format as any });
    }
    window.open(url, "_blank");
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
            <button
              onClick={() => navigate("/")}
              className="text-2xl font-bold neon-glow hover:opacity-80 transition"
            >
              LUMINA
            </button>
          </div>
        </nav>
        <div className="container py-12">
          <p className="text-muted-foreground">Book not found</p>
          <Button onClick={() => navigate("/catalog")} className="btn-neon mt-4">
            Back to Catalog
          </Button>
        </div>
      </div>
    );
  }

  const formats = book.formats ? JSON.parse(book.formats) : {};
  const subjects = book.subjects ? JSON.parse(book.subjects) : [];

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
        <Button
          variant="ghost"
          onClick={() => navigate("/catalog")}
          className="mb-8 text-muted-foreground hover:text-primary"
        >
          ← Back to Catalog
        </Button>

        <div className="grid md:grid-cols-3 gap-12">
          {/* Book Cover and Actions */}
          <div className="md:col-span-1">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full rounded-lg shadow-lg mb-6 neon-border"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg mb-6 flex items-center justify-center neon-border">
                <BookOpen className="w-16 h-16 text-muted-foreground" />
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleToggleBookshelf}
                disabled={addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending}
                className={`w-full gap-2 ${
                  isSaved || inBookshelf ? "btn-neon-outline" : "btn-neon"
                }`}
              >
                <Heart className={`w-5 h-5 ${isSaved || inBookshelf ? "fill-current" : ""}`} />
                {isSaved || inBookshelf ? "Saved" : "Save to Bookshelf"}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  navigator.share?.({
                    title: book.title,
                    text: `Check out "${book.title}" by ${book.author} on Lumina Books`,
                  });
                }}
              >
                <Share2 className="w-5 h-5" />
                Share
              </Button>
            </div>

            {/* Book Info */}
            <div className="mt-8 space-y-4 card-neon">
              {book.language && (
                <div>
                  <p className="text-sm text-muted-foreground">Language</p>
                  <p className="font-semibold">{book.language.toUpperCase()}</p>
                </div>
              )}
              {book.downloadCount && (
                <div>
                  <p className="text-sm text-muted-foreground">Downloads</p>
                  <p className="font-semibold">{book.downloadCount.toLocaleString()}</p>
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

            {/* Description */}
            {book.description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">About This Book</h2>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {book.description}
                </p>
              </div>
            )}

            {/* Subjects/Tags */}
            {subjects.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">Subjects</h2>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Download Options */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-primary">Download</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formats.epub && (
                  <Button
                    onClick={() => handleDownload("epub", formats.epub)}
                    className="btn-neon gap-2 h-auto py-3 flex-col"
                  >
                    <Download className="w-5 h-5" />
                    <span>EPUB Format</span>
                    <span className="text-xs opacity-75">E-reader</span>
                  </Button>
                )}
                {formats.pdf && (
                  <Button
                    onClick={() => handleDownload("pdf", formats.pdf)}
                    className="btn-neon gap-2 h-auto py-3 flex-col"
                  >
                    <Download className="w-5 h-5" />
                    <span>PDF Format</span>
                    <span className="text-xs opacity-75">Print-friendly</span>
                  </Button>
                )}
                {formats.txt && (
                  <Button
                    onClick={() => handleDownload("txt", formats.txt)}
                    className="btn-neon gap-2 h-auto py-3 flex-col"
                  >
                    <Download className="w-5 h-5" />
                    <span>Plain Text</span>
                    <span className="text-xs opacity-75">Text file</span>
                  </Button>
                )}
                {formats.html && (
                  <Button
                    onClick={() => handleDownload("html", formats.html)}
                    className="btn-neon gap-2 h-auto py-3 flex-col"
                  >
                    <Download className="w-5 h-5" />
                    <span>HTML Format</span>
                    <span className="text-xs opacity-75">Web version</span>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                All books are in the public domain via Project Gutenberg
              </p>
            </div>

            {/* Metadata */}
            <div className="card-neon">
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
                  <p className="font-semibold">
                    {new Date(book.importedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
