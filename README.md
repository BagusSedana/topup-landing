# TopUp Landing — Bootstrap + Apps Script

Satu halaman landing untuk jualan topup (bayar ke kamu dulu), lalu kamu proses di TopUpGim akun agent.

## Struktur Folder
```
topup-landing/
├─ index.html
├─ assets/
│  ├─ css/style.css
│  ├─ js/prices.js   ← daftar produk & harga (edit di sini)
│  ├─ js/app.js      ← logic UI & submit order
│  └─ img/{logo.svg, hero.webp, qris.png}
└─ server/
   └─ gapps_script.gs ← backend Google Apps Script
```

## Setup Cepat
1. **Edit harga & produk:** `assets/js/prices.js` (sesuaikan margin kamu).
2. **QRIS:** ganti `assets/img/qris.png` dengan QRIS statis kamu.
3. **Apps Script:**
   - Buat Google Sheet baru (nama bebas). 
   - Buat folder di Google Drive untuk simpan bukti; copy **folder ID**.
   - Buka script editor (Extensions → Apps Script), paste `server/gapps_script.gs`.
   - Isi `DRIVE_FOLDER_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
   - Deploy: *Deploy → New deployment → Web app → Anyone with the link* → copy URL.
4. **Frontend:** buka `assets/js/app.js`, ganti `YOUR_APPS_SCRIPT_URL` dengan URL web app di atas.
5. **Hosting:**
   - Static hosting apa saja (Vercel/Netlify/GitHub Pages). Cukup upload folder ini.
   - Tidak perlu server PHP kalau pakai Apps Script.

## Alur Order
1. User pilih game/nominal → isi Player ID & WA.
2. Bayar QRIS.
3. Upload bukti → data terkirim ke Apps Script.
4. Kamu dapat notif Telegram + link bukti. Beli di TopUpGim (akun agent).
5. Update status di Sheet (opsional buat kolom STATUS).

## Anti-Manipulasi
- Harga **tidak** diambil dari client: backend hitung ulang dari whitelist (`PRICES` di `gapps_script.gs`).
- Only allow selected `item_key`/`game` yang ada di whitelist.
- (Opsional) Restrict CORS origin di `CONFIG.CORS`.

## UX Notes
- Bootstrap 5.3, komponen validasi, modal pembayaran, kartu nominal (klik enak).
- Responsif: grid 2 kolom di mobile, 3 kolom di desktop.
- WhatsApp deep-link otomatis setelah submit.

## Kustomisasi
- Ganti hero image (`assets/img/hero.webp`), brand (`logo.svg`), dan teks copywriting di `index.html`.
- Tambah game baru dengan menambahkan entri di `PRICES` pada `assets/js/prices.js` dan backend.

Happy selling! 🚀
