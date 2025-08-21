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
    detailsHtml: `
<div class="stack-16">
  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <div class="alert alert-primary rounded-4 mb-0"><b>Proses Instan.</b> Kirim cepat hitungan detik.</div>
  </div></section>

  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <h2 class="h5 mb-2">Top Up Mobile Legends (ML)</h2>
    <p><em>Delivery:</em> Instan • <em>Provider:</em> Moonton</p>
    <p>Beli Diamonds Mobile Legends lebih murah pakai kode promo, hemat hingga 39%. Top Up ML murah dan proses instan di TopUpGim, beli Weekly Diamond Pass hanya Rp26.900 dan top up 113 Diamonds hanya Rp30.600.</p>
    <h3 class="h6 mt-3">Kenapa Top Up ML di TopUpGim.com?</h3>
    <ul class="mb-0">
      <li><b>Lebih Murah.</b> Hemat hingga 39% &amp; tanpa biaya admin.</li>
      <li><b>Mudah &amp; Otomatis.</b> Tidak perlu kirim bukti pembayaran.</li>
      <li><b>Proses Instan.</b> Pengiriman hanya hitungan detik.</li>
    </ul>
  </div></section>

  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <h3 class="h6">Mobile Legends</h3>
    <p>Mobile Legends (ML) adalah permainan MOBA populer. Dua tim 5v5 bertarung menghancurkan base lawan dengan koordinasi dan strategi.</p>
    <ul class="mb-0">
      <li><b>Heroes:</b> Tank, Fighter, Assassin, Mage, Marksman, Support.</li>
      <li><b>Gameplay:</b> ~10–15 menit / match.</li>
      <li><b>Map:</b> Tiga lane + turret.</li>
      <li><b>Ranked:</b> Mode kompetitif untuk push rank.</li>
      <li><b>Skins:</b> Kostum & efek visual.</li>
    </ul>
  </div></section>

  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <h3 class="h6">Diamond Mobile Legends (ML)</h3>
    <p>Diamond adalah mata uang premium untuk beli skins, heroes, bundles, emote, hingga Starlight Membership.</p>
  </div></section>

  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <h3 class="h6">Cara Top Up Diamond Mobile Legends Termurah</h3>
    <ol class="mb-0">
      <li>Buka halaman <b>Top Up Mobile Legends</b> di TopUpGim.</li>
      <li>Masukkan <b>Player ID</b> dan <b>Server ID</b> (4 digit di belakang titik).</li>
      <li>Pilih nominal diamond.</li>
      <li>Pilih metode pembayaran (QRIS/e‑wallet/bank/kartu/minimarket/pulsa).</li>
      <li>Lakukan pembayaran dan tunggu beberapa detik.</li>
      <li>Diamond otomatis masuk ke akun.</li>
    </ol>
  </div></section>

  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <h3 class="h6">Metode Pembayaran</h3>
    <ul class="mb-0">
      <li>Transfer Bank</li>
      <li>E‑wallet (GoPay, OVO, DANA, LinkAja)</li>
      <li>Kartu Kredit/Debit</li>
      <li>Pulsa</li>
      <li>Minimarket</li>
      <li>QRIS</li>
    </ul>
  </div></section>

  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <h3 class="h6">Rekomendasi Top Up Game Lain</h3>
    <p>Free Fire, PUBG Mobile, CODM, Honor of Kings, Genshin Impact, Hago, Valorant, Blood Strike, Honkai: Star Rail.</p>
    <p class="mb-0">TopUpGim cepat, murah, praktis—langsung dari HP.</p>
  </div></section>
</div>
`
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
    detailsHtml: `
<div class="stack-16">
  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <div class="alert alert-primary rounded-4 mb-0"><b>Proses Instan.</b> Kirim cepat hitungan detik.</div>
  </div></section>
  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <h2 class="h5 mb-2">Top Up Free Fire (FF)</h2>
    <p>Diamond FF murah, proses instan, tanpa biaya admin. Masukkan Player ID, pilih nominal, bayar via QRIS/e‑wallet—item langsung masuk.</p>
  </div></section>
</div>
`
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
    detailsHtml: `
<div class="stack-16">
  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <div class="alert alert-primary rounded-4 mb-0"><b>Proses Instan.</b> Kirim cepat hitungan detik.</div>
  </div></section>
  <section class="card border-0 shadow-sm rounded-4 content-section"><div class="card-body">
    <h2 class="h5 mb-2">Top Up PUBG Mobile</h2>
    <p>Beli UC PUBG Mobile cepat & aman. Isi UID, pilih nominal UC, bayar, saldo otomatis terkirim.</p>
  </div></section>
</div>
`
  }
};
