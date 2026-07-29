import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const [activeTab, setActiveTab] = useState<"books" | "logs">("books");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    language: "en",
  });

  // Fetch aggregator logs
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.admin.aggregatorLogs.useQuery(
    { limit: 20, offset: 0 },
    { enabled: !!user && user.role === "admin" }
  );

  // Create book mutation
  const createBookMutation = trpc.books.create.useMutation({
    onSuccess: () => {
      toast.success("Book added successfully!");
      setFormData({ title: "", author: "", language: "en" });
      setShowAddForm(false);
    },
    onError: () => {
      toast.error("Failed to add book");
    },
  });

  // Create aggregator log mutation
  const createLogMutation = trpc.admin.createAggregatorLog.useMutation({
    onSuccess: () => {
      toast.success("Aggregator started!");
      refetchLogs();
    },
    onError: () => {
      toast.error("Failed to start aggregator");
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
              LUMINA
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

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    createBookMutation.mutate({
      title: formData.title,
      author: formData.author || undefined,
      language: formData.language,
    });
  };

  const handleStartAggregator = () => {
    createLogMutation.mutate({
      status: "running",
    });
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
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">ADMIN PANEL</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage books and monitor aggregator activity
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab("books")}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === "books"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Books
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === "logs"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Aggregator Logs
          </button>
        </div>

        {/* Books Tab */}
        {activeTab === "books" && (
          <div>
            <div className="mb-8">
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn-neon gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Book
              </Button>
            </div>

            {showAddForm && (
              <div className="card-neon mb-8 max-w-md">
                <h3 className="text-xl font-bold mb-4 text-primary">Add New Book</h3>
                <form onSubmit={handleAddBook} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <Input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Book title"
                      className="bg-card border-accent/50 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Author</label>
                    <Input
                      type="text"
                      value={formData.author}
                      onChange={(e) =>
                        setFormData({ ...formData, author: e.target.value })
                      }
                      placeholder="Author name"
                      className="bg-card border-accent/50 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) =>
                        setFormData({ ...formData, language: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-card border border-accent/50 rounded-md text-foreground focus:border-primary outline-none"
                    >
                      <option value="en">English</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={createBookMutation.isPending}
                      className="btn-neon flex-1"
                    >
                      Add Book
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div>
            <div className="mb-8">
              <Button
                onClick={handleStartAggregator}
                disabled={createLogMutation.isPending}
                className="btn-neon gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Start Aggregator
              </Button>
            </div>

            {logsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="card-neon">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">
                        Run #{log.id}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          log.status === "success"
                            ? "bg-green-500/20 text-green-400"
                            : log.status === "failed"
                            ? "bg-red-500/20 text-red-400"
                            : log.status === "running"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Books Added</p>
                        <p className="font-semibold">{log.booksAdded || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Books Updated</p>
                        <p className="font-semibold">{log.booksUpdated || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Started</p>
                        <p className="font-semibold">
                          {new Date(log.startedAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-semibold">
                          {log.completedAt
                            ? new Date(log.completedAt).toLocaleString()
                            : "In Progress"}
                        </p>
                      </div>
                    </div>
                    {log.errorMessage && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                        <p className="font-semibold mb-1">Error:</p>
                        <p>{log.errorMessage}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-neon text-center py-12">
                <p className="text-muted-foreground">No aggregator runs yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
