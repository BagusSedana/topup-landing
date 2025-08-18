/** ===============================
 * Topup Landing — Apps Script (SECURE + FAST, 2-step)
 * - Rahasia via Script Properties (DRIVE_FOLDER_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, API_KEY)
 * - Step 1: create_order  -> respon instan (tanpa bukti)
 * - Step 2: upload_proof  -> upload bukti + update sheet + notif Telegram
 * Deploy: Web app → Execute as: Me, Access: Anyone → pakai URL /exec
 * =============================== */

const CFG = (() => {
  const P = PropertiesService.getScriptProperties();
  return {
    SHEET_NAME: 'topup',
    DRIVE_FOLDER_ID: P.getProperty('DRIVE_FOLDER_ID') || '',
    TELEGRAM_BOT_TOKEN: P.getProperty('TELEGRAM_BOT_TOKEN') || '',
    TELEGRAM_CHAT_ID: P.getProperty('TELEGRAM_CHAT_ID') || '',
    API_KEY: P.getProperty('API_KEY') || '',
    PRICES: {
      ML: {
        key: 'Mobile Legends',
        topupgimUrl: 'https://topupgim.com/product/mobile-legends/1528378309',
        fastFee: 2000,
        items: {
          ml_86:{label:'86 Diamonds',price:19500}, ml_172:{label:'172 Diamonds',price:38500},
          ml_257:{label:'257 Diamonds',price:57000}, ml_344:{label:'344 Diamonds',price:76000},
          ml_429:{label:'429 Diamonds',price:95000},  ml_514:{label:'514 Diamonds',price:114000},
          ml_706:{label:'706 Diamonds',price:152000},  ml_878:{label:'878 Diamonds',price:190000},
          ml_1412:{label:'1412 Diamonds',price:285000}
        }
      },
      FF:   { key:'Free Fire', topupgimUrl:'https://topupgim.com/product/free-fire/1712139843', fastFee:1500,
              items:{ ff_70:{label:'70 Diamonds',price:9500}, ff_140:{label:'140 Diamonds',price:19000} } },
      PUBG: { key:'PUBG Mobile', topupgimUrl:'https://topupgim.com/product/pubgm/1712139843', fastFee:2500,
              items:{ pb_60:{label:'60 UC',price:14000}, pb_325:{label:'325 UC',price:65000} } }
    }
  };
})();

// ---------- helpers ----------
const J = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const rp = (n) => 'Rp ' + Number(n||0).toLocaleString('id-ID');

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CFG.SHEET_NAME) || ss.insertSheet(CFG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp','Order ID','Game','Item','PlayerID','ServerID','WhatsApp','Fast','Total','Status','BuktiURL','Note','Origin']);
  }
  return sh;
}
function findRow_(sh, orderId){
  const last = sh.getLastRow(); if (last<2) return null;
  const vs = sh.getRange(2,1,last-1,13).getValues();
  for (let i=0;i<vs.length;i++){ if (String(vs[i][1])===String(orderId)) return {row:i+2,data:vs[i]}; }
  return null;
}

// ---------- HTTP ----------
function doGet(){ return J({ok:true}); }
function doOptions(){ return ContentService.createTextOutput(''); }

function doPost(e){
  try{
    const data = JSON.parse((e.postData && e.postData.contents) || '{}');

    // API key gate
    if (!CFG.API_KEY || data.api_key !== CFG.API_KEY) return J({ error:'Unauthorized' });

    const action = (data.action || 'create_order').toLowerCase();
    if (action === 'create_order')  return createOrder_(data);
    if (action === 'upload_proof')  return uploadProof_(data);
    if (action === 'update_status') return updateStatus_(data);
    return J({ error:'Unknown action' });
  }catch(err){ return J({ error:String(err) }); }
}

// ---- Step 1: buat order (tanpa bukti) ----
function createOrder_(d){
  if (!d.game || !d.item_key || !d.player_id || !d.whatsapp)
    return J({ error:'Bad request: missing fields' });

  // Validasi dasar
  if (!/^62\d{7,15}$/.test(String(d.whatsapp))) return J({ error:'WA invalid (pakai 62...)' });
  if (!/^\d{4,}$/.test(String(d.player_id)))     return J({ error:'Player ID invalid' });

  const game = CFG.PRICES[d.game]; if (!game) return J({ error:'Game not found' });
  const it   = game.items[d.item_key]; if (!it) return J({ error:'Item not found' });

  const total = it.price + (d.fast ? (game.fastFee||0) : 0);
  const orderId = 'ORD-' + Date.now();

  // rate-limit idempoten singkat: WA + item sama <15s -> balikin yang lama
  const sh = sheet_(); const last = sh.getLastRow();
  if (last>=2){
    const vs = sh.getRange(Math.max(2,last-10),1,Math.min(10,last-1),13).getValues();
    const now = Date.now();
    for (let i=0;i<vs.length;i++){
      const [ts,,g,item,, ,wa] = vs[i];
      if (String(wa)===String(d.whatsapp) && String(g)===String(game.key) && String(item)===String(it.label)){
        if (now - new Date(ts).getTime() < 15000) return J({ ok:true, order_id:'ORD-'+new Date(ts).getTime(), total, duplicate:true });
      }
    }
  }

  sh.appendRow([ new Date(), orderId, game.key, it.label, d.player_id, d.server_id||'', d.whatsapp, !!d.fast, total, 'WAITING_PROOF', '', d.note||'', d.origin||'' ]);
  return J({ ok:true, order_id:orderId, total });
}

