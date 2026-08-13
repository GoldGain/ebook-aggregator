// @ts-ignore
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.replace('Bearer ', '');
  // @ts-ignore
  const { data: { user }, error: authError } = await (supabase.auth as any).getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });
  const { action } = req.query;

  try {
    switch (action) {
      case 'favorites': {
        if (req.method === 'GET') {
          const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          return res.json({ success: true, favorites: data });
        }
        if (req.method === 'POST') {
          const { book_md5, book_title, book_author, book_cover } = req.body;
          const { data } = await supabase.from('favorites').upsert({ user_id: user.id, book_md5, book_title, book_author, book_cover, created_at: new Date().toISOString() }, { onConflict: 'user_id,book_md5' }).select();
          return res.json({ success: true, favorite: data?.[0] });
        }
        if (req.method === 'DELETE') {
          const { book_md5 } = req.body;
          await supabase.from('favorites').delete().eq('user_id', user.id).eq('book_md5', book_md5);
          return res.json({ success: true });
        }
        break;
      }
      case 'history': {
        if (req.method === 'GET') {
          const { data } = await supabase.from('download_history').select('*').eq('user_id', user.id).order('downloaded_at', { ascending: false }).limit(50);
          return res.json({ success: true, history: data });
        }
        if (req.method === 'POST') {
          const { book_md5, book_title, book_author, format } = req.body;
          const { data } = await supabase.from('download_history').insert({ user_id: user.id, book_md5, book_title, book_author, format, downloaded_at: new Date().toISOString() }).select();
          return res.json({ success: true, entry: data?.[0] });
        }
        break;
      }
      case 'progress': {
        if (req.method === 'GET') {
          const { data } = await supabase.from('reading_progress').select('*').eq('user_id', user.id);
          return res.json({ success: true, progress: data });
        }
        if (req.method === 'POST') {
          const { book_md5, page, percentage } = req.body;
          const { data } = await supabase.from('reading_progress').upsert({ user_id: user.id, book_md5, current_page: page, percentage, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book_md5' }).select();
          return res.json({ success: true, progress: data?.[0] });
        }
        break;
      }
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}