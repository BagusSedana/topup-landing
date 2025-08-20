// /assets/js/data.js
window.GAMES = {
  ml: {
    key: 'ml',
    name: 'Mobile Legends',
    popular: true,
    fastFee: 2000,
    // Kolom dinamis yang dimunculkan untuk game ini
    fields: [
      { id:'playerId', label:'Player ID', placeholder:'contoh: 12345678', type:'text', pattern:'^[0-9]{1,20}$', help:'Gunakan angka tanpa tanda/pemisah.' },
      { id:'serverId', label:'Server ID', placeholder:'contoh: 1234', type:'text', pattern:'^[0-9]{1,5}$', help:'4 digit di belakang tanda (.). Ex: 12345678 (1234).' }
    ],
    howto: [
      'Buka profil di game ➝ salin Player ID. Untuk ML: angka murni tanpa tanda.',
      'Server ID adalah 4 digit di belakang tanda (.). Contoh 12345678 (1234).',
      'Pilih nominal diamonds, isi WA yang aktif, lalu bayar via QRIS.',
      'Tunggu ±1–3 menit. Kami proses otomatis lewat akun agent resmi.'
    ]
  },

  ff: {
    key: 'ff',
    name: 'Free Fire',
    popular: true,
    fastFee: 2000,
    fields: [
      { id:'playerId', label:'UID (Player ID)', placeholder:'contoh: 123456789', type:'text', pattern:'^[0-9]{6,20}$', help:'Cek di profil Free Fire kamu.' }
    ],
    howto: [
      'Salin UID dari profil Free Fire kamu.',
      'Pilih nominal diamond / membership sesuai kebutuhan.',
      'Isi WA aktif dan bayar. Proses instan, masuk lewat ID.',
      'Orderan selesai, resi dan status dikirim ke WhatsApp.'
    ]
  },

  pubg: {
    key: 'pubg',
    name: 'PUBG Mobile',
    popular: true,
    fastFee: 2000,
    fields: [
      { id:'playerId', label:'Character ID', placeholder:'contoh: 1234567890', type:'text', pattern:'^[0-9]{6,20}$', help:'Buka profil ➝ Character ID.' }
    ],
    howto: [
      'Buka profil PUBG ➝ salin Character ID.',
      'Pilih UC/Prime yang mau dibeli.',
      'Isi WA dan bayar. Kami top up via ID (bukan login).',
      'UC akan masuk, cek mail/Inbox di game.'
    ]
  },

  gi: {
    key: 'gi',
    name: 'Genshin Impact',
    popular: false,
    fastFee: 2000,
    fields: [
      { id:'playerId', label:'UID', placeholder:'contoh: 800123456', type:'text', pattern:'^[0-9]{6,10}$', help:'UID menentukan region (80/81 Asia).' }
    ],
    howto: [
      'Masukkan UID Genshin (80/81 = Asia).',
      'Pilih Genesis Crystal/Blessing.',
      'Bayar via QRIS. Tidak perlu login akun kamu.',
      'Top up diproses resmi, cek notifikasi dalam game.'
    ]
  }
};

// Nominal & harga contoh. Silakan sinkronkan dengan sheet/DB kamu.
window.PRICES = {
  ml: {
    note: 'Harga sudah termasuk margin kamu.',
    items: [
      { code:'ml_86',  label:'86 Diamonds',  price: 18000 },
      { code:'ml_172', label:'172 Diamonds', price: 35000 },
      { code:'ml_257', label:'257 Diamonds', price: 52000 },
      { code:'ml_344', label:'344 Diamonds', price: 69000 }
    ]
  },
  ff: {
    items: [
      { code:'ff_50',  label:'50 Diamonds',  price: 8000 },
      { code:'ff_100', label:'100 Diamonds', price: 15000 },
      { code:'ff_310', label:'310 Diamonds', price: 45000 }
    ]
  },
  pubg: {
    items: [
      { code:'pubg_60', label:'60 UC',   price: 15000 },
      { code:'pubg_300', label:'300 UC', price: 68000 },
      { code:'pubg_600', label:'600 UC', price: 129000 }
    ]
  },
  gi: {
    items: [
      { code:'gi_60', label:'60 Genesis Crystals', price: 13000 },
      { code:'gi_300', label:'300 Genesis Crystals', price: 62000 }
    ]
  }
};
