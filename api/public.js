export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { BACKEND_URL, API_KEY } = process.env;
  if (!BACKEND_URL || !API_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing env' });
  }

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch {}

  // ✅ tambahin 'prices' (dan whoami biar bisa dipakai cek)
  const allow = new Set(['create_order', 'upload_proof', 'prices', 'whoami']);
  const action = String(body.action || '').toLowerCase();
  if (!allow.has(action)) {
    return res.status(400).json({ ok: false, error: 'Invalid public action' });
  }

  const payload = { ...body, api_key: API_KEY };
  const r = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  const text = await r.text();
  res.status(r.status).send(text);
}
