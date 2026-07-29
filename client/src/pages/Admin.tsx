import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, RefreshCw, Users, BookOpen, Download, BarChart3, Shield, Globe, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const [activeTab, setActiveTab] = useState<"dashboard" | "books" | "users" | "sources" | "logs">("dashboard");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    language: "en",
    source: "other",
    educationalLevel: "general",
    description: "",
    coverUrl: "",
    formats: "{}",
  });

  // Dashboard stats
  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  // Aggregator logs
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.admin.aggregatorLogs.useQuery(
    { limit: 20, offset: 0 },
    { enabled: !!user && user.role === "admin" }
  );

  // Users
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.users.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !!user && user.role === "admin" && activeTab === "users" }
  );

  // Sources
  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = trpc.admin.sources.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" && activeTab === "sources" }
  );

  // Mutations
  const createBookMutation = trpc.books.create.useMutation({
    onSuccess: () => {
      toast.success("Book added successfully!");
      setFormData({ title: "", author: "", language: "en", source: "other", educationalLevel: "general", description: "", coverUrl: "", formats: "{}" });
      setShowAddForm(false);
    },
    onError: () => {
      toast.error("Failed to add book");
    },
  });

  const runAggregatorMutation = trpc.admin.runAggregator.useMutation({
    onSuccess: (data) => {
      toast.success(`Aggregator complete! Added: ${data?.totalAdded}, Updated: ${data?.totalUpdated}`);
      refetchLogs();
    },
    onError: () => {
      toast.error("Aggregator failed");
    },
  });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated");
      refetchUsers();
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });

  const updateSourceMutation = trpc.admin.updateSource.useMutation({
    onSuccess: () => {
      toast.success("Source updated");
      refetchSources();
    },
    onError: () => {
      toast.error("Failed to update source");
    },
  });

  const deleteUserMutation = trpc.books.delete.useMutation({
    onSuccess: () => {
      toast.success("Book deleted");
    },
    onError: () => {
      toast.error("Failed to delete book");
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
            <button onClick={() => navigate("/")} className="text-2xl font-bold neon-glow hover:opacity-80 transition">LUMINA</button>
          </div>
        </nav>
        <div className="container py-12">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
          <Button onClick={() => navigate("/")} className="btn-neon mt-4">Back Home</Button>
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
      source: formData.source as any,
      educationalLevel: formData.educationalLevel as any,
      description: formData.description || undefined,
      coverUrl: formData.coverUrl || undefined,
      formats: formData.formats,
    });
  };

  const handleRunAggregator = () => {
    toast.info("Starting aggregator... This may take a few minutes.");
    runAggregatorMutation.mutate({});
  };

  const toggleSource = (sourceId: number, isActive: "yes" | "no") => {
    updateSourceMutation.mutate({
      id: sourceId,
      isActive: isActive === "yes" ? "no" : "yes",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="text-2xl font-bold neon-glow hover:opacity-80 transition">LUMINA</button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/catalog")} className="text-foreground hover:text-primary">Catalog</Button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="accent-line-left">
              <h1 className="text-4xl font-bold neon-glow">ADMIN PANEL</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">Manage your ebook aggregator platform</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border overflow-x-auto">
          {[
            { key: "dashboard", label: "Dashboard", icon: BarChart3 },
            { key: "books", label: "Books", icon: BookOpen },
            { key: "users", label: "Users", icon: Users },
            { key: "sources", label: "Sources", icon: Globe },
            { key: "logs", label: "Logs", icon: Clock },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="card-neon p-6">
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Books</span>
                </div>
                <p className="text-3xl font-bold text-primary">{stats?.totalBooks?.toLocaleString() || "0"}</p>
              </div>
              <div className="card-neon p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">Total Users</span>
                </div>
                <p className="text-3xl font-bold text-accent">{stats?.totalUsers?.toLocaleString() || "0"}</p>
              </div>
              <div className="card-neon p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Download className="w-5 h-5 text-secondary" />
                  <span className="text-sm text-muted-foreground">Total Downloads</span>
                </div>
                <p className="text-3xl font-bold text-secondary">{stats?.totalDownloads?.toLocaleString() || "0"}</p>
              </div>
              <div className="card-neon p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Globe className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-muted-foreground">Active Sources</span>
                </div>
                <p className="text-3xl font-bold text-green-400">{Object.keys(stats?.booksBySource || {}).length}</p>
              </div>
            </div>

            {/* Books by Source */}
            {stats?.booksBySource && Object.keys(stats.booksBySource).length > 0 && (
              <div className="card-neon p-6 mb-8">
                <h3 className="text-xl font-bold mb-4 text-primary">Books by Source</h3>
                <div className="space-y-3">
                  {Object.entries(stats.booksBySource).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{source.replace("_", " ")}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-48 bg-background rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min((count / (stats?.totalBooks || 1)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-primary">{count.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run Aggregator */}
            <div className="card-neon p-6">
              <h3 className="text-xl font-bold mb-4 text-primary">Manual Aggregator</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Run the multi-source aggregator to fetch new books from all enabled sources.
                This may take a few minutes.
              </p>
              <Button
                onClick={handleRunAggregator}
                disabled={runAggregatorMutation.isPending}
                className="btn-neon gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${runAggregatorMutation.isPending ? "animate-spin" : ""}`} />
                {runAggregatorMutation.isPending ? "Running..." : "Run Aggregator Now"}
              </Button>
            </div>
          </div>
        )}

        {/* Books Tab */}
        {activeTab === "books" && (
          <div>
            <div className="mb-8">
              <Button onClick={() => setShowAddForm(!showAddForm)} className="btn-neon gap-2">
                <Plus className="w-5 h-5" />
                Add Book
              </Button>
            </div>

            {showAddForm && (
              <div className="card-neon mb-8 max-w-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-primary">Add New Book</h3>
                <form onSubmit={handleAddBook} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Book title" className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Author</label>
                    <input type="text" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} placeholder="Author name" className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Book description" rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:border-primary outline-none resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Language</label>
                      <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:border-primary outline-none">
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="es">Spanish</option>
                        <option value="it">Italian</option>
                        <option value="sw">Swahili</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Source</label>
                      <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:border-primary outline-none">
                        <option value="gutenberg">Project Gutenberg</option>
                        <option value="doab">DOAB</option>
                        <option value="open_textbook">Open Textbook</option>
                        <option value="kicd">KICD</option>
                        <option value="knec">KNEC</option>
                        <option value="ajol">AJOL</option>
                        <option value="unesco">UNESCO</option>
                        <option value="worldbank">World Bank</option>
                        <option value="google_books">Google Books</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Education Level</label>
                    <select value={formData.educationalLevel} onChange={(e) => setFormData({ ...formData, educationalLevel: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:border-primary outline-none">
                      <option value="primary">Primary School</option>
                      <option value="middle_school">Middle School</option>
                      <option value="high_school">High School</option>
                      <option value="college">College</option>
                      <option value="university">University</option>
                      <option value="professional">Professional</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cover URL</label>
                    <input type="text" value={formData.coverUrl} onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Formats (JSON)</label>
                    <input type="text" value={formData.formats} onChange={(e) => setFormData({ ...formData, formats: e.target.value })} placeholder='{"pdf": "https://...", "epub": "https://..."}' className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:border-primary outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createBookMutation.isPending} className="btn-neon flex-1">Add Book</Button>
                    <Button type="button" onClick={() => setShowAddForm(false)} variant="outline" className="flex-1">Cancel</Button>
                  </div>
                </form>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="card-neon p-4">
                <h4 className="font-bold mb-2 text-primary">Import from Gutenberg</h4>
                <p className="text-sm text-muted-foreground mb-3">Import books by Gutenberg ID or URL</p>
                <Button onClick={() => navigate("/import")} variant="outline" size="sm">Go to Import</Button>
              </div>
              <div className="card-neon p-4">
                <h4 className="font-bold mb-2 text-primary">Run Full Aggregator</h4>
                <p className="text-sm text-muted-foreground mb-3">Fetch from all enabled sources</p>
                <Button onClick={handleRunAggregator} disabled={runAggregatorMutation.isPending} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${runAggregatorMutation.isPending ? "animate-spin" : ""}`} />
                  Run Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            {usersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : users && users.length > 0 ? (
              <div className="space-y-4">
                {users.map((u) => (
                  <div key={u.id} className="card-neon p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{u.name || "Unnamed User"}</p>
                      <p className="text-sm text-muted-foreground">{u.email || u.openId}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(u.createdAt).toLocaleDateString()} | 
                        Last: {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        u.role === "admin" ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground"
                      }`}>
                        {u.role}
                      </span>
                      {u.id !== (user as any).id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRoleMutation.mutate({
                            id: u.id,
                            role: u.role === "admin" ? "user" : "admin",
                          })}
                        >
                          {u.role === "admin" ? "Demote" : "Promote"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-neon text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users registered yet</p>
              </div>
            )}
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === "sources" && (
          <div>
            {sourcesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sources && sources.length > 0 ? (
              <div className="space-y-4">
                {sources.map((source) => (
                  <div key={source.id} className="card-neon p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize">{source.name}</p>
                      <p className="text-sm text-muted-foreground">{source.url || "No URL"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        source.isActive === "yes" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {source.isActive === "yes" ? "Active" : "Inactive"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleSource(source.id, source.isActive as any)}
                      >
                        {source.isActive === "yes" ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-neon text-center py-12">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sources configured</p>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div>
            <div className="mb-8">
              <Button onClick={handleRunAggregator} disabled={runAggregatorMutation.isPending} className="btn-neon gap-2">
                <RefreshCw className={`w-5 h-5 ${runAggregatorMutation.isPending ? "animate-spin" : ""}`} />
                {runAggregatorMutation.isPending ? "Running..." : "Start Aggregator"}
              </Button>
            </div>

            {logsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="card-neon p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {log.status === "success" && <CheckCircle className="w-5 h-5 text-green-400" />}
                        {log.status === "failed" && <XCircle className="w-5 h-5 text-red-400" />}
                        {log.status === "running" && <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />}
                        <h3 className="font-bold text-lg capitalize">{log.source || "aggregator"}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        log.status === "success" ? "bg-green-500/20 text-green-400" :
                        log.status === "failed" ? "bg-red-500/20 text-red-400" :
                        log.status === "running" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
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
                        <p className="font-semibold">{new Date(log.startedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-semibold">{log.completedAt ? new Date(log.completedAt).toLocaleString() : "In Progress"}</p>
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
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No aggregator runs yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
