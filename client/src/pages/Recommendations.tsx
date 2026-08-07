import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Sparkles, RefreshCw, Library } from "lucide-react";
import { toast } from "sonner";

export default function Recommendations() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });

  // Fetch recommendations
  const { data: recommendations, isLoading: recsLoading, refetch } = trpc.recommendations.list.useQuery(
    { limit: 20 },
    { enabled: !!user }
  );

  // Generate recommendations
  const generateMutation = trpc.recommendations.generate.useMutation({
    onSuccess: () => {
      toast.success("Recommendations updated!");
      refetch();
    },
    onError: () => {
      toast.error("Failed to generate recommendations. Try saving more books to your bookshelf.");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="text-2xl font-bold neon-glow hover:opacity-80 transition">ZAMIFU</button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-foreground hover:text-primary">Home</Button>
            <Button variant="ghost" onClick={() => navigate("/catalog")} className="text-foreground hover:text-primary">Catalog</Button>
            <Button variant="ghost" onClick={() => navigate("/bookshelf")} className="text-foreground hover:text-primary">Bookshelf</Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="accent-line-left">
                <h1 className="text-4xl font-bold neon-glow">RECOMMENDATIONS</h1>
              </div>
            </div>
            <p className="text-muted-foreground text-lg">
              Books curated for you based on your reading interests and bookshelf
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="btn-neon gap-2">
            <RefreshCw className={`w-5 h-5 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            {generateMutation.isPending ? "Generating..." : "Generate New"}
          </Button>
        </div>

        {/* How it works */}
        <div className="card-neon p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold mb-2">How Recommendations Work</h3>
              <p className="text-sm text-muted-foreground">
                We analyze the books in your bookshelf and reading history to find subjects you're interested in.
                Then we recommend similar books from our collection. The more books you save and read,
                the better your recommendations will be.
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations List */}
        {recsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="card-neon p-4 flex items-center gap-4 cursor-pointer hover:border-primary transition" onClick={() => navigate(`/book/${rec.bookId}`)}>
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Library className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">Book #{rec.bookId}</p>
                  <p className="text-sm text-muted-foreground">{rec.reason || "Based on your interests"}</p>
                  <p className="text-xs text-accent">Relevance score: {rec.score}</p>
                </div>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/book/${rec.bookId}`); }}>
                  View Book
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-neon text-center py-20">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-4">No Recommendations Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Save books to your bookshelf and start reading to get personalized recommendations.
              The more you interact with books, the better our suggestions will be.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/catalog")} className="btn-neon">Browse Catalog</Button>
              <Button onClick={handleGenerate} variant="outline">Generate Anyway</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
