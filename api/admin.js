import { verifyJWT, allowCors } from './_utils.js';

export default async function handler(req,res){
  if(allowCors(req,res))return;
  if(req.method!=='POST') return res.status(405).end('Method Not Allowed');

  // cek session
  const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')));
  const token=cookies['adm_session']; const jwt=token?verifyJWT(token,process.env.JWT_SECRET||''):null;
  if(!jwt) return res.status(401).json({ok:false,error:'Not authenticated'});

  const {BACKEND_URL,API_KEY,ADMIN_KEY}=process.env;
  if(!BACKEND_URL||!API_KEY||!ADMIN_KEY) return res.status(500).json({ok:false,error:'Missing env'});

  let body={}; try{ body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});}catch{}
  const payload={...body, api_key:API_KEY, admin_key:ADMIN_KEY};

  const r=await fetch(BACKEND_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
  const text=await r.text(); res.status(r.status).send(text);
}
