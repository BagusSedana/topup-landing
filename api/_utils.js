import crypto from 'crypto';

export function b64url(input){return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
export function signJWT(payload, secret, expSec=60*60*24*7){
  const now=Math.floor(Date.now()/1000),header={alg:'HS256',typ:'JWT'},body={iat:now,exp:now+expSec,...payload};
  const h=b64url(JSON.stringify(header)),p=b64url(JSON.stringify(body)),d=`${h}.${p}`;
  const s=crypto.createHmac('sha256',secret).update(d).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${d}.${s}`;
}
export function verifyJWT(token, secret){
  try{
    const [h,p,s]=token.split('.'); if(!h||!p||!s) return null;
    const d=`${h}.${p}`,ex=crypto.createHmac('sha256',secret).update(d).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    if(!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(ex))) return null;
    const payload=JSON.parse(Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString());
    if(payload.exp && Math.floor(Date.now()/1000)>payload.exp) return null;
    return payload;
  }catch{ return null; }
}
export function safeEqual(a,b){const A=Buffer.from(String(a)),B=Buffer.from(String(b)); if(A.length!==B.length)return false; return crypto.timingSafeEqual(A,B);}
export function allowCors(req,res){
  const origin=req.headers.origin||'', allow=process.env.ALLOWED_ORIGINS;
  if(allow && allow.split(',').map(s=>s.trim()).includes(origin)){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Credentials','true');
  }
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST,GET,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Requested-With');res.status(200).end();return true;}
  return false;
}
