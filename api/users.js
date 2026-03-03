import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ADMIN_USER = 'epik_memer';

async function getSessionUser(sessionId) {
  if (!sessionId) return null;
  const { data } = await supabase.from('sessions').select('username').eq('id', sessionId).single();
  return data?.username || null;
}

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('username, about, pfp, joined')
      .order('joined', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { sessionId, about, pfp } = req.body;
    const username = await getSessionUser(sessionId);
    if (!username) return res.status(403).json({ error: 'Not logged in' });

    const updates = {};
    if (about !== undefined) updates.about = about;
    if (pfp !== undefined) updates.pfp = pfp;

    // For admin, upsert into users table
    if (username === ADMIN_USER) {
      const { data: existing } = await supabase
        .from('users').select('username').eq('username', ADMIN_USER).single();
      if (existing) {
        await supabase.from('users').update(updates).eq('username', ADMIN_USER);
      } else {
        await supabase.from('users').insert({ username: ADMIN_USER, password_hash: 'ADMIN', ...updates });
      }
      return res.status(200).json({ success: true });
    }

    const { error } = await supabase.from('users').update(updates).eq('username', username);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { sessionId, username } = req.body;
    const caller = await getSessionUser(sessionId);
    if (caller !== ADMIN_USER) return res.status(403).json({ error: 'Unauthorized' });
    if (username === ADMIN_USER) return res.status(400).json({ error: 'Cannot delete admin' });
    await supabase.from('sessions').delete().eq('username', username);
    const { error } = await supabase.from('users').delete().eq('username', username);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
