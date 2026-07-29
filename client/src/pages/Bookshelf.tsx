import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Bookshelf() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Fetch bookshelf
  const { data: bookshelfItems, isLoading, refetch } = trpc.bookshelf.list.useQuery(
    { limit: pageSize, offset: currentPage * pageSize },
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

  if (!user) {
    return null;
  }

  const hasMorePages = bookshelfItems && bookshelfItems.length === pageSize;

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
            <Button
              variant="ghost"
              onClick={() => navigate("/downloads")}
              className="text-foreground hover:text-primary"
            >
              Downloads
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">MY BOOKSHELF</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            {bookshelfItems?.length === 0
              ? "Your bookshelf is empty. Start adding books!"
              : `You have ${bookshelfItems?.length || 0} books saved`}
          </p>
        </div>

        {/* Bookshelf Items */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bookshelfItems && bookshelfItems.length > 0 ? (
          <div className="space-y-4 mb-12">
            {bookshelfItems.map((item) => (
              <div key={item.id} className="card-neon flex gap-6 hover:bg-card transition group">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    navigate(`/book/${item.bookId}`);
                  }}
                >
                  <h3 className="font-bold text-lg group-hover:text-primary transition">
                    Book ID: {item.bookId}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Saved on {new Date(item.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={() => removeFromBookshelfMutation.mutate({ bookId: item.bookId })}
                  disabled={removeFromBookshelfMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-neon text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6">Your bookshelf is empty</p>
            <Button onClick={() => navigate("/catalog")} className="btn-neon">
              Browse Catalog
            </Button>
          </div>
        )}

        {/* Pagination */}
        {bookshelfItems && bookshelfItems.length > 0 && (
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
