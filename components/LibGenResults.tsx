'use client';
import { useState, useEffect } from 'react';
import { Loader2, Download, ExternalLink, BookOpen } from 'lucide-react';

interface LibGenBook {
  title: string; author: string; publisher: string;
  year: string; language: string; pages: string;
  size: string; format: string; md5: string;
  downloadUrl: string; annaArchiveUrl: string; libgenPwUrl: string;
}

export function LibGenResults({ query, language }: { query: string; language?: string }) {
  const [books, setBooks] = useState<LibGenBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!query || query.length < 2) { setBooks([]); return; }
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, limit: '50', page: String(page) });
        if (language) params.set('language', language);
        const res = await fetch(`/api/libgen?${params}`);
        const data = await res.json();
        if (data.success) setBooks(data.books || []);
      } catch (err) { console.error('LibGen fetch failed:', err); }
      finally { setLoading(false); }
    };
    const t = setTimeout(fetchBooks, 500);
    return () => clearTimeout(t);
  }, [query, language, page]);

  if (!query || query.length < 2) return null;
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (books.length === 0) return <p className="text-sm text-muted-foreground py-4">No LibGen results found</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">LibGen Results ({books.length})</h3>
        <span className="text-xs text-muted-foreground">20M+ books</span>
      </div>
      {books.map((book, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border hover:bg-card/80 transition">
          <BookOpen className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{book.title}</p>
            <p className="text-xs text-muted-foreground">{book.author} {book.year && ` · ${book.year}`} · {book.language} · {book.format?.toUpperCase()}</p>
            <div className="flex gap-2 mt-2">
              <a href={`/api/download?md5=${book.md5}&format=${book.format || 'pdf'}`} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20">
                  <Download className="w-3 h-3" /> Download PDF
                </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}