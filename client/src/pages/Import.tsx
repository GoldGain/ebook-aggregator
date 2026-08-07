import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Import() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const [urlOrId, setUrlOrId] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Import mutation
  const importMutation = trpc.import.gutenberg.useMutation({
    onSuccess: () => {
      toast.success("Book imported successfully!");
      setUrlOrId("");
      navigate("/catalog");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import book");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/")}
              className="text-2xl font-bold neon-glow hover:opacity-80 transition"
            >
              ZAMIFU
            </button>
          </div>
        </nav>
        <div className="container py-12">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
          <Button onClick={() => navigate("/")} className="btn-neon mt-4">
            Back Home
          </Button>
        </div>
      </div>
    );
  }

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlOrId.trim()) {
      toast.error("Please enter a Gutenberg ID or URL");
      return;
    }
    importMutation.mutate({ urlOrId });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold neon-glow hover:opacity-80 transition"
          >
            ZAMIFU
          </button>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin")}
              className="text-foreground hover:text-primary"
            >
              Admin
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">IMPORT BOOK</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            Import a book directly from Project Gutenberg
          </p>
        </div>

        {/* Import Form */}
        <div className="max-w-2xl">
          <div className="card-neon mb-8">
            <h2 className="text-2xl font-bold mb-6 text-primary">Enter Gutenberg Details</h2>
            <form onSubmit={handleImport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Gutenberg ID or URL *
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Examples: 1342, https://www.gutenberg.org/ebooks/1342
                </p>
                <Input
                  type="text"
                  value={urlOrId}
                  onChange={(e) => setUrlOrId(e.target.value)}
                  placeholder="Enter Gutenberg ID or full URL..."
                  className="bg-card border-accent/50 focus:border-primary text-foreground"
                  disabled={importMutation.isPending}
                />
              </div>

              <Button
                type="submit"
                disabled={importMutation.isPending || !urlOrId.trim()}
                className="btn-neon w-full gap-2 py-3"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Import Book
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Info Box */}
          <div className="card-neon border-l-4 border-accent">
            <h3 className="font-bold text-lg mb-4 text-accent">How to Find a Book</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>Visit <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Project Gutenberg</a></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span>Search for a book you want to import</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span>Copy the book ID from the URL (e.g., 1342 from /ebooks/1342)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">4.</span>
                <span>Paste it above and click Import</span>
              </li>
            </ol>
          </div>

          {/* Popular Books */}
          <div className="mt-8 card-neon">
            <h3 className="font-bold text-lg mb-4 text-primary">Popular Books to Import</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <button
                onClick={() => setUrlOrId("1342")}
                className="p-3 bg-card/50 hover:bg-card border border-border rounded hover:border-accent transition text-left"
              >
                <p className="font-semibold">Pride and Prejudice</p>
                <p className="text-xs text-muted-foreground">ID: 1342</p>
              </button>
              <button
                onClick={() => setUrlOrId("11")}
                className="p-3 bg-card/50 hover:bg-card border border-border rounded hover:border-accent transition text-left"
              >
                <p className="font-semibold">Alice in Wonderland</p>
                <p className="text-xs text-muted-foreground">ID: 11</p>
              </button>
              <button
                onClick={() => setUrlOrId("98")}
                className="p-3 bg-card/50 hover:bg-card border border-border rounded hover:border-accent transition text-left"
              >
                <p className="font-semibold">Tale of Two Cities</p>
                <p className="text-xs text-muted-foreground">ID: 98</p>
              </button>
              <button
                onClick={() => setUrlOrId("1661")}
                className="p-3 bg-card/50 hover:bg-card border border-border rounded hover:border-accent transition text-left"
              >
                <p className="font-semibold">Sherlock Holmes</p>
                <p className="text-xs text-muted-foreground">ID: 1661</p>
              </button>
              <button
                onClick={() => setUrlOrId("514")}
                className="p-3 bg-card/50 hover:bg-card border border-border rounded hover:border-accent transition text-left"
              >
                <p className="font-semibold">Little Women</p>
                <p className="text-xs text-muted-foreground">ID: 514</p>
              </button>
              <button
                onClick={() => setUrlOrId("1952")}
                className="p-3 bg-card/50 hover:bg-card border border-border rounded hover:border-accent transition text-left"
              >
                <p className="font-semibold">Great Gatsby</p>
                <p className="text-xs text-muted-foreground">ID: 4671</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
