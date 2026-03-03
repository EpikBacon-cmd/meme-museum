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
    const { data: session } = await supabase.from('sessions').insert({ username: ADMIN_USER }).select().single();
    // Get admin profile from DB if exists
    const { data: adminProfile } = await supabase.from('users').select('about, pfp').eq('username', ADMIN_USER).single();
    return res.status(200).json({
      success: true,
      user: { 
        username: ADMIN_USER, isAdmin: true, 
        joined: '🌌 Since the beginning of time', 
        about: adminProfile?.about || 'The Meme Curator. Keeper of the Museum. 🐸', 
        pfp: adminProfile?.pfp || '' 
      },
      sessionId: session?.id
    });
  }

  // Check ban first
  const { data: ban } = await supabase.from('bans').select('*').eq('username', username).single();
  if (ban) {
    if (!ban.expires_at || new Date(ban.expires_at) > new Date()) {
      const expiry = ban.expires_at 
        ? `until ${new Date(ban.expires_at).toLocaleDateString()}` 
        : 'permanently';
      return res.status(403).json({ 
        error: `🚫 You are banned ${expiry}. Reason: ${ban.reason || 'No reason given'}` 
      });
    } else {
      // Ban expired, clean it up
      await supabase.from('bans').delete().eq('username', username);
    }
  }

  // Regular user login
  const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
  if (error || !user) return res.status(401).json({ error: 'Username not found!' });
  if (user.password_hash !== password_hash) return res.status(401).json({ error: 'Wrong password!' });

  const { data: session } = await supabase.from('sessions').insert({ username }).select().single();
  return res.status(200).json({
    success: true,
    user: { username: user.username, isAdmin: false, joined: user.joined, about: user.about || '', pfp: user.pfp || '' },
    sessionId: session?.id
  });
}
