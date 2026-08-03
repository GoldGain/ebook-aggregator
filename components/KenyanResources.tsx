'use client';
import { useState, useEffect } from 'react';
import { Loader2, Download, FileText, GraduationCap, BookOpen } from 'lucide-react';

interface KenyanResource {
  title: string; url: string; source: string;
  type: string; format: string; grade?: string;
}

const TYPE_ICONS: Record<string, any> = {
  curriculum: BookOpen, textbook: BookOpen, past_paper: FileText,
  resource: GraduationCap, exam: FileText,
};

export function KenyanResources({ query, type }: { query?: string; type?: string }) {
  const [materials, setMaterials] = useState<KenyanResource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (type) params.set('type', type);
        const res = await fetch(`/api/kenyan-resources?${params}`);
        const data = await res.json();
        if (data.success) setMaterials(data.materials || []);
      } catch (err) { console.error('Failed to fetch Kenyan resources:', err); }
      finally { setLoading(false); }
    };
    fetchMaterials();
  }, [query, type]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (materials.length === 0) return <p className="text-sm text-muted-foreground py-4">No Kenyan resources found</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Kenyan Educational Resources ({materials.length})</h3>
      </div>
      {materials.map((item, i) => {
        const Icon = TYPE_ICONS[item.type] || FileText;
        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border hover:bg-card/80 transition">
            <Icon className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.source} {item.grade && `· ${item.grade}`} · {item.format?.toUpperCase()}</p>
            </div>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded text-xs hover:bg-emerald-500/20 flex-shrink-0">
              <Download className="w-3 h-3" /> Open
            </a>
          </div>
        );
      })}
    </div>
  );
}