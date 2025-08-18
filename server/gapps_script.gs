/**
 * Google Apps Script — backend sederhana untuk menerima order
 * - Simpan ke Google Sheets
 * - Simpan bukti bayar ke Google Drive
 * - Hitung harga dari whitelist (hindari manipulasi client)
 * - Kirim notifikasi ke Telegram
 * Deploy: Publish > Deploy as web app (Anyone with the link)
 */

const CONFIG = {
  SHEET_NAME: 'Orders',
  DRIVE_FOLDER_ID: '1J8k79ZJt3TDQMWfrx7wWTKD4hO-FX0-6', // buat folder "Topup Orders" di Drive dan isi ID di sini
  TELEGRAM_BOT_TOKEN: '8484631013:AAE3rENVZD7HcUB4OMEKz9ZNAHQ1pZknGyE',
  TELEGRAM_CHAT_ID: '5195375657',
  CORS: ['*'], // isi origin domain kamu kalau mau restrict
  PRICES: {
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
    FF:  { key:'Free Fire', fastFee:1500, topupgimUrl:'https://topupgim.com/product/free-fire/1712139843', items:{ ff_70:{label:'70 Diamonds', price:9500}, ff_140:{label:'140 Diamonds', price:19000} } },
    PUBG:{ key:'PUBG Mobile', fastFee:2500, topupgimUrl:'https://topupgim.com/product/pubgm/1712139843', items:{ pb_60:{label:'60 UC', price:14000}, pb_325:{label:'325 UC', price:65000} } }
  }
};

function doOptions(e) { return buildResponse_(200, ''); }
function doGet(e) { return buildResponse_(200, JSON.stringify({ ok: true })); }

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    // Origin check (optional)
    if (CONFIG.CORS[0] !== '*' && data.origin && CONFIG.CORS.indexOf(data.origin) === -1) {
      return buildResponse_(403, JSON.stringify({ error: 'Origin not allowed' }));
    }

    // Validate payload
    if (!data.game || !data.item_key || !data.player_id || !data.whatsapp || !data.bukti) {
      return buildResponse_(400, JSON.stringify({ error: 'Bad request' }));
    }

    const game = CONFIG.PRICES[data.game];
    if (!game) return buildResponse_(400, JSON.stringify({ error: 'Game not found' }));

    const item = game.items[data.item_key];
    if (!item) return buildResponse_(400, JSON.stringify({ error: 'Item not found' }));

    let total = item.price;
    if (data.fast) total += (game.fastFee || 0);

    // Upload proof image to Drive
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const contentType = data.bukti.split(';')[0].split(':')[1] || 'image/png';
    const bytes = Utilities.base64Decode(data.bukti.split(',')[1]);
    const blob = Utilities.newBlob(bytes, contentType, `bukti_${Date.now()}.png`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const buktiUrl = file.getUrl();

    // Append to Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Order ID', 'Game', 'Item', 'PlayerID', 'ServerID', 'WhatsApp', 'Fast', 'Total', 'Status', 'BuktiURL', 'Note']);
    }
    const orderId = 'ORD-' + new Date().getTime();
    sheet.appendRow([new Date(), orderId, game.key, item.label, data.player_id, data.server_id || '', data.whatsapp, !!data.fast, total, 'PENDING', buktiUrl, data.note || '' ]);

    // Telegram notify
    const text = [
      '🎮 *ORDER BARU*',
      '',
      `ID: *${orderId}*`,
      `Game: *${game.key}*`,
      `Nominal: *${item.label}*`,
      `Player: *${data.player_id}${data.server_id ? ' ('+data.server_id+')' : ''}*`,
      `Fast: *${data.fast ? 'YA' : 'TIDAK'}*`,
      `Total: *Rp ${total.toLocaleString('id-ID')}*`,
      '',
      `[Bukti](${buktiUrl}) • [TopUpGim](${game.topupgimUrl})`
    ].join('\n');

    UrlFetchApp.fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'post',
      payload: {
        chat_id: CONFIG.TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
      },
      muteHttpExceptions: true
    });

    return buildResponse_(200, JSON.stringify({ ok: true, order_id: orderId, total }));
  } catch (err) {
    return buildResponse_(500, JSON.stringify({ error: String(err) }));
  }
}

function buildResponse_(code, body) {
  const headers = {
    'Access-Control-Allow-Origin': CONFIG.CORS[0] || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON).setHeaders(headers).setResponseCode(code);
}
