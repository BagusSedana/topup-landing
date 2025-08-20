// /assets/js/data.js
window.GAMES = {
  ml: {
    key: 'ml',
    name: 'Mobile Legends',
    popular: true,
    fastFee: 2000,
    fields: [
      { id:'playerId', label:'Player ID', placeholder:'contoh: 12345678', type:'text', pattern:'^[0-9]{1,20}$', help:'Gunakan angka tanpa tanda/pemisah.' },
      { id:'serverId', label:'Server ID', placeholder:'contoh: 1234', type:'text', pattern:'^[0-9]{1,6}$', help:'4 digit di belakang tanda (.). Contoh: 12345678 (1234).' }
    ],
    howto: [
      'Buka profil di game ➝ salin Player ID. Untuk ML: angka murni tanpa tanda.',
      'Server ID adalah 4 digit di belakang tanda (.). Contoh 12345678 (1234).',
      'Pilih nominal diamonds, isi WA yang aktif, lalu bayar via QRIS.'
    ],
    detailsHtml: `<div class="stack-16"><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><div class="alert alert-primary rounded-4 mb-0"><b>Proses Instan.</b> Kirim cepat hitungan detik.</div></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h2 class='h5 mb-2'>Top Up Mobile Legends (ML)</h2><p><em>Delivery:</em> Instan • <em>Provider:</em> Moonton</p><p><b>Hemat sampai 39%.</b> Promo rutin & tanpa biaya admin. WDP mulai Rp26.900, 113 Diamonds mulai Rp30.600.</p></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h3 class='h6'>Kenapa TopUp di TopUpGim?</h3><ul class='mb-0'><li><b>Mudah & Otomatis</b> — tanpa kirim bukti bayar.</li><li><b>Resmi & Aman</b> — metode lokal & QRIS.</li><li><b>Instan</b> — masuk dalam hitungan detik.</li></ul></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h3 class='h6'>Tentang Game</h3><p>MOBA 5v5 dengan ratusan hero. Cocok buat push rank bareng tim.</p></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h3 class='h6'>Cara Top Up</h3><ol class='mb-0'><li>Masukkan <b>Player ID</b> & <b>Server ID</b>.</li><li>Pilih nominal diamonds.</li><li>Pilih pembayaran (QRIS/e‑wallet/bank/kartu/minimarket/pulsa).</li><li>Bayar & tunggu beberapa detik.</li></ol></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h3 class='h6'>Metode Pembayaran</h3><p>QRIS, GoPay, OVO, DANA, LinkAja, Transfer Bank, Kartu, Minimarket, Pulsa.</p></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h3 class='h6'>Rekomendasi Lain</h3><p>FF, PUBG, CODM, HOK, Genshin, HSR, Valorant, Robux, Steam, Google Play.</p></div></section></div>`
  },
  ff: {
    key: 'ff',
    name: 'Free Fire',
    popular: true,
    fastFee: 2000,
    fields: [
      { id:'playerId', label:'Player ID', placeholder:'contoh: 123456789', type:'text', pattern:'^[0-9]{4,}$' }
    ],
    howto: [
      'Masukkan Player ID.',
      'Pilih jumlah Diamonds.',
      'Bayar via QRIS/e‑wallet—instan.'
    ],
    detailsHtml: `<div class="stack-16"><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><div class="alert alert-primary rounded-4 mb-0"><b>Proses Instan.</b> Kirim cepat hitungan detik.</div></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h2 class='h5 mb-2'>Top Up Free Fire (FF)</h2><p><b>Diamonds FF</b> murah & langsung masuk. Tanpa biaya admin. Aman via QRIS.</p></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h3 class='h6'>Cara Top Up</h3><ol class='mb-0'><li>Masukkan <b>Player ID</b>.</li><li>Pilih nominal.</li><li>Bayar & tunggu item terkirim.</li></ol></div></section></div>`
  },
  pubg: {
    key: 'pubg',
    name: 'PUBG Mobile',
    popular: true,
    fastFee: 2000,
    fields: [
      { id:'playerId', label:'UID', placeholder:'contoh: 5123456789', type:'text', pattern:'^[0-9]{5,}$' }
    ],
    howto: [
      'Masukkan UID PUBG.',
      'Pilih jumlah UC.',
      'Bayar via QRIS—saldo otomatis masuk.'
    ],
    detailsHtml: `<div class="stack-16"><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><div class="alert alert-primary rounded-4 mb-0"><b>Proses Instan.</b> Kirim cepat hitungan detik.</div></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h2 class='h5 mb-2'>Top Up PUBG Mobile (UC)</h2><p>Beli <b>UC</b> cepat, aman, & resmi. Auto masuk setelah pembayaran.</p></div></section><section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body"><h3 class='h6'>Cara Top Up</h3><ol class='mb-0'><li>Masukkan <b>UID</b>.</li><li>Pilih nominal UC.</li><li>Bayar via QRIS/e‑wallet/bank.</li></ol></div></section></div>`
  }
};
