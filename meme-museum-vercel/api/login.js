import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ADMIN_USER = 'epik_memer';
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password_hash } = req.body;
  if (!username || !password_hash) return res.status(400).json({ error: 'Missing fields' });

  // Admin login
  if (username === ADMIN_USER) {
    if (password_hash !== ADMIN_HASH) return res.status(401).json({ error: 'Wrong password!' });

    // Create session
    const { data: session } = await supabase
      .from('sessions')
      .insert({ username: ADMIN_USER })
      .select()
      .single();

    return res.status(200).json({
      success: true,
      user: { username: ADMIN_USER, isAdmin: true, joined: 'Since the beginning of time 🌌', about: 'The Meme Curator. Keeper of the Museum. 🐸', pfp: '' },
      sessionId: session?.id
    });
  }

  // Regular user login
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user) return res.status(401).json({ error: 'Username not found!' });
  if (user.password_hash !== password_hash) return res.status(401).json({ error: 'Wrong password!' });

  // Create session
  const { data: session } = await supabase
    .from('sessions')
    .insert({ username })
    .select()
    .single();

  return res.status(200).json({
    success: true,
    user: { username: user.username, isAdmin: false, joined: user.joined, about: user.about || '', pfp: user.pfp || '' },
    sessionId: session?.id
  });
}
