import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password_hash } = req.body;

  if (!username || !password_hash) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username too short' });
  }
  if (username === 'epik_memer') {
    return res.status(400).json({ error: 'That username is reserved!' });
  }

  // Check if username taken
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .single();

  if (existing) {
    return res.status(409).json({ error: 'Username already taken!' });
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ username, password_hash, about: '', pfp: '' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true, user: { username: data.username, joined: data.joined, about: data.about, pfp: data.pfp } });
}
