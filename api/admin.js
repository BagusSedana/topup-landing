// /api/admin.js
// Env required: BACKEND_URL (Apps Script /exec), API_KEY, ADMIN_KEY
// Optional: ALLOWED_ORIGINS = "https://yourdomain.vercel.app,https://custom.dom"

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { BACKEND_URL, API_KEY, ADMIN_KEY, ALLOWED_ORIGINS = '' } = process.env;
    if (!BACKEND_URL || !API_KEY || !ADMIN_KEY) {
      return res.status(500).json({ error: 'Missing env (BACKEND_URL/API_KEY/ADMIN_KEY)' });
    }

    // Origin allowlist (opsional)
    const allowed = ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    const origin = req.headers.origin || '';
    if (allowed.length && !allowed.includes(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    // Body dari client (boleh ada/ga ada admin_key)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    // Suntik kunci di server (client gak bisa override)
    const payload = { ...body, api_key: API_KEY, admin_key: ADMIN_KEY };

    const r = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
