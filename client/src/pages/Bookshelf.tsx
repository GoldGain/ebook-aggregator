import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Trash2, ChevronRight, Sparkles, BarChart3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Bookshelf() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"saved" | "reading" | "progress">("saved");
  const pageSize = 20;

  // Fetch bookshelf
  const { data: bookshelfItems, isLoading: shelfLoading, refetch } = trpc.bookshelf.list.useQuery(
    { limit: pageSize, offset: currentPage * pageSize },
    { enabled: !!user && activeTab === "saved" }
  );

  // Fetch reading progress
  const { data: readingProgress, isLoading: readingLoading } = trpc.reading.all.useQuery(
    { limit: pageSize, offset: currentPage * pageSize },
    { enabled: !!user && activeTab === "progress" }
  );

  // Currently reading
  const { data: currentlyReading, isLoading: currentLoading } = trpc.reading.currentlyReading.useQuery(
    undefined,
    { enabled: !!user && activeTab === "reading" }
  );

  // Download count
  const { data: downloadCount } = trpc.downloads.count.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Remove from bookshelf mutation
  const removeFromBookshelfMutation = trpc.bookshelf.remove.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Removed from bookshelf");
    },
    onError: () => {
      toast.error("Failed to remove from bookshelf");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const hasMorePages = bookshelfItems && bookshelfItems.length === pageSize;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="text-2xl font-bold neon-glow hover:opacity-80 transition">LUMINA</button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-foreground hover:text-primary">Home</Button>
            <Button variant="ghost" onClick={() => navigate("/catalog")} className="text-foreground hover:text-primary">Catalog</Button>
            <Button variant="ghost" onClick={() => navigate("/recommendations")} className="text-foreground hover:text-primary">Recommendations</Button>
            <Button variant="ghost" onClick={() => navigate("/downloads")} className="text-foreground hover:text-primary">Downloads</Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">MY LIBRARY</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">Your personal reading collection</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-neon text-center py-3">
            <p className="text-2xl font-bold text-primary">{bookshelfItems?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Saved Books</p>
          </div>
          <div className="card-neon text-center py-3">
            <p className="text-2xl font-bold text-accent">{currentlyReading?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Currently Reading</p>
          </div>
          <div className="card-neon text-center py-3">
            <p className="text-2xl font-bold text-secondary">{readingProgress?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Progress Tracked</p>
          </div>
          <div className="card-neon text-center py-3">
            <p className="text-2xl font-bold gradient-text">{downloadCount || 0}</p>
            <p className="text-xs text-muted-foreground">Downloads</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button onClick={() => { setActiveTab("saved"); setCurrentPage(0); }} className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${activeTab === "saved" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <BookOpen className="w-4 h-4" /> Saved ({bookshelfItems?.length || 0})
          </button>
          <button onClick={() => setActiveTab("reading")} className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${activeTab === "reading" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <BarChart3 className="w-4 h-4" /> Currently Reading ({currentlyReading?.length || 0})
          </button>
          <button onClick={() => { setActiveTab("progress"); setCurrentPage(0); }} className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${activeTab === "progress" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Sparkles className="w-4 h-4" /> Progress ({readingProgress?.length || 0})
          </button>
        </div>

        {/* Saved Tab */}
        {activeTab === "saved" && (
          <>
            {shelfLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : bookshelfItems && bookshelfItems.length > 0 ? (
              <>
                <div className="space-y-4 mb-12">
                  {bookshelfItems.map((item) => (
                    <div key={item.id} className="card-neon flex items-center justify-between p-4 hover:bg-card transition group">
                      <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => navigate(`/book/${item.bookId}`)}>
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold group-hover:text-primary transition">Book #{item.bookId}</h3>
                          <p className="text-sm text-muted-foreground">Saved {new Date(item.savedAt).toLocaleDateString()}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <Button onClick={() => removeFromBookshelfMutation.mutate({ bookId: item.bookId })} disabled={removeFromBookshelfMutation.isPending} variant="outline" size="sm" className="gap-2 ml-4">
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </Button>
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
            ) : (
              <div className="card-neon text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-6">Your bookshelf is empty</p>
                <Button onClick={() => navigate("/catalog")} className="btn-neon">Browse Catalog</Button>
              </div>
            )}
          </>
        )}

        {/* Currently Reading Tab */}
        {activeTab === "reading" && (
          <>
            {currentLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : currentlyReading && currentlyReading.length > 0 ? (
              <div className="space-y-4 mb-12">
                {currentlyReading.map((item) => (
                  <div key={item.id} className="card-neon p-4 cursor-pointer hover:border-primary transition" onClick={() => navigate(`/book/${item.bookId}`)}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Book #{item.bookId}</h3>
                      <span className="text-sm text-muted-foreground">
                        Started {new Date(item.lastReadAt).toLocaleDateString()}
                      </span>
                    </div>
                    {item.percentage !== null && (
                      <div>
                        <div className="w-full bg-background rounded-full h-2 mb-1">
                          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${item.percentage}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Page {item.currentPage || 0} {item.totalPages ? `/ ${item.totalPages}` : ""}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-neon text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-6">No books currently being read</p>
                <Button onClick={() => navigate("/catalog")} className="btn-neon">Find Something to Read</Button>
              </div>
            )}
          </>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <>
            {readingLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : readingProgress && readingProgress.length > 0 ? (
              <div className="space-y-4 mb-12">
                {readingProgress.map((item) => (
                  <div key={item.id} className="card-neon p-4 cursor-pointer hover:border-primary transition" onClick={() => navigate(`/book/${item.bookId}`)}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Book #{item.bookId}</h3>
                      <span className={`text-sm font-medium ${item.percentage === 100 ? "text-green-400" : "text-primary"}`}>
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-background rounded-full h-3 mb-1">
                      <div className={`h-3 rounded-full transition-all ${item.percentage === 100 ? "bg-green-400" : "bg-primary"}`} style={{ width: `${item.percentage}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Page {item.currentPage || 0} {item.totalPages ? `of ${item.totalPages}` : ""} | Last read {new Date(item.lastReadAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-neon text-center py-12">
                <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-6">No reading progress tracked yet</p>
                <Button onClick={() => navigate("/catalog")} className="btn-neon">Start Reading</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
