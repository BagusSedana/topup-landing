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
    { type:'Game', slug:'codm', name:'Call of Duty: Mobile', img:'https://i.imgur.com/E6oY8kF.png', href:'/product.html?game=codm' },
    { type:'Game', slug:'hok',  name:'Honor of Kings',  img:'https://i.imgur.com/Pk8g7lq.png', href:'/product.html?game=hok' },
    { type:'Game', slug:'gi',   name:'Genshin Impact',  img:'https://i.imgur.com/HDs1Y7n.png', href:'/product.html?game=gi' },
    { type:'Game', slug:'hsr',  name:'Honkai: Star Rail', img:'https://i.imgur.com/UR6ZfGf.png', href:'/product.html?game=hsr' },
    { type:'Game', slug:'valo', name:'VALORANT (Voucher)', img:'https://i.imgur.com/k2kB2zk.png', href:'/product.html?game=valorant' },
    { type:'Game', slug:'roblox', name:'Roblox Robux',  img:'https://i.imgur.com/s2aWj9j.png', href:'/product.html?game=roblox' },
    { type:'Voucher', slug:'steam', name:'Steam Wallet', img:'https://i.imgur.com/3h3sVvD.png', href:'/product.html?game=steam' },
    { type:'Voucher', slug:'google', name:'Google Play', img:'https://i.imgur.com/pj9gG3b.png', href:'/product.html?game=google' }
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