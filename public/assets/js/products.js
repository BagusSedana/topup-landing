(function(){
  function el(sel, r){ return (r||document).querySelector(sel); }
  var grid = el('#catalog');
  var input = el('#search');

  var ITEMS = [
    { type:'Game', slug:'ml',   name:'Mobile Legends',          href:'/product.html?game=ml',    brand:'ml' },
    { type:'Game', slug:'ff',   name:'Free Fire',               href:'/product.html?game=ff',    brand:'ff' },
    { type:'Game', slug:'pubg', name:'PUBG Mobile',             href:'/product.html?game=pubg',  brand:'pubg' },
    { type:'Game', slug:'codm', name:'Call of Duty: Mobile',    href:'/product.html?game=codm',  brand:'codm' },
    { type:'Game', slug:'hok',  name:'Honor of Kings',          href:'/product.html?game=hok',   brand:'hok' },
    { type:'Game', slug:'gi',   name:'Genshin Impact',          href:'/product.html?game=gi',    brand:'gi' },
    { type:'Game', slug:'hsr',  name:'Honkai: Star Rail',       href:'/product.html?game=hsr',   brand:'hsr' },
    { type:'Game', slug:'valorant', name:'VALORANT (RP)',       href:'/product.html?game=valorant', brand:'valorant' },
    { type:'Game', slug:'roblox', name:'Roblox (Robux)',        href:'/product.html?game=roblox', brand:'roblox' },
    { type:'Voucher', slug:'steam',  name:'Steam Wallet',       href:'/product.html?game=steam',  brand:'steam' },
    { type:'Voucher', slug:'google', name:'Google Play',        href:'/product.html?game=google', brand:'google' },
    { type:'E-wallet', slug:'gopay', name:'GoPay',               href:'/product.html?game=gopay', brand:'gopay' },
    { type:'E-wallet', slug:'ovo',   name:'OVO',                 href:'/product.html?game=ovo',   brand:'ovo' },
    { type:'E-wallet', slug:'dana',  name:'DANA',                href:'/product.html?game=dana',  brand:'dana' },
    { type:'Pulsa', slug:'tsel',       name:'Telkomsel',        href:'/product.html?game=tsel',      brand:'tsel' },
    { type:'Pulsa', slug:'im3',        name:'Indosat IM3',      href:'/product.html?game=im3',       brand:'im3' },
    { type:'Pulsa', slug:'xl',         name:'XL Axiata',        href:'/product.html?game=xl',        brand:'xl' },
    { type:'Pulsa', slug:'axis',       name:'AXIS',             href:'/product.html?game=axis',      brand:'axis' },
    { type:'Pulsa', slug:'tri',        name:'Tri',              href:'/product.html?game=tri',       brand:'tri' },
    { type:'Pulsa', slug:'smartfren',  name:'SMARTFREN',        href:'/product.html?game=smartfren', brand:'smartfren' }
  ];

  function logoFallback(name, brand){
    var short = (name.match(/[A-Z0-9]{2,}/g) || [name])[0].slice(0,3).toUpperCase();
    return '<div class="logo-fallback d-flex align-items-center justify-content-center ' + (brand||'') + '">' +
           '<span class="fw-semibold">' + short + '</span>' +
           '</div>';
  }

  function card(item){
    var tag = '<span class="badge bg-light text-dark border">' + item.type + '</span>';
    var btnText = item.href ? 'Lihat' : 'Segera Hadir';
    var linkAttrs = item.href ? 'href="' + item.href + '"' : 'href="#" tabindex="-1" aria-disabled="true"';
    var img = '<img data-brand="' + (item.brand||'') + '" data-name="' + item.name.replace(/"/g,'&quot;') + '"' +
              ' src="' + (item.img||'') + '" class="w-100 h-100 object-fit-contain" alt="' + item.name.replace(/"/g,'&quot;') + '">';
    return '<div class="col">' +
      '<div class="card h-100 border-0 shadow-sm rounded-4">' +
        '<div class="ratio ratio-1x1 p-3">' + img + '</div>' +
        '<div class="card-body d-flex flex-column">' +
          '<div class="d-flex justify-content-between align-items-center mb-1">' +
            '<div class="fw-semibold">' + item.name + '</div>' + tag +
          '</div>' +
          '<div class="mt-auto">' +
            '<a ' + linkAttrs + ' class="btn btn-primary w-100 ' + (item.href?'':'disabled') + '">' + btnText + '</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function attachFallback(){
    var imgs = grid.querySelectorAll('img[data-brand]');
    for (var i=0;i<imgs.length;i++){
      (function(img){
        img.addEventListener('error', function(){
          var brand = img.getAttribute('data-brand') || '';
          var name = img.getAttribute('data-name') || '';
          var parent = img.parentNode;
          if (parent){ img.remove(); parent.insertAdjacentHTML('beforeend', logoFallback(name, brand)); }
        });
      })(imgs[i]);
    }
  }

  function render(list){
    var html = [];
    for (var i=0;i<list.length;i++){ html.push(card(list[i])); }
    grid.innerHTML = html.join('');
    attachFallback();
  }

  function filter(q){
    q = (q||'').toLowerCase();
    if (!q) return ITEMS.slice();
    var out = [];
    for (var i=0;i<ITEMS.length;i++){
      var it = ITEMS[i];
      var hay = (it.name + ' ' + it.type + ' ' + (it.slug||'')).toLowerCase();
      if (hay.indexOf(q) !== -1) out.push(it);
    }
    return out;
  }

  render(ITEMS);
  if (input) { input.addEventListener('input', function(){ render(filter(input.value)); }); }
})();