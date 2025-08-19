<script>
(() => {
  // ----- DATA DEMO: ganti sesuai kebutuhanmu -----
  const CATALOG = {
    game: [
      { id:'ml',    title:'Mobile Legends', img:'https://i.imgur.com/0H1xWfF.jpeg', tags:['Instan'], deal:'-15%', gameCode:'ML' },
      { id:'mc',    title:'Magic Chess Go Go', img:'https://i.imgur.com/tO1uKX6.jpeg', tags:['Instan'], deal:'-15%', gameCode:'ML' },
      { id:'ff',    title:'Free Fire', img:'https://i.imgur.com/1MfQ2uV.jpeg', tags:['Instan'], deal:'-20%', gameCode:'FF' },
      { id:'hok',   title:'Honor of Kings', img:'https://i.imgur.com/4sQeJ1P.jpeg', tags:['Instan'], deal:'-20%' },
      { id:'hago',  title:'HAGO', img:'https://i.imgur.com/9M9i83m.jpeg', tags:['Instan'] },
      { id:'pubgm', title:'PUBGM Global', img:'https://i.imgur.com/8s8m2xJ.jpeg', tags:['Instan'], deal:'-10%', gameCode:'PUBG' }
    ],
    ewallet: [
      { id:'dana',  title:'DANA', img:'https://i.imgur.com/0e2D0jX.png', tags:['Instan'] },
      { id:'ovo',   title:'OVO',  img:'https://i.imgur.com/7p0x8mQ.png', tags:['Instan'] },
      { id:'gopay', title:'GoPay',img:'https://i.imgur.com/5vN5yFT.png', tags:['Instan'] },
      { id:'shopee',title:'ShopeePay', img:'https://i.imgur.com/Ss2yqJ4.png', tags:['Instan'] }
    ],
    pulsa: [
      { id:'tsel', title:'Telkomsel', img:'https://i.imgur.com/7b0Z3a0.png', tags:['Instan'] },
      { id:'xl',   title:'XL/Axis',   img:'https://i.imgur.com/fyKcJq6.png', tags:['Instan'] },
      { id:'is',   title:'Indosat',   img:'https://i.imgur.com/1M8ePg3.png', tags:['Instan'] },
      { id:'tri',  title:'Tri',       img:'https://i.imgur.com/a0Q9L2K.png', tags:['Instan'] }
    ],
    apps: [
      { id:'spotify', title:'Spotify Premium', img:'https://i.imgur.com/3PSbXfU.jpeg', tags:['Resmi'] },
      { id:'ytp',     title:'YouTube Premium', img:'https://i.imgur.com/s1n3yqK.jpeg', tags:['Resmi'] },
      { id:'viet',    title:'Viu',             img:'https://i.imgur.com/6S9Y0fN.jpeg', tags:['Instan'] }
    ]
  };
  // -----------------------------------------------

  const titleMap = {game:'Game Populer', ewallet:'E-Wallet', pulsa:'Pulsa', apps:'Aplikasi'};
  const grid = document.getElementById('catGrid');
  const countEl = document.getElementById('catCount');
  const titleEl = document.getElementById('catTitle');

  function card(t){
    return `
      <div class="col-6 col-md-4 col-lg-3">
        <article class="prod-card h-100 d-flex flex-column">
          <img class="prod-thumb" src="${t.img || ''}" alt="${t.title}">
          <div class="prod-body">
            <h6 class="prod-title">${t.title}</h6>
            <div class="badges">
              ${t.deal ? `<span class="badge-soft badge-deal">${t.deal}</span>`:''}
              ${(t.tags||[]).map(x=>`<span class="badge-soft ${x==='Instan'?'badge-fast':''}">${x}</span>`).join('')}
            </div>
          </div>
          <div class="prod-actions mt-auto">
            ${t.gameCode ? `<button class="btn-primary-soft w-100" data-game="${t.gameCode}">TopUp</button>` :
                            `<button class="btn-ghost w-100" disabled>Segera</button>`}
          </div>
        </article>
      </div>`;
  }

  function render(cat='game'){
    const items = CATALOG[cat] || [];
    titleEl.textContent = titleMap[cat] || 'Populer';
    countEl.textContent = `${items.length} produk`;
    grid.innerHTML = items.map(card).join('') || '<div class="text-center text-muted py-5">Belum ada produk</div>';

    // Integrasi ke form order yang sudah ada (#game)
    grid.querySelectorAll('[data-game]').forEach(btn=>{
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-game');         // contoh 'ML', 'FF', 'PUBG' (harus match PRICES key)
        const sel = document.getElementById('game');
        if (sel) {
          sel.value = code;
          sel.dispatchEvent(new Event('change', {bubbles:true}));
          // scroll ke section order
          const order = document.getElementById('order') || document.getElementById('orderForm');
          if (order) window.scrollTo({ top: order.getBoundingClientRect().top + window.scrollY - 80, behavior:'smooth' });
        }
      });
    });
  }

  // tab behavior
  document.querySelectorAll('.cat-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.cat-btn').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
      render(btn.dataset.cat);
    });
  });

  render('game');
})();
</script>
