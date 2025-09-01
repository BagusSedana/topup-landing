/* global GAMES */
(() => {
  // ready shim
  const ready = (fn) =>
    (document.readyState !== 'loading')
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);

  // util
  const badge = (t, cls='badge-soft') => `<span class="badge rounded-pill ${cls}">${t}</span>`;
  function ensureMount(id, cls = '') {
    let el = document.getElementById(id);
    if (el) return el;
    const host = document.querySelector('main') || document.querySelector('.container') || document.body;
    el = document.createElement('div'); el.id = id; if (cls) el.className = cls; host.appendChild(el);
    console.warn(`[home] #${id} auto-created`);
    return el;
  }

  // Data dummy (non-game). Bebas ganti.
  const TRENDING = [
    { name:'DANA', img:'https://i.imgur.com/6wABv0k.png' },
    { name:'ZEPETO', img:'https://i.imgur.com/fC1m5w1.png' },
    { name:'Point Blank', img:'https://i.imgur.com/7gqQe9i.png' },
    { name:'Genshin Impact', img:'/assets/img/genshin.jpg' },
    { name:'Call of Duty', img:'/assets/img/codm.jpg' },
    { name:'Valorant', img:'/assets/img/valorant.jpg' },
    { name:'Bigo Live', img:'/assets/img/hrs.jpg' },
    { name:'Garena Undawn', img:'https://i.imgur.com/7sp5jww.png' }
  ];
  const DAILY = [
    { name:'E-Wallet', img:'https://cdn.topupgim.com/shortcut-tiles/f09f49b0-e31a-4bc1-aaef-9014df77149a.png' },
    { name:'Pulsa', img:'https://i.imgur.com/DQq0EoV.png' },
    { name:'Token PLN', img:'https://i.imgur.com/yFv3VVM.png' },
    { name:'Paket Internet', img:'https://i.imgur.com/8k3u6mP.png' },
    { name:'Masa Aktif', img:'https://i.imgur.com/0io2c4X.png' },
    { name:'SMS & Telpon', img:'https://i.imgur.com/Ym5Yq7p.png' }
  ];
  const WALLETS = [
    { name:'ShopeePay', img:'https://i.imgur.com/b1vR1ga.png' },
    { name:'DANA',      img:'https://i.imgur.com/6wABv0k.png' },
    { name:'GoPay',     img:'https://i.imgur.com/6K8f4Ld.png' },
    { name:'OVO',       img:'https://i.imgur.com/M6H8r0U.png' },
    { name:'Maxim',     img:'https://i.imgur.com/TM7B8TS.png' },
    { name:'GrabPay',   img:'https://i.imgur.com/fx2Erk5.png' }
  ];
  const PULSA = [
    { name:'Telkomsel', img:'https://i.imgur.com/m8p8GgM.png' },
    { name:'Indosat',   img:'https://i.imgur.com/jhST5e3.png' },
    { name:'XL Axiata', img:'https://i.imgur.com/SXb9t8n.png' },
    { name:'AXIS',      img:'https://i.imgur.com/2K6xVQO.png' },
    { name:'Tri',       img:'https://i.imgur.com/Vn4mQk6.png' },
    { name:'Smartfren', img:'https://i.imgur.com/5lQeU6D.png' }
  ];
  const GAMECAT = [
    { name:'Call of Duty Mobile', img:'/assets/img/codm.jpg' },
    { name:'Genshin Impact',      img:'/assets/img/genshin.jpg' },
    { name:'HAGO',                img:'/assets/img/hago.jpg' },
    { name:'Honkai Impact 3',     img:'https://i.imgur.com/Tb91ZJH.png' },
    { name:'Free Fire',           img:'/assets/img/ff.jpg' },
    { name:'Nikke',               img:'https://i.imgur.com/t0oV0nO.png' },
    { name:'LoL: Wild Rift',      img:'https://i.imgur.com/0b0gqgM.png' }
  ];
  const APPS = [
    { name:'Google Play Voucher', img:'https://i.imgur.com/pj9gG3b.png' },
    { name:'Steam Wallet',        img:'https://i.imgur.com/3h3sVvD.png' },
    { name:'Vidio Voucher',       img:'https://i.imgur.com/6Jm9JmY.png' },
    { name:'Bigo Live',           img:'https://i.imgur.com/8Z0L1r2.png' },
    { name:'Bstation',            img:'https://i.imgur.com/7hQf1qU.png' },
    { name:'Mango Live',          img:'https://i.imgur.com/6x0jM4z.png' },
    { name:'Likee',               img:'https://i.imgur.com/8VwJ0jK.png' }
  ];
  const FALLBACK_GAMES = [
    { slug:'ml',    name:'Mobile Legends', cover:'/assets/img/ml.jpg', sold:'Terjual 10rb+', dis:'-15%', instan:true },
    { slug:'mcg',   name:'Magic Chess Go', cover:'/assets/img/magic chess.jpg', sold:'Terjual 6rb+',  dis:'-15%', instan:true },
    { slug:'ff',    name:'Free Fire',      cover:'/assets/img/ff.jpg', sold:'Terjual 10rb+', dis:'-20%', instan:true },
    { slug:'hok',   name:'Honor of Kings', cover:'/assets/img/ml.jpg', sold:'Terjual 10rb+', dis:'-20%', instan:true },
    { slug:'hago',  name:'HAGO',           cover:'/assets/img/hago.jpg', sold:'Terjual 10rb+', dis:'-15%', instan:true },
    { slug:'pubgm', name:'PUBGM Global',   cover:'/assets/img/pubgm.jpg', sold:'Terjual 10rb+', dis:'-10%', instan:true }
  ];

  function renderPopular(){
    const wrap = ensureMount('popularGrid', 'row g-3');
    const list = (window.GAMES
      ? Object.values(GAMES).map(g => ({
          slug:g.slug, name:g.name,
          cover:g.cover || g.img || '',
          sold:g.soldText || 'Terjual 10rb+',
          dis:g.discount || '',
          instan: g.instan !== false
        }))
      : FALLBACK_GAMES).slice(0,6);

    wrap.innerHTML = list.map(g => `
      <div class="col-6 col-md-4 col-lg-2">
        <a class="text-decoration-none" href="product.html?game=${g.slug}">
          <div class="card-game">
            <img class="thumb" src="${g.cover}" alt="${g.name}" loading="lazy">
            <div class="p-2">
              <div class="d-flex gap-1 mb-1">
                ${g.dis? badge(g.dis,'badge-dis'):''}
                ${g.instan? badge('Instan','badge-instant'):''}
              </div>
              <div class="fw-semibold small text-dark">${g.name}</div>
            </div>
            <div class="px-2 pb-2 foot"><i class="bi bi-bag-check me-1"></i>${g.sold}</div>
          </div>
        </a>
      </div>
    `).join('');
  }

  
  // map display name -> product slug (for deep link)
  const SLUG = {
    'DANA':'dana','GOPAY':'gopay','OVO':'ovo','SHOPEEPAY':'shopeepay','MAXIM':'maxim','GRABPAY':'grabpay',
    'TELKOMSEL':'tsel','INDOSAT':'im3','INDOSAT IM3':'im3','XL AXIATA':'xl','AXIS':'axis','TRI':'tri','SMARTFREN':'smartfren',
    'MOBILE LEGENDS':'ml','FREE FIRE':'ff','PUBG MOBILE':'pubg','CALL OF DUTY':'codm','CALL OF DUTY MOBILE':'codm',
    'GENSHIN IMPACT':'gi','HONKAI IMPACT 3':'hi3','HONOR OF KINGS':'hok','HAGO':'hago','VALORANT':'valorant',
    'STEAM WALLET':'steam','GOOGLE PLAY VOUCHER':'google','GOOGLE PLAY':'google','VIDIO VOUCHER':'vidio'
  };
  function hrefFor(name){
    const key = String(name||'').trim().toUpperCase();
    if (SLUG[key]) return '/product.html?game=' + SLUG[key];
    return '/products.html?search=' + encodeURIComponent(name||'');
  }
function renderMiniGrid(arr, targetId){
    const el = ensureMount(targetId, 'row g-3');
    el.innerHTML = arr.map(x => `
      <div class="col-6 col-md-3 col-lg-2">
        <a href="${hrefFor(x.name)}" class="text-decoration-none">
          <div class="card-mini text-center p-3">
            <img src="${x.img}" alt="${x.name}" loading="lazy" style="width:54px;height:54px;object-fit:contain">
            <div class="mt-2 fw-semibold small text-dark">${x.name}</div>
            <div class="foot">Instan</div>
          </div>
        </a>
      </div>
    `).join('');
  }

  function renderChips(arr, targetId){
    const el = ensureMount(targetId, 'pb-1');
    el.innerHTML = arr.map(x => `
      <a href="${hrefFor(x.name)}" class="chip text-decoration-none">
        <img src="${x.img}" alt="${x.name}" style="width:24px;height:24px;object-fit:contain">
        <span class="fw-medium">${x.name}</span>
      </a>
    `).join('');
  }

  function init(){
    const y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear();
    renderPopular();
    renderMiniGrid(TRENDING, 'trendingGrid');
    renderMiniGrid(DAILY, 'dailyGrid');
    renderChips(WALLETS, 'walletChips');
    renderMiniGrid(PULSA, 'pulsaGrid');
    renderMiniGrid(GAMECAT, 'gameGrid');
    renderMiniGrid(APPS, 'appGrid');
    console.info('[home] loaded ✓');
  }

  ready(init);
})();
