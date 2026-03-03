import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ADMIN_USER = 'epik_memer';

async function verifyAdmin(sessionId) {
  if (!sessionId) return false;
  const { data } = await supabase.from('sessions').select('username').eq('id', sessionId).single();
  return data?.username === ADMIN_USER;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { title, body, img_url, sessionId, category } = req.body;
    const isAdmin = await verifyAdmin(sessionId);
    if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    if (!title || !body) return res.status(400).json({ error: 'Missing fields' });

    const { data, error } = await supabase
      .from('posts')
      .insert({ title, body, img_url: img_url || '', author: ADMIN_USER, category: category || 'Meme News' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id, sessionId } = req.body;
    const isAdmin = await verifyAdmin(sessionId);
    if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
