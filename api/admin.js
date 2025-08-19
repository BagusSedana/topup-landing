export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { BACKEND_URL, API_KEY, ADMIN_KEY, ALLOWED_ORIGINS } = process.env;
    if (!BACKEND_URL || !API_KEY) return res.status(500).json({ error: 'Missing env' });

    const allowed = (ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
    const origin = req.headers.origin || '';
    if (allowed.length && !allowed.includes(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    // injek API_KEY dan ADMIN_KEY (kalau diset), override admin_key dari client
    const payload = { ...body, api_key: API_KEY, ...(ADMIN_KEY ? { admin_key: ADMIN_KEY } : {}) };

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
