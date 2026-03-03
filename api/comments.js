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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET comments for a post
  if (req.method === 'GET') {
    const { post_id } = req.query;
    if (!post_id) return res.status(400).json({ error: 'Missing post_id' });
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post_id)
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST new comment
  if (req.method === 'POST') {
    const { post_id, body, sessionId } = req.body;
    const username = await getSessionUser(sessionId);
    if (!username) return res.status(403).json({ error: 'Must be logged in to comment' });
    if (!body || !body.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
    if (body.length > 500) return res.status(400).json({ error: 'Comment too long (max 500 chars)' });

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id, body: body.trim(), author: username })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // DELETE comment (admin or own comment)
  if (req.method === 'DELETE') {
    const { id, sessionId } = req.body;
    const username = await getSessionUser(sessionId);
    if (!username) return res.status(403).json({ error: 'Not logged in' });

    // Check ownership
    const { data: comment } = await supabase.from('comments').select('author').eq('id', id).single();
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author !== username && username !== ADMIN_USER) {
      return res.status(403).json({ error: 'Cannot delete others comments' });
    }

    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
