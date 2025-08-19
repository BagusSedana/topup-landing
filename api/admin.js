// Vercel Serverless Function
// Secrets di Environment Variables:
// - BACKEND_URL  -> URL Apps Script /exec
// - API_KEY      -> API key untuk Apps Script
// - ALLOWED_ORIGINS (opsional, koma-separated) -> contoh: https://bgstore-five.vercel.app

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const BACKEND_URL = process.env.BACKEND_URL;
    const API_KEY = process.env.API_KEY;
    if (!BACKEND_URL || !API_KEY) return res.status(500).json({ error: 'Missing env' });

    // Origin filter (optional)
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
    const origin = req.headers.origin || '';
    if (allowed.length && !allowed.includes(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    // Inject API_KEY di server, jangan di client
    const payload = { ...body, api_key: API_KEY };

    const r = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
