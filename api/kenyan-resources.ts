import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

interface KenyanResource {
  title: string; url: string; source: string;
  type: 'curriculum' | 'textbook' | 'past_paper' | 'resource' | 'exam';
  format?: string; grade?: string;
}

const SOURCES = [
  { name: 'KICD Curriculum', url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/', type: 'curriculum' as const },
  { name: 'KICD Downloads', url: 'https://kicd.ac.ke/sdm_downloads/', type: 'resource' as const },
  { name: 'CBC Resources', url: 'https://cbcresources.co.ke/', type: 'resource' as const },
  { name: 'Kenyaplex', url: 'https://www.kenyaplex.com/', type: 'resource' as const },
  { name: 'EasyElimu', url: 'https://www.easyelimu.com/', type: 'resource' as const },
  { name: 'Atika School', url: 'https://www.atikaschool.org/', type: 'resource' as const },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { q, type } = req.query;
  const materials: KenyanResource[] = [];
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
  const sourcesToScrape = SOURCES.filter(s => !type || s.type === type);

  const promises = sourcesToScrape.map(async (source) => {
    try {
      const response = await fetch(source.url, { headers, signal: AbortSignal.timeout(20000) });
      if (!response.ok) return;
      const html = await response.text();
      const $ = cheerio.load(html);
      $('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href$=".ppt"], a[href$=".pptx"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (!text || text.length < 3) return;
        const url = href.startsWith('http') ? href : `${new URL(source.url).origin}${href.startsWith('/') ? '' : '/'}${href}`;
        if (q && !text.toLowerCase().includes((q as string).toLowerCase())) return;
        let resourceGrade = '';
        const gradeMatch = text.match(/grade\s*(\d+)/i) || text.match(/form\s*(\d+)/i);
        if (gradeMatch) resourceGrade = `Grade ${gradeMatch[1]}`;
        materials.push({ title: text.slice(0, 120), url, source: source.name, type: source.type, format: href.endsWith('.pdf') ? 'pdf' : 'doc', grade: resourceGrade || undefined });
      });
    } catch { /* skip unavailable source */ }
  });

  await Promise.all(promises);
  const seen = new Set<string>();
  const unique = materials.filter(m => { if (seen.has(m.url)) return false; seen.add(m.url); return true; });
  return res.status(200).json({ success: true, total: unique.length, materials: unique.slice(0, 200) });
}