// ---- Step 2: upload bukti ----
function uploadProof_(d){
  if (!d.order_id || !d.bukti) return J({ error:'Missing order_id/bukti' });

  const sh = sheet_();
  const found = findRow_(sh, d.order_id);
  if (!found) return J({ error:'Order not found' });

  // validasi dataURL & ukuran ≤ 3MB
  const m = String(d.bukti).match(/^data:(.+);base64,(.+)$/);
  if (!m) return J({ error:'Invalid proof format' });
  const ct = m[1];
  if (!/^image\//.test(ct)) return J({ error:'Only image allowed' });
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 3 * 1024 * 1024) return J({ error:'Proof too large (>3MB)' });

  // upload ke Drive
  const folder = DriveApp.getFolderById(CFG.DRIVE_FOLDER_ID);
  const file = folder.createFile(Utilities.newBlob(bytes, ct, `bukti_${Date.now()}.jpg`));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
  const buktiUrl = file.getUrl();

  // update sheet
  sh.getRange(found.row, 11).setValue(buktiUrl);   // K: BuktiURL
  sh.getRange(found.row, 10).setValue('PENDING');  // J: Status

  // === Telegram notif (opsional) ===
  if (CFG.TELEGRAM_BOT_TOKEN && CFG.TELEGRAM_CHAT_ID) {
    const v = sh.getRange(found.row, 1, 1, 13).getValues()[0];
    const orderId = v[1];
    const game    = v[2];
    const item    = v[3];
    const pid     = v[4];
    const sid     = v[5];

    // H = Fast, I = Total  ✅
    const fastRaw  = v[7];
    const totalRaw = v[8];

    // normalisasi boolean & angka (kalau kolom I kebetulan format text/“Rp …”)
    const fast = (fastRaw === true) || String(fastRaw).toLowerCase() === 'true' || fastRaw === 1 || String(fastRaw) === '1';
    let total  = (typeof totalRaw === 'number') ? totalRaw
                 : Number(String(totalRaw).replace(/[^\d.-]/g, '') || 0);

    // fallback (super aman) hitung ulang dari whitelist kalau angka masih gagal
    if (!total || isNaN(total)) {
      const G = CFG.PRICES[d.game] || Object.values(CFG.PRICES).find(p => p.key === game);
      if (G) {
        const key = Object.keys(G.items).find(k => G.items[k].label === item);
        if (key) total = (G.items[key].price || 0) + (fast ? (G.fastFee || 0) : 0);
      }
    }

    const text = [
      '🎮 <b>ORDER BARU</b>',
      `ID: <b>${orderId}</b>`,
      `Game: <b>${game}</b>`,
      `Nominal: <b>${item}</b>`,
      `Player: <b>${pid}${sid ? ' (' + sid + ')' : ''}</b>`,
      `Fast: <b>${fast ? 'YA' : 'TIDAK'}</b>`,
      `Total: <b>${rp(total)}</b>`,
      `<a href="${buktiUrl}">Bukti</a>`
    ].join('\n');

    UrlFetchApp.fetch('https://api.telegram.org/bot' + CFG.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'post',
      payload: {
        chat_id: CFG.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      },
      muteHttpExceptions: true
    });
  }

  return J({ ok:true });
}



// ---- Admin: update status ----
function updateStatus_(d){
  if (!d.order_id || !d.status) return J({ error:'Missing order_id/status' });
  const sh = sheet_(); const found = findRow_(sh, d.order_id); if (!found) return J({ error:'Order not found' });
  sh.getRange(found.row, 10).setValue(String(d.status).toUpperCase()); // J: Status
  return J({ ok:true });
}

// Tools
function testDrive(){ DriveApp.getFolderById(CFG.DRIVE_FOLDER_ID).createFile('ok.txt','ok'); }
function debugProps(){ Logger.log(PropertiesService.getScriptProperties().getProperties()); }
