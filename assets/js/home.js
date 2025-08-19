/* global GAMES */
(() => {
  // ===== ready shim (jalan walau script di <head> & tanpa defer)
  const ready = (fn) =>
    (document.readyState !== 'loading')
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);

  // ===== util
  const $, $$ = (s, r = document) => r.querySelector(s);
  function ensureMount(id, cls = '') {
    let el = document.getElementById(id);
    if (el) return el;
    // taruh di <main> kalau ada, kalau nggak di .container, kalau nggak ya body
    const host = $('main') || $('.container') || document.body;
    el = document.createElement('div');
    el.id = id;
    if (cls) el.className = cls;
    host.appendChild(el);
    console.warn(`[home] #${id} belum ada → dibuat otomatis di ${host.tagName.toLowerCase()}`);
    return el;
  }
  const badge = (t, cls='badge-soft') => `<span class="badge rounded-pill ${cls}">${t}</span>`;

  // ===== dummy data (non-game) – silakan ganti
  const TRENDING = [
    { name:'DANA', img:'https://i.imgur.com/6wABv0k.png' },
    { name:'ZEPETO', img:'https://i.imgur.com/fC1m5w1.png' },
    { name:'Point Blank', img:'https://i.imgur.com/7gqQe9i.png' },
    { name:'Genshin Impact', img:'https://i.imgur.com/3fM4y7j.png' },
    { name:'Call of Duty', img:'https://i.imgur.com/2GjKxQ3.png' },
    { name:'Valorant', img:'https://i.imgur.com/0L9cR2P.png' },
    { name:'Bigo Live', img:'https://i.imgur.com/8Z0L1r2.png' },
    { name:'Garena Undawn', img:'https://i.imgur.com/7sp5jww.png' }
  ];
  const DAILY = [
    { name:'E-Wallet', img:'https://i.imgur.com/pj9gG3b.png' },
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
    { name:'Call of Duty Mobile', img:'https://i.imgur.com/2GjKxQ3.png' },
    { name:'Genshin Impact',      img:'https://i.imgur.com/3fM4y7j.png' },
    { name:'HAGO',                img:'https://i.imgur.com/gAKp1lH.png' },
    { name:'Honkai Impact 3',     img:'https://i.imgur.com/Tb91ZJH.png' },
    { name:'Free Fire',           img:'https://i.imgur.com/2fVtQcx.png' },
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
    { slug:'ml',    name:'Mobile Legends', cover:'https://i.imgur.com/3zQnXwq.png', sold:'Terjual 10rb+', dis:'-15%', instan:true },
    { slug:'mcg',   name:'Magic Chess Go', cover:'https://i.imgur.com/7p4x5ob.png', sold:'Terjual 6rb+',  dis:'-15%', instan:true },
    { slug:'ff',    name:'Free Fire',      cover:'https://i.imgur.com/2fVtQcx.png', sold:'Terjual 10rb+', dis:'-20%', instan:true },
    { slug:'hok',   name:'Honor of Kings', cover:'https://i.imgur.com/9aZgkQm.png', sold:'Terjual 10rb+', dis:'-20%', instan:true },
    { slug:'hago',  name:'HAGO',           cover:'https://i.imgur.com/gAKp1lH.png', sold:'Terjual 10rb+', dis:'-15%', instan:true },
    { slug:'pubgm', name:'PUBGM Global',   cover:'https://i.imgur.com/rgYt9FQ.png', sold:'Terjual 10rb+', dis:'-10%', instan:true }
  ];

  // ===== renderers
  function renderPopular(){
    const wrap = ensureMount('popularGrid', 'row g-3');
    const data = (window.GAMES
      ? Object.values(GAMES).map(g => ({
          slug:g.slug, name:g.name,
          cover:g.cover || g.img || '',
          sold:g.soldText || 'Terjual 10rb+',
          dis:g.discount || '',
          instan: g.instan !== false
        }))
      : FALLBACK_GAMES).slice(0, 6);

    wrap.innerHTML = data.map(g => `
      <div class="col-6 col-md-4 col-lg-2">
        <a class="text-decoration-none" href="product.html?game=${g.slug}">
          <div class="card-game">
            <img class="thumb" src="${g.cover}" alt="${g.name}" loading="lazy">
            <div class="p-2">
              <div class="d-flex gap-1 mb-1">
                ${g.dis ? badge(g.dis,'badge-dis') : ''}
                ${g.instan ? badge('Instan','badge-instant') : ''}
              </div>
              <div class="fw-semibold small text-dark">${g.name}</div>
            </div>
            <div class="px-2 pb-2 foot"><i class="bi bi-bag-check me-1"></i>${g.sold}</div>
          </div>
        </a>
      </div>
    `).join('');
  }

  function renderMiniGrid(arr, id){
    const el = ensureMount(id, 'row g-3');
    el.innerHTML = arr.map(x => `
      <div class="col-6 col-md-3 col-lg-2">
        <a href="#" class="text-decoration-none">
          <div class="card-mini text-center p-3">
            <img src="${x.img}" alt="${x.name}" loading="lazy" style="width:54px;height:54px;object-fit:contain">
            <div class="mt-2 fw-semibold small text-dark">${x.name}</div>
            <div class="foot">Instan</div>
          </div>
        </a>
      </div>
    `).join('');
  }

  function renderChips(arr, id){
    const el = ensureMount(id, 'h-scroll pb-1');
    el.innerHTML = arr.map(x => `
      <a href="#" class="chip text-decoration-none">
        <img src="${x.img}" alt="${x.name}" style="width:24px;height:24px;object-fit:contain">
        <span class="fw-medium">${x.name}</span>
      </a>
    `).join('');
  }

  function init(){
    // tahun footer (opsional)
    const y = $('#y'); if (y) y.textContent = new Date().getFullYear();

    // render
    try { renderPopular(); } catch (e) { console.error('[home] popular error', e); }
    try { renderMiniGrid(TRENDING, 'trendingGrid'); } catch (e) { console.error('[home] trending error', e); }
    try { renderMiniGrid(DAILY, 'dailyGrid'); } catch (e) { console.error('[home] harian error', e); }
    try { renderChips(WALLETS, 'walletChips'); } catch (e) { console.error('[home] wallet error', e); }
    try { renderMiniGrid(PULSA, 'pulsaGrid'); } catch (e) { console.error('[home] pulsa error', e); }
    try { renderMiniGrid(GAMECAT, 'gameGrid'); } catch (e) { console.error('[home] game cat error', e); }
    try { renderMiniGrid(APPS, 'appGrid'); } catch (e) { console.error('[home] app error', e); }

    console.info('[home] loaded ✓');
  }

  ready(init);
})();
