// List harga: update sesuai harga agent + margin kamu
// Struktur: GAME_CODE -> { key: {label, price, fastFee} }
window.PRICES = {
  ML: {
    key: "Mobile Legends",
    topupgimUrl: "https://topupgim.com/product/mobile-legends/1528378309",
    items: {
      ml_86:   { label: "86 Diamonds",   price: 19500 },
      ml_172:  { label: "172 Diamonds",  price: 38500 },
      ml_257:  { label: "257 Diamonds",  price: 57000 },
      ml_344:  { label: "344 Diamonds",  price: 76000 },
      ml_429:  { label: "429 Diamonds",  price: 95000 },
      ml_514:  { label: "514 Diamonds",  price: 114000 },
      ml_706:  { label: "706 Diamonds",  price: 152000 },
      ml_878:  { label: "878 Diamonds",  price: 190000 },
      ml_1412: { label: "1412 Diamonds", price: 285000 }
    },
    fastFee: 2000
  },
  FF: {
    key: "Free Fire",
    topupgimUrl: "https://topupgim.com/product/free-fire/1712139843",
    items: {
      ff_70:  { label: "70 Diamonds",  price: 9500 },
      ff_140: { label: "140 Diamonds", price: 19000 },
      ff_210: { label: "210 Diamonds", price: 28000 },
      ff_280: { label: "280 Diamonds", price: 37500 },
      ff_355: { label: "355 Diamonds", price: 47000 }
    },
    fastFee: 1500
  },
  PUBG: {
    key: "PUBG Mobile",
    topupgimUrl: "https://topupgim.com/product/pubgm/1712139843",
    items: {
      pb_60:  { label: "60 UC", price: 14000 },
      pb_325: { label: "325 UC", price: 65000 },
      pb_660: { label: "660 UC", price: 130000 }
    },
    fastFee: 2500
  },
  GENSHIN: {
    key: "Genshin Impact",
    topupgimUrl: "https://topupgim.com/product/genshin-impact/1712139843",
    items: {
      gi_60:  { label: "60 Genesis", price: 15000 },
      gi_330: { label: "330 Genesis", price: 75000 },
      gi_1090:{ label: "1090 Genesis", price: 235000 }
    },
    fastFee: 3000
  }
};

// Game order to display
window.GAMES = ["ML", "FF", "PUBG", "GENSHIN"];
