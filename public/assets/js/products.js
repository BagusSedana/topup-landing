(() => {
  const el = (sel, r=document) => r.querySelector(sel);
  const grid = el('#catalog');
  const input = el('#search');

  // Source data — gabungan ringkas
  const ITEMS = [
    // Games (link ke product.html)
    { type:'Game', slug:'ml',   name:'Mobile Legends',  img:'https://i.imgur.com/3zQnXwq.png', href:'/product.html?game=ml' },
    { type:'Game', slug:'ff',   name:'Free Fire',       img:'https://i.imgur.com/2fVtQcx.png', href:'/product.html?game=ff' },
    { type:'Game', slug:'pubg', name:'PUBG Mobile',     img:'https://i.imgur.com/rgYt9FQ.png', href:'/product.html?game=pubg' },
    // E‑wallet
    { type:'E‑wallet', name:'GoPay',    img:'https://i.imgur.com/EQG6l8V.png' },
    { type:'E‑wallet', name:'OVO',      img:'https://i.imgur.com/aWQj6zV.png' },
    { type:'E‑wallet', name:'DANA',     img:'https://i.imgur.com/6bqQbHi.png' },
    // Pulsa/Data
    { type:'Pulsa', name:'Telkomsel', img:'https://i.imgur.com/2lj2tmy.png' },
    { type:'Pulsa', name:'Indosat',   img:'https://i.imgur.com/0eG9KQ0.png' },
    // Apps/Voucher
    { type:'Aplikasi', name:'Google Play', img:'https://i.imgur.com/pj9gG3b.png' },
    { type:'Aplikasi', name:'Steam Wallet', img:'https://i.imgur.com/3h3sVvD.png' }
  ];

  function card(item){
    const disabled = item.href ? '' : 'disabled';
    const tag = `<span class="badge bg-light text-dark border">${item.type}</span>`;
    const btnText = item.href ? 'Lihat' : 'Segera Hadir';
    const linkAttrs = item.href ? `href="${item.href}"` : 'href="#" tabindex="-1" aria-disabled="true"';
    return `<div class="col">
      <div class="card h-100 border-0 shadow-sm rounded-4">
        <img src="${item.img}" class="card-img-top" alt="${item.name}" onerror="this.style.display='none'">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <div class="fw-semibold">${item.name}</div>
            ${tag}
          </div>
          <div class="mt-auto">
            <a ${linkAttrs} class="btn btn-primary w-100 ${disabled}">${btnText}</a>
          </div>
        </div>
      </div>
    </div>`;
  }

  function render(list){
    grid.innerHTML = list.map(card).join('');
  }

  function filter(q){
    q = (q||'').toLowerCase().trim();
    if (!q) return ITEMS;
    return ITEMS.filter(it => [it.name, it.type, it.slug||''].join(' ').toLowerCase().includes(q));
  }

  render(ITEMS);
  input?.addEventListener('input', () => render(filter(input.value)));
})();