/** ===========================
 *  Topup Landing — Apps Script (FINAL)
 *  - Simpan order ke Google Sheets (sheet aktif)
 *  - Upload bukti ke Google Drive (public link)
 *  - Notif Telegram (opsional)
 *  - RESPONSE JSON sederhana (tanpa setHeaders / setResponseCode)
 *  - Deploy: Deploy → Web app → Execute as: Me, Who has access: Anyone → copy URL /exec
 * =========================== */

const CONFIG = {
  SHEET_NAME: 'topup',                             // nama sheet
  DRIVE_FOLDER_ID: '1J8k79ZJt3TDQMWfrx7wWTKD4hO-FX0-6',        // <-- ganti (ID folder Drive)
  TELEGRAM_BOT_TOKEN: '8484631013:AAE3rENVZD7HcUB4OMEKz9ZNAHQ1pZknGyE',  // <-- boleh '' kalau tidak pakai notif
  TELEGRAM_CHAT_ID: '5195375657',      // <-- boleh ''
  PRICES: {                                        // whitelist harga (server-side)
    ML: {
      key: 'Mobile Legends',
      topupgimUrl: 'https://topupgim.com/product/mobile-legends/1528378309',
      fastFee: 2000,
      items: {
        ml_86:   { label: '86 Diamonds',   price: 19500 },
        ml_172:  { label: '172 Diamonds',  price: 38500 },
        ml_257:  { label: '257 Diamonds',  price: 57000 },
        ml_344:  { label: '344 Diamonds',  price: 76000 },
        ml_429:  { label: '429 Diamonds',  price: 95000 },
        ml_514:  { label: '514 Diamonds',  price: 114000 },
        ml_706:  { label: '706 Diamonds',  price: 152000 },
        ml_878:  { label: '878 Diamonds',  price: 190000 },
        ml_1412: { label: '1412 Diamonds', price: 285000 }
      }
    },
    FF: {
      key: 'Free Fire',
      topupgimUrl: 'https://topupgim.com/product/free-fire/1712139843',
      fastFee: 1500,
      items: {
        ff_70:  { label: '70 Diamonds',  price: 9500 },
        ff_140: { label: '140 Diamonds', price: 19000 }
      }
    },
    PUBG: {
      key: 'PUBG Mobile',
      topupgimUrl: 'https://topupgim.com/product/pubgm/1712139843',
      fastFee: 2500,
      items: {
        pb_60:  { label: '60 UC',  price: 14000 },
        pb_325: { label: '325 UC', price: 65000 }
      }
    }
  }
};

// ---------- Helpers ----------
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow([
      'Timestamp','Order ID','Game','Item','PlayerID','ServerID',
      'WhatsApp','Fast','Total','Status','BuktiURL','Note'
    ]);
  }
  return sh;
}

// ---------- HTTP Handlers ----------
function doGet(e) { return json({ ok: true }); }
// Apps Script jarang dipanggil OPTIONS, tapi kalaupun iya, balikin teks kosong
function doOptions(e) { return ContentService.createTextOutput(''); }

function doPost(e) {
  try {
    const raw = (e.postData && e.postData.contents) || '{}';
    const data = JSON.parse(raw);

    // validate minimal
    if (!data.game || !data.item_key || !data.player_id || !data.whatsapp || !data.bukti) {
      return json({ error: 'Bad request: missing fields' });
    }

    // whitelist harga
    const game = CONFIG.PRICES[data.game];
    if (!game) return json({ error: 'Game not found' });
    const item = game.items[data.item_key];
    if (!item) return json({ error: 'Item not found' });

    // total dari server (bukan dari client)
    let total = item.price;
    if (data.fast) total += (game.fastFee || 0);

    // simpan bukti ke Drive
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const match = String(data.bukti).match(/^data:(.+);base64,(.+)$/);
    if (!match) return json({ error: 'Invalid proof format' });
    const contentType = match[1] || 'image/png';
    const bytes = Utilities.base64Decode(match[2]);
    const file = folder.createFile(Utilities.newBlob(bytes, contentType, `bukti_${Date.now()}.png`));
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(_) {}
    const buktiUrl = file.getUrl();

    // tulis ke Sheet
    const sh = ensureSheet_(CONFIG.SHEET_NAME);
    const orderId = 'ORD-' + Date.now();
    sh.appendRow([
      new Date(), orderId, game.key, item.label,
      data.player_id, data.server_id || '',
      data.whatsapp, !!data.fast, total, 'PENDING', buktiUrl, data.note || ''
    ]);

    // notif Telegram (opsional)
    if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
      const text = [
        '🎮 *ORDER BARU*',
        `ID: *${orderId}*`,
        `Game: *${game.key}*`,
        `Nominal: *${item.label}*`,
        `Player: *${data.player_id}${data.server_id ? ' (' + data.server_id + ')' : ''}*`,
        `Fast: *${data.fast ? 'YA' : 'TIDAK'}*`,
        `Total: *Rp ${total.toLocaleString('id-ID')}*`,
        `[Bukti](${buktiUrl}) • [TopUpGim](${game.topupgimUrl})`
      ].join('\n');

      UrlFetchApp.fetch('https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage', {
        method: 'post',
        payload: { chat_id: CONFIG.TELEGRAM_CHAT_ID, text: text, parse_mode: 'Markdown' },
        muteHttpExceptions: true
      });
    }

    return json({ ok: true, order_id: orderId, total });
  } catch (err) {
    return json({ error: String(err) });
  }
}

// ---------- Manual test (jalankan sekali untuk authorize Drive) ----------
function testDrive() {
  const f = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  f.createFile('test.txt', 'ok');
}
