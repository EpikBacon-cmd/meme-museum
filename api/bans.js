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

  // GET - check if a user is banned
  if (req.method === 'GET') {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const { data } = await supabase
      .from('bans')
      .select('*')
      .eq('username', username)
      .single();
    if (!data) return res.status(200).json({ banned: false });
    // Check if ban has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await supabase.from('bans').delete().eq('username', username);
      return res.status(200).json({ banned: false });
    }
    return res.status(200).json({ banned: true, reason: data.reason, expires_at: data.expires_at });
  }

  // POST - ban a user (admin only)
  if (req.method === 'POST') {
    const { sessionId, username, reason, duration_days } = req.body;
    const isAdmin = await verifyAdmin(sessionId);
    if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    if (username === ADMIN_USER) return res.status(400).json({ error: 'Cannot ban admin' });

    const expires_at = duration_days 
      ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null; // null = permanent

    // Upsert ban
    const { data: existing } = await supabase.from('bans').select('id').eq('username', username).single();
    if (existing) {
      await supabase.from('bans').update({ reason, expires_at }).eq('username', username);
    } else {
      await supabase.from('bans').insert({ username, reason, expires_at });
    }

    // Kill their sessions
    await supabase.from('sessions').delete().eq('username', username);
    return res.status(200).json({ success: true });
  }

  // DELETE - unban a user (admin only)
  if (req.method === 'DELETE') {
    const { sessionId, username } = req.body;
    const isAdmin = await verifyAdmin(sessionId);
    if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    await supabase.from('bans').delete().eq('username', username);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
