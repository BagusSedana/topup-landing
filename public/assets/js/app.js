/* global bootstrap, PRICES, GAMES */
(() => {
  const PUBLIC_API = '/api/public';
  const API_KEY = window.API_KEY || null;
  const DEFAULT_QR = '/assets/img/qris.jpg';
  const DISCOUNT_RATE = 0;
  const FALLBACK_BANNER =
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop';

  const rupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const getParam = (k) => new URLSearchParams(location.search).get(k);

  const to62 = (wa) => { wa = String(wa||'').replace(/\D/g,''); return /^0\d{8,15}$/.test(wa) ? ('62' + wa.slice(1)) : wa; };

  function waitFor(cond, cb, { timeout = 4000, every = 40 } = {}) {
    const t0 = Date.now();
    (function loop(){ if (cond()) return cb(); if (Date.now() - t0 > timeout) return console.warn('[product] PRICES/GAMES belum tersedia.'); setTimeout(loop, every); })();
  }

  function withSpinner(btn, runningText, fn) {
    const prev = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${runningText}`;
    const done = () => { btn.disabled = false; btn.innerHTML = prev; };
    return Promise.resolve().then(fn).finally(done);
  }

  // ===== DOM
  const orderSection = qs('#orderSection');
  const form         = qs('#orderForm');
  const gameSel      = qs('#game');           // boleh tidak ada
  const nominalGrid  = qs('#nominalGrid');
  const nominalError = qs('#nominalError');
  const totalPriceEl = qs('#totalPrice');
  const fastMode     = qs('#fastMode');       // tidak dipakai, aman jika null
  const buktiInput   = qs('#buktiTransfer');
  const yearEl       = qs('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== Styles (grid + animasi)
  if (nominalGrid) nominalGrid.classList.add('row','gx-3','gy-3','nominal-row');
  (function injectStyle(){
    if (document.getElementById('product-inline-css')) return;
    const css = document.createElement('style'); css.id='product-inline-css';
    css.textContent = `
      #nominalGrid.nominal-row{margin-left:-1rem;margin-right:-1rem}
      #nominalGrid.nominal-row>[class^="col-"],#nominalGrid.nominal-row>[class*=" col-"]{padding-left:1rem;padding-right:1rem}
      #nominalGrid .option{border:1.5px solid #e5e7eb;border-radius:.875rem;padding:.9rem 1rem;background:#fff;min-height:74px;display:flex;flex-direction:column;justify-content:center;gap:4px;transition:transform .12s, border-color .15s, box-shadow .15s}
      #nominalGrid .label{font-weight:600;font-size:.95rem;line-height:1.15;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;word-break:keep-all;overflow-wrap:normal}
      #nominalGrid .price{font-weight:700;font-size:1rem;line-height:1.2;color:#0f172a;white-space:nowrap;word-break:keep-all;overflow-wrap:normal}
      #nominalGrid input{display:none}
      #nominalGrid .nominal-opt:hover .option{transform:translateY(-1px)}
      #nominalGrid input:checked + .option{border-color:#16a34a;box-shadow:0 0 0 .22rem rgba(22,163,74,.15);transform:scale(1.02)}
      #nominalGrid input:checked + .option .price{color:#16a34a}
      #nominalGrid .skeleton{width:100%;height:74px;border-radius:.875rem;background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 37%,#f1f5f9 63%);background-size:400% 100%;animation:sk 1.2s ease-in-out infinite}
      @keyframes sk{0%{background-position:100% 50%}100%{background-position:0 50%}}
      #sumTotal.pulse{animation:pulse .9s ease}
      @keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)}}
    `;
    document.head.appendChild(css);
  })();

  // kamera
  if (buktiInput) { buktiInput.setAttribute('accept', 'image/*'); buktiInput.setAttribute('capture', 'environment'); }

  // dynamic fields container
  let dyn = qs('#dynamicFields');
  if (!dyn) { dyn = document.createElement('div'); dyn.id='dynamicFields'; dyn.className='row g-3'; if (form) form.insertBefore(dyn, form.firstChild); }
  else if (form && !form.contains(dyn)) { form.insertBefore(dyn, form.firstChild); }

  // ===== Modal QR
  let payModal, payModalEl = qs('#payModal');
  if (!payModalEl) {
    payModalEl = document.createElement('div');
    payModalEl.id = 'payModal';
    payModalEl.className = 'modal fade';
    payModalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4">
          <div class="modal-header">
            <h5 class="modal-title">Bayar Pesanan</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="text-center">
              <img id="payQr" alt="QRIS" style="width:220px;height:220px;object-fit:contain;display:none" />
              <div id="payInfo" class="small text-muted mt-2"></div>
              <div id="payTotal" class="fw-bold mt-2"></div>
              <div id="payExtra" class="mt-2"></div>
            </div>
          </div>
          <div class="modal-footer d-flex flex-wrap gap-2">
            <button id="btnOpenPayApp" class="btn btn-primary flex-grow-1 d-none" type="button">Buka Aplikasi</button>
            <button id="btnCopyCode"   class="btn btn-outline-secondary flex-grow-1 d-none" type="button">Salin Kode</button>
            <button id="btnUploadProof" class="btn btn-success flex-grow-1" type="button">Upload Bukti</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(payModalEl);
  }
  payModal = new bootstrap.Modal(payModalEl);
  const payQr     = qs('#payQr', payModalEl);
  const payInfo   = qs('#payInfo', payModalEl);
  const payTotal  = qs('#payTotal', payModalEl);
  const payExtra  = qs('#payExtra', payModalEl);
  const btnCopy   = qs('#btnCopyCode', payModalEl);
  const btnOpen   = qs('#btnOpenPayApp', payModalEl);
  const btnUpload = qs('#btnUploadProof', payModalEl);

  if (payQr) payQr.addEventListener('error', () => {
    if (!payQr.dataset.fallbacked) { payQr.dataset.fallbacked = '1'; payQr.src = DEFAULT_QR + '?t=' + Date.now(); payQr.style.display = ''; }
  });

  // ===== Dynamic fields
  const FORM_FIELDS = {
    ML: [
      { name:'player_id', label:'User ID',  placeholder:'Masukan User ID', required:true,  pattern:'\\d{4,}' },
      { name:'server_id', label:'Server ID', placeholder:'Masukan Server ID', required:false, pattern:'\\d{1,6}' }
    ],
    MCG: [
      { name:'player_id', label:'User ID',  placeholder:'Masukan User ID', required:true,  pattern:'\\d{4,}' },
      { name:'server_id', label:'Server ID', placeholder:'Masukan Server', required:false, pattern:'\\d{1,6}' }
    ],
    FF:   [{ name:'player_id', label:'ID Player', placeholder:'Masukan ID Player', required:true, pattern:'\\d{4,}' }],
    HOK:   [{ name:'player_id', label:'User ID', placeholder:'Masukan User ID', required:true, pattern:'\\d{4,}' }],
    HAGO:   [{ name:'player_id', label:'User ID', placeholder:'Masukan User ID', required:true, pattern:'\\d{4,}' }],
    PUBG: [{ name:'player_id', label:'User ID', placeholder:'Masukan User ID', required:true, pattern:'\\d{5,}'}],
    CODM: [{ name:'player_id', label:'User ID', placeholder:'Masukan User ID', required:true, pattern:'\\d{5,}'}],
    GI: [
      { name:'player_id', label:'User ID',  placeholder:'Masukan User ID', required:true,  pattern:'\\d{4,}' },
      { name:'server_id', label:'Server ID', placeholder:'Server (ASIA/AMERIKA/EUROPE/TW/HK/MO)', required:false, pattern:'\\d{1,6}' }
    ],
    HSR: [{ name:'player_id', label:'ID Player ', placeholder:'Masukan ID Player', required:true, pattern:'\\d{5,}'}],
    DEFAULT: [{ name:'player_id', label:'User ID', placeholder:'Masukan User ID', required:true }]
  };

  function renderFields(code){
    const schema = FORM_FIELDS[code] || FORM_FIELDS.DEFAULT;
    dyn.innerHTML = schema.map(f => `
      <div class="col-md-6">
        <label class="form-label">${f.label}${f.required?'<span class="text-danger">*</span>':''}</label>
        <input class="form-control rounded-4" name="${f.name}" placeholder="${f.placeholder||''}" ${f.required?'required':''} ${f.pattern?`pattern="${f.pattern}"`:''}>
        ${f.required ? '<div class="invalid-feedback">Wajib isi.</div>' : ''}
      </div>
    `).join('');
  }

  const waInput = form?.['whatsapp'];
  if (waInput) {
    waInput.required = true; waInput.pattern = '^0\\d{8,14}$';
    waInput.addEventListener('input', () => { waInput.setCustomValidity(waInput.validity.patternMismatch ? 'Format WA tidak valid (contoh 08xxxxxxxxxx)' : ''); });
  }

  // ===== HTTP helper
  async function postJSONAny(url, obj) {
    let resp = await fetch(url, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(obj) });
    let text = await resp.text(); let data; try { data = JSON.parse(text); } catch { data = { error: text || 'Bad JSON' }; }
    if (resp.ok && !data.error) return data;
    resp = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(obj) });
    text = await resp.text(); try { data = JSON.parse(text); } catch { data = { error: text || 'Bad JSON' }; }
    if (!resp.ok || data.error) throw new Error((data && (data.message || data.error)) ? (data.message || data.error) : `HTTP ${resp.status}`);
    return data;
  }

  // ===== Payment mapper
  function extractPay(d){
    const pay = d.payment || d.pay || d.qris || d.data || {};
    const qrString = pay.qr_string || pay.qrString || pay.qr || d.qr_string || d.qr || pay.qrContent;
    const qrUrl    = pay.qr_url || pay.qrImage || pay.qrImageUrl || pay.qr_img || d.qr_url;
    const deeplink = pay.deeplink || pay.app_url || pay.link || d.deeplink || d.app_url;
    const va       = pay.va || pay.va_number || pay.virtual_account || d.va || d.va_number;
    const total    = d.total || pay.total || d.amount || pay.amount;
    const expires  = pay.expires_at || d.expires_at || pay.expired_at;
    const method   = d.payment_method || pay.method || d.method || 'qris';
    return { qrString, qrUrl, deeplink, va, total, expires, method };
  }
  const buildQrImgUrlFromString = (s) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(s)}`;

  // ===== Mapping game/price
  const sanitize = (s='') => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'');
  function findPriceCode(inputRaw) {
    if (!window.PRICES) return null;
    const up = String(inputRaw||'').toUpperCase();
    const low = String(inputRaw||'').toLowerCase();
    const norm = sanitize(inputRaw||'');
    if (PRICES[up]) return up;
    for (const code of Object.keys(PRICES)) { const slug = (PRICES[code]?.slug||'').toLowerCase(); if (slug && slug === low) return code; }
    for (const code of Object.keys(PRICES)) { if (sanitize(PRICES[code]?.key) === norm) return code; }
    if (window.GAMES) {
      const g = GAMES[low] || GAMES[norm];
      if (g) { const gname = sanitize(g.name); for (const code of Object.keys(PRICES)) { if (sanitize(PRICES[code]?.key) === gname) return code; } }
    }
    return Object.keys(PRICES)[0] || null;
  }

  function syncProductHeader(code) {
    const t  = qs('#gameTitle');
    const b  = qs('#gameBanner');
    let name=null, banner=null;
    if (window.GAMES) { const g = GAMES[code?.toLowerCase()]; if (g) { name = g.name; banner = g.banner || g.cover || null; } }
    if (!name && window.PRICES && PRICES[code]) name = PRICES[code].key;
    if (t && name)  t.textContent = `Top Up ${name}`;
    renderGameContent(code);
    if (b) { b.src = banner || FALLBACK_BANNER; b.onerror = () => { if (b.src !== FALLBACK_BANNER) b.src = FALLBACK_BANNER; }; }
  }

  // ===== Nominal & Total
  let selectedGame = null, selectedItemKey = null, lastOrderId = null, lastPayInfo = null;

  
  function renderGameContent(code) {
    const el = document.getElementById('gameContent');
    if (!el) return;
    let html = '';
    try {
      const g = (window.GAMES && (window.GAMES[code] || window.GAMES[code.toLowerCase()])) || null;
      html = g && g.detailsHtml ? g.detailsHtml : '';
    } catch (e) { html = ''; }
    if (!html) {
      html = '<div class="card border-0 shadow-sm rounded-4"><div class="card-body">'+
             '<div class="fw-semibold mb-2">Tentang Produk</div>'+
             '<p>Top up cepat, resmi, dan hemat di TopUpGim. Masukkan ID akun lalu pilih nominal.</p>'+
             '</div></div>';
    }
    el.innerHTML = html;
  }
