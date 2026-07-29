import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { useState } from "react";

export default function DownloadHistory() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Fetch download history
  const { data: downloads, isLoading } = trpc.downloads.history.useQuery(
    { limit: pageSize, offset: currentPage * pageSize },
    { enabled: !!user }
  );

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

  const hasMorePages = downloads && downloads.length === pageSize;

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
              onClick={() => navigate("/bookshelf")}
              className="text-foreground hover:text-primary"
            >
              Bookshelf
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">DOWNLOAD HISTORY</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            {downloads?.length === 0
              ? "No downloads yet"
              : `You have downloaded ${downloads?.length || 0} books`}
          </p>
        </div>

        {/* Downloads List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : downloads && downloads.length > 0 ? (
          <div className="space-y-4 mb-12">
            {downloads.map((item) => (
              <div key={item.id} className="card-neon flex gap-6 hover:bg-card transition group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="w-5 h-5 text-accent" />
                    <h3 className="font-bold text-lg group-hover:text-primary transition">
                      Book ID: {item.bookId}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <p>Format</p>
                      <p className="font-semibold text-foreground uppercase">{item.format}</p>
                    </div>
                    <div>
                      <p>Downloaded</p>
                      <p className="font-semibold text-foreground">
                        {new Date(item.downloadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-neon text-center py-12">
            <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6">No downloads yet</p>
            <Button onClick={() => navigate("/catalog")} className="btn-neon">
              Browse Catalog
            </Button>
          </div>
        )}

        {/* Pagination */}
        {downloads && downloads.length > 0 && (
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
