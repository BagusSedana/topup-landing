import crypto from 'crypto';
import { signJWT, allowCors, safeEqual } from '../_utils.js';

// ---------- helpers ----------
function fromB64url(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; return Buffer.from(s,'base64'); }

// scrypt$N$r$p$saltB64url$hashB64url
function parseScrypt(str){
  const p = String(str).split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return null;
  const N = parseInt(p[1],10), r = parseInt(p[2],10), q = parseInt(p[3],10);
  const salt = fromB64url(p[4]), hash = fromB64url(p[5]);
  if (!N || !r || !q || !salt.length || !hash.length) return null;
  return { N, r, p: q, salt, hash };
}
const scryptAsync = (pwd, salt, len, opts) =>
  new Promise((ok, ko) => crypto.scrypt(pwd, salt, len, opts, (e,dk)=> e?ko(e):ok(dk)));

// pbkdf2$sha256$iterations$saltB64url$hashB64url
function parsePBKDF2(str){
  const p = String(str).split('$');
  if (p.length !== 5 || p[0] !== 'pbkdf2') return null;
  const algo = p[1]; if (algo !== 'sha256') return null;
  const iterations = parseInt(p[2],10);
  const salt = fromB64url(p[3]), hash = fromB64url(p[4]);
  if (!iterations || !salt.length || !hash.length) return null;
  return { iterations, salt, hash, digest: 'sha256' };
}
const pbkdf2Async = (pwd, salt, iter, len, digest) =>
  new Promise((ok, ko) => crypto.pbkdf2(pwd, salt, iter, len, digest, (e,dk)=> e?ko(e):ok(dk)));

// ---------- handler ----------
export default async function handler(req, res){
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const JWT_SECRET = process.env.JWT_SECRET || '';
  const PASS_HASH  = process.env.ADMIN_PASS_HASH || '';
  if (!JWT_SECRET || !PASS_HASH) return res.status(500).json({ ok:false, error:'Missing env' });

  let password = '';
  try { password = (typeof req.body==='string' ? JSON.parse(req.body) : (req.body||{})).password || ''; } catch {}

  try {
    if (PASS_HASH.startsWith('scrypt$')) {
      const cfg = parseScrypt(PASS_HASH);
      if (!cfg) throw new Error('Bad scrypt hash');
      const dk = await scryptAsync(password, cfg.salt, cfg.hash.length, { N: cfg.N, r: cfg.r, p: cfg.p });
      if (!safeEqual(dk, cfg.hash)) return res.status(401).json({ ok:false, error:'Invalid credentials' });
    } else if (PASS_HASH.startsWith('pbkdf2$')) {
      const cfg = parsePBKDF2(PASS_HASH);
      if (!cfg) throw new Error('Bad pbkdf2 hash');
      const dk = await pbkdf2Async(password, cfg.salt, cfg.iterations, cfg.hash.length, cfg.digest);
      if (!safeEqual(dk, cfg.hash)) return res.status(401).json({ ok:false, error:'Invalid credentials' });
    } else {
      return res.status(500).json({ ok:false, error:'Unknown ADMIN_PASS_HASH format' });
    }
  } catch (e) {
    return res.status(401).json({ ok:false, error:'Invalid credentials' });
  }

  const token = signJWT({ sub:'admin' }, JWT_SECRET, 60*60*24*7); // 7 hari
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `adm_session=${token}; Path=/; HttpOnly; SameSite=Lax; ${isProd?'Secure;':''} Max-Age=${60*60*24*7}`);
  return res.status(200).json({ ok:true });
}