function renderNominals(code) {
    const conf = PRICES[code]; if (!conf) return;
    selectedGame = code; selectedItemKey = null;
    nominalGrid.innerHTML = ''; nominalError?.classList.add('d-none');

    const items = conf.items || {};
    Object.keys(items).forEach((key) => {
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4';
      const id = `opt_${key}`;
      const label = items[key].label || '';
      const price = rupiah(items[key].price || 0);
      col.innerHTML = `
        <label class="form-check w-100 nominal-opt" title="${label} — ${price}">
          <input class="form-check-input" type="radio" name="nominal" id="${id}" value="${key}">
          <div class="option">
            <div class="label"><span>💎</span> <span class="txt">${label}</span></div>
            <div class="price">${price}</div>
          </div>
        </label>`;
      nominalGrid.appendChild(col);
    });

    qsa('input[name="nominal"]', nominalGrid).forEach(inp => {
      inp.addEventListener('change', () => { selectedItemKey = inp.value; calcTotal(); });
    });

    const first = nominalGrid.querySelector('input[name="nominal"]');
    if (first) { first.checked = true; first.dispatchEvent(new Event('change')); } else calcTotal();
  }

  let sumItem, sumPrice, sumAdmin, sumDisc, sumTotal;
  function calcTotal() {
    const conf  = PRICES[selectedGame] || { items:{} };
    const item  = conf.items?.[selectedItemKey] || {};
    const admin = 0;
    const diskon = Math.round((item.price || 0) * DISCOUNT_RATE);
    const total  = Math.max(0, (item.price || 0) + admin - diskon);
    if (totalPriceEl) totalPriceEl.textContent = rupiah(total);

    sumItem  = qs('#sumItem'); sumPrice = qs('#sumPrice'); sumAdmin = qs('#sumAdmin'); sumDisc  = qs('#sumDisc'); sumTotal = qs('#sumTotal');
    if (sumItem)  sumItem.textContent  = item.label || '-';
    if (sumPrice) sumPrice.textContent = rupiah(item.price || 0);
    if (sumAdmin) sumAdmin.textContent = rupiah(admin);
    if (sumDisc)  sumDisc.textContent  = '-' + rupiah(diskon).replace('Rp','Rp');
    if (sumTotal) sumTotal.textContent = rupiah(total);
  }

  // ===== Skeleton & backend
  function showNominalSkeleton() {
    if (!nominalGrid) return;
    nominalGrid.innerHTML = '';
    for (let i=0;i<6;i++){ const col = document.createElement('div'); col.className = 'col-12 col-sm-6 col-md-4'; col.innerHTML = '<div class="skeleton"></div>'; nominalGrid.appendChild(col); }
  }

  async function loadPricesFromBackend() {
    try {
      const KEY = 'PRICES_CACHE_V1';
      const cached = localStorage.getItem(KEY);
      if (cached) { const { ts, prices } = JSON.parse(cached); if (Date.now() - ts < 5 * 60 * 1000 && prices) { window.PRICES = prices; return true; } }
      const data = await postJSONAny(PUBLIC_API, { action:'list_prices' });
      if (data?.ok && data?.prices) { window.PRICES = data.prices; localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), prices: data.prices })); return true; }
    } catch (e) { console.warn('[prices] backend failed, fallback ke data.js:', e.message || e); }
    return false;
  }

  // ===== Confetti (animasi sukses)
  function confettiBurst() {
    const c=document.createElement('canvas');
    c.width=innerWidth; c.height=innerHeight;
    c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2000';
    document.body.appendChild(c);
    const ctx=c.getContext('2d');
    const pieces = Array.from({length:120}, ()=> ({
      x:Math.random()*c.width, y:-10, r:2+Math.random()*4,
      vx:-2+Math.random()*4, vy:2+Math.random()*4,
      color:`hsl(${Math.floor(Math.random()*360)},90%,60%)`
    }));
    let frame=0, max=60; // ~1s
    (function anim(){
      ctx.clearRect(0,0,c.width,c.height);
      pieces.forEach(p=>{ p.vy+=0.15; p.x+=p.vx; p.y+=p.vy; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.r,p.r); });
      frame++; if (frame<max) requestAnimationFrame(anim); else c.remove();
    })();
  }

  // ===== Listeners
  function wireListeners(){
    if (gameSel) {
      orderSection?.classList.add('d-none');
      gameSel.addEventListener('change', e => {
        const val = e.target.value;
        if (!val) { nominalGrid.innerHTML=''; orderSection?.classList.add('d-none'); dyn.innerHTML=''; return; }
        renderNominals(val); renderFields(val); syncProductHeader(val); calcTotal(); localStorage.setItem('lastGame', val); orderSection?.classList.remove('d-none');
      });
    }

    form?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!form.checkValidity()) { ev.stopPropagation(); form.classList.add('was-validated'); return; }
      if (!selectedItemKey) { nominalError?.classList.remove('d-none'); nominalGrid.scrollIntoView({behavior:'smooth', block:'center'}); return; }
      nominalError?.classList.add('d-none');

      const readVal = (n) => { const el = (form && form[n]) || document.querySelector(`[name="${n}"]`); return (el?.value || '').trim(); };
      const conf = PRICES[selectedGame];
      const item = conf.items[selectedItemKey];
      const admin  = 0;
      const diskon = Math.round((item?.price || 0) * DISCOUNT_RATE);
      const total  = Math.max(0, (item?.price || 0) + admin - diskon);
      const waAlt = readVal('whatsapp_alt');
      const waFinal = to62(waAlt || readVal('whatsapp'));

      const payload = {
        action:'create_order',
        game:selectedGame, game_name:conf.key,
        item_key:selectedItemKey, item_label:item?.label, price:item?.price, quantity:1,
        fast:false, fast_fee:0, discount:diskon, total,
        player_id:readVal('player_id'), server_id:readVal('server_id') || undefined,
        whatsapp:waFinal, customer_phone:waFinal, note:readVal('note') || undefined,
        payment_method:'qris', return_url:location.origin + '/thanks', callback_url:location.origin + '/api/webhook',
        timestamp:new Date().toISOString()
      };
      if (API_KEY) payload.api_key = API_KEY;

      const btn = ev.submitter || qs('#btnBeli');

      await withSpinner(btn, 'Membuat pesanan…', async () => {
        const d1 = await postJSONAny(PUBLIC_API, payload);
        if (!d1 || (!d1.ok && !d1.order_id)) throw new Error(d1?.message || d1?.error || 'Create order gagal');

        lastOrderId = d1.order_id || d1.id || null;
        lastPayInfo = extractPay(d1);

        const totalPay = lastPayInfo.total || total;
        payTotal.textContent = 'Total: ' + rupiah(totalPay);
        payInfo.textContent  = lastPayInfo.expires ? ('Bayar sebelum: ' + new Date(lastPayInfo.expires).toLocaleString('id-ID')) : 'Scan untuk bayar';

        let qrImg = lastPayInfo.qrUrl || (lastPayInfo.qrString ? buildQrImgUrlFromString(lastPayInfo.qrString) : null) || DEFAULT_QR;
        if (qrImg) { const bust = (qrImg.includes('?') ? '&' : '?') + 't=' + Date.now(); payQr.src = qrImg + bust; payQr.style.display = ''; }
        else { payQr.style.display = 'none'; }

        btnOpen.classList.toggle('d-none', !lastPayInfo.deeplink);
        btnCopy.classList.toggle('d-none', !(lastPayInfo.qrString || lastPayInfo.va));
        payExtra.innerHTML = lastPayInfo.va ? `<div class="mt-2">VA Number: <code>${lastPayInfo.va}</code></div>` : (qrImg ? '' : `<div class="mt-2 small text-muted">Kode bayar belum tersedia dari server.</div>`);

        // ANIMASI SUKSES
        confettiBurst();
        const st = qs('#sumTotal'); st?.classList.add('pulse'); setTimeout(()=>st?.classList.remove('pulse'), 900);

        payModal.show();
      }).catch(err => {
        console.error(err);
        let box = qs('#orderErrorMsg'); if (!box) { box = document.createElement('div'); box.id='orderErrorMsg'; box.className='alert alert-danger mt-2'; form.appendChild(box); }
        box.textContent = 'Gagal membuat pesanan: ' + (err.message || err);
        box.classList.remove('d-none'); box.scrollIntoView({behavior:'smooth', block:'center'});
      });
    });

    btnCopy?.addEventListener('click', async () => {
      const txt = lastPayInfo?.qrString || lastPayInfo?.va || '';
      if (!txt) return; await navigator.clipboard.writeText(txt);
      btnCopy.textContent = 'Disalin ✓'; setTimeout(()=>btnCopy.textContent='Salin Kode',1200);
    });

    btnOpen?.addEventListener('click', () => { if (lastPayInfo?.deeplink) window.open(lastPayInfo.deeplink, '_blank', 'noopener'); });

    async function compressImageToDataURL(file, {maxW=1000, maxH=1000, quality=0.65} = {}) {
      const drawToCanvas = (img, w, h) => new Promise((resolve)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); c.toBlob((b)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.readAsDataURL(b); }, 'image/jpeg', quality); });
      try {
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, maxW / bmp.width, maxH / bmp.height);
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        return new Promise((resolve)=>{ c.toBlob((b)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.readAsDataURL(b); }, 'image/jpeg', quality); });
      } catch {
        const fr = new FileReader();
        const src = await new Promise(res => { fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
        const im = new Image(); await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = src; });
        const scale = Math.min(1, maxW / im.naturalWidth, maxH / im.naturalHeight);
        return drawToCanvas(im, Math.round(im.naturalWidth*scale), Math.round(im.naturalHeight*scale));
      }
    }

    async function doUpload(file) {
      if (!/^image\//.test(file.type)) { alert('File harus gambar'); return; }
      if (file.size > 10*1024*1024)   { alert('Maksimal 10MB');     return; }
      if (!lastOrderId)               { alert('Order belum terbentuk. Klik "Beli Sekarang" dulu.'); return; }
      const buktiBase64 = await compressImageToDataURL(file, {maxW:1000,maxH:1000,quality:0.65});
      const body = { action:'upload_proof', order_id:lastOrderId, bukti:buktiBase64 }; if (API_KEY) body.api_key = API_KEY;
      const d2 = await postJSONAny(PUBLIC_API, body);
      if (d2.ok) { alert('Bukti diterima. Terima kasih!'); payModal.hide(); if (buktiInput) buktiInput.value=''; }
      else { alert('Upload gagal'); }
    }

    const btnUpload = qs('#btnUploadProof', payModalEl);
    btnUpload?.addEventListener('click', async () => {
      if (!buktiInput) { alert('Input bukti tidak ditemukan.'); return; }
      if (!buktiInput.files?.length) {
        buktiInput.click();
        const onPick = () => { buktiInput.removeEventListener('change', onPick); const f = buktiInput.files?.[0]; if (f) withSpinner(btnUpload, 'Mengunggah…', () => doUpload(f)); };
        buktiInput.addEventListener('change', onPick, { once: true });
        return;
      }
      const f = buktiInput.files[0];
      await withSpinner(btnUpload, 'Mengunggah…', () => doUpload(f));
    });
  }

  // ===== Boot
  async function boot(){
    showNominalSkeleton();
    await loadPricesFromBackend();

    // kalau dropdown game ada → isi opsi
    if (gameSel && window.PRICES) {
      const frag = document.createDocumentFragment();
      Object.keys(PRICES).forEach(code => { const opt = document.createElement('option'); opt.value = code; opt.textContent = PRICES[code].key; frag.appendChild(opt); });
      gameSel.innerHTML = ''; gameSel.appendChild(frag);
    }

    wireListeners();

    const paramGame = getParam('game');
    const lastGame  = localStorage.getItem('lastGame');
    const initCode  = findPriceCode(paramGame) || findPriceCode(lastGame) || Object.keys(PRICES)[0];

    if (initCode && PRICES[initCode]) {
      if (gameSel) { gameSel.value = initCode; gameSel.dispatchEvent(new Event('change', { bubbles:true })); }
      else { renderNominals(initCode); renderFields(initCode); syncProductHeader(initCode); calcTotal(); orderSection?.classList.remove('d-none'); }
    } else {
      orderSection?.classList.add('d-none');
      console.warn('[product] gagal resolve game dari query. Pastikan ?game=ml/ff/pubg.');
    }
  }

  waitFor(() => typeof window.PRICES !== 'undefined', () => { boot(); });
})();

// set footer year
try{var y=document.getElementById('y'); if(y) y.textContent=new Date().getFullYear();}catch{}
