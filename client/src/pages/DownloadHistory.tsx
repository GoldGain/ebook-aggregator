import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText, BarChart3, TrendingUp } from "lucide-react";
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

  // Fetch download count
  const { data: downloadCount } = trpc.downloads.count.useQuery(
    {},
    { enabled: !!user }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const hasMorePages = downloads && downloads.length === pageSize;

  // Format stats
  const formatStats = downloads?.reduce((acc, d) => {
    acc[d.format] = (acc[d.format] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="text-2xl font-bold neon-glow hover:opacity-80 transition">LUMINA</button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-foreground hover:text-primary">Home</Button>
            <Button variant="ghost" onClick={() => navigate("/catalog")} className="text-foreground hover:text-primary">Catalog</Button>
            <Button variant="ghost" onClick={() => navigate("/bookshelf")} className="text-foreground hover:text-primary">Bookshelf</Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">DOWNLOAD HISTORY</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">Track all your downloaded books</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-neon text-center py-3">
            <p className="text-2xl font-bold text-primary">{downloadCount || downloads?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total Downloads</p>
          </div>
          <div className="card-neon text-center py-3">
            <p className="text-2xl font-bold text-accent">{Object.keys(formatStats).length}</p>
            <p className="text-xs text-muted-foreground">Formats Used</p>
          </div>
          {formatStats.epub && (
            <div className="card-neon text-center py-3">
              <p className="text-2xl font-bold gradient-text">{formatStats.epub}</p>
              <p className="text-xs text-muted-foreground">EPUB</p>
            </div>
          )}
          {formatStats.pdf && (
            <div className="card-neon text-center py-3">
              <p className="text-2xl font-bold text-secondary">{formatStats.pdf}</p>
              <p className="text-xs text-muted-foreground">PDF</p>
            </div>
          )}
        </div>

        {/* Downloads List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : downloads && downloads.length > 0 ? (
          <>
            <div className="space-y-4 mb-12">
              {downloads.map((item) => (
                <div key={item.id} className="card-neon p-4 flex items-center gap-4 hover:bg-card transition group cursor-pointer" onClick={() => navigate(`/book/${item.bookId}`)}>
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-primary transition">Book #{item.bookId}</h3>
                    <p className="text-sm text-muted-foreground">Downloaded {new Date(item.downloadedAt).toLocaleString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm uppercase">{item.format}</span>
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
            <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6">No downloads yet</p>
            <Button onClick={() => navigate("/catalog")} className="btn-neon">Browse Catalog</Button>
          </div>
        )}
      </div>
    </div>
  );
}
