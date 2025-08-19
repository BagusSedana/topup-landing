import { allowCors } from '../_utils.js';
export default function handler(req,res){
  if(allowCors(req,res))return;
  const isProd=process.env.VERCEL_ENV==='production'||process.env.NODE_ENV==='production';
  res.setHeader('Set-Cookie',`adm_session=; Path=/; HttpOnly; SameSite=Lax; ${isProd?'Secure;':''} Max-Age=0`);
  res.status(200).json({ok:true});
}
