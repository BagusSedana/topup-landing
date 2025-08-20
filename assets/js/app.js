/* global bootstrap, PRICES, GAMES */
(() => {
  // =========================================================
  //  TopUpGim - Product Page Logic
  // =========================================================

  // -------------------- CONFIG & UTILS ---------------------
  const PUBLIC_API = '/api/public';
  const API_KEY = window.API_KEY || null; // kalau call langsung Apps Script
  const DEFAULT_QR = '/assets/img/qris.jpg'; // <-- fallback QR lokal

  const rupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
      .format(n || 0);

  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const getParam = (k) => new URLSearchParams(location.search).get(k);

  // normalisasi WA 08xxxxxxxx → 62xxxxxxxx
  const to62 = (wa) => {
    wa = String(wa||'').replace(/\D/g,'');
    return /^0\d{8,15}$/.test(wa) ? ('62' + wa.slice(1)) : wa;
  };

  function waitFor(cond, cb, { timeout = 4000, every = 40 } = {}) {
    const t0 = Date.now();
    (function loop(){
      if (cond()) return cb();
      if (Date.now() - t0 > timeout) return console.warn('[product] PRICES/GAMES belum tersedia.');
      setTimeout(loop, every);
    })();
  }

  // --------------------- DOM REFERENCES --------------------
  const orderSection = qs('#orderSection');
  const form         = qs('#orderForm');
  const gameSel      = qs('#game');
  const nominalGrid  = qs('#nominalGrid');
  const nominalError = qs('#nominalError');
  const totalPriceEl = qs('#totalPrice');
  const fastMode     = qs('#fastMode');
  const buktiInput   = qs('#buktiTransfer');
  const yearEl       = qs('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // dynamic account fields — pastikan DI DALAM form
  let dyn = qs('#dynamicFields');
  if (!dyn) {
    dyn = document.createElement('div');
    dyn.id = 'dynamicFields';
    dyn.className = 'row g-3';
    if (form) form.insertBefore(dyn, form.firstChild);
  } else if (form && !form.contains(dyn)) {
    form.insertBefore(dyn, form.firstChild);
  }

  // ----------------------- QR MODAL ------------------------
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

  // -------------------- DYNAMIC FIELDS ---------------------
  const FORM_FIELDS = {
    ML: [
      { name:'player_id', label:'Player ID',  placeholder:'contoh: 12345678', required:true,  pattern:'\\d{4,}' },
      { name:'server_id', label:'Server ID (opsional)', placeholder:'contoh: 1234', required:false, pattern:'\\d{1,6}' }
    ],
    FF:   [{ name:'player_id', label:'Player ID', placeholder:'contoh: 123456789', required:true, pattern:'\\d{4,}'}],
    PUBG: [{ name:'player_id', label:'UID',       placeholder:'contoh: 5123456789', required:true, pattern:'\\d{5,}'}],
    DEFAULT: [{ name:'player_id', label:'Player ID', placeholder:'ID/UID akun', required:true }]
  };

  function renderFields(code){
    const schema = FORM_FIELDS[code] || FORM_FIELDS.DEFAULT;
    dyn.innerHTML = schema.map(f => `
      <div class="col-md-6">
        <label class="form-label">${f.label}${f.required?'<span class="text-danger">*</span>':''}</label>
        <input class="form-control rounded-4" name="${f.name}"
               placeholder="${f.placeholder||''}"
               ${f.required?'required':''}
               ${f.pattern?`pattern="${f.pattern}"`:''}>
        ${f.required ? '<div class="invalid-feedback">Wajib isi.</div>' : ''}
      </div>
    `).join('');
  }

  // WA wajib
  const waInput = form?.['whatsapp'];
  if (waInput) {
    waInput.required = true;
    waInput.pattern = '^0\\d{8,14}$';
    waInput.addEventListener('input', () => {
      waInput.setCustomValidity(waInput.validity.patternMismatch ? 'Format WA tidak valid (contoh 08xxxxxxxxxx)' : '');
    });
  }

  // ------------------------ HTTP --------------------------
  async function postJSONAny(url, obj) {
    let resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(obj)
    });
    let text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { data = { error: text || 'Bad JSON' }; }
    if (resp.ok && !data.error) return data;

    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    });
    text = await resp.text();
    try { data = JSON.parse(text); } catch { data = { error: text || 'Bad JSON' }; }
    if (!resp.ok || data.error) {
      const msg = (data && (data.message || data.error)) ? (data.message || data.error) : `HTTP ${resp.status}`;
      throw new Error(msg);
    }
    return data;
  }

  async function compressImageToDataURL(file, {maxW=1000, maxH=1000, quality=0.65} = {}) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bmp.width, maxH / bmp.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    });
  }

  // --------------------- PAYMENT MAPPER --------------------
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
  const buildQrImgUrlFromString = (s) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(s)}`;

  // ---------------------- GAME MAPPING --------------------
  const sanitize = (s='') => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'');
  function findPriceCode(inputRaw) {
    if (!window.PRICES || !inputRaw) return null;
    const up = String(inputRaw).toUpperCase();
    const low = String(inputRaw).toLowerCase();
    const norm = sanitize(inputRaw);

    if (PRICES[up]) return up;
    for (const code of Object.keys(PRICES)) {
      const slug = PRICES[code]?.slug;
      if (slug && String(slug).toLowerCase() === low) return code;
    }
    for (const code of Object.keys(PRICES)) {
      if (sanitize(PRICES[code]?.key) === norm) return code;
    }
    if (window.GAMES) {
      const g = GAMES[low];
      if (g) {
        const gname = sanitize(g.name);
        for (const code of Object.keys(PRICES)) {
          if (sanitize(PRICES[code]?.key) === gname) return code;
        }
      }
    }
    return null;
  }

  function syncProductHeader(code) {
    const t  = qs('#gameTitle');
    const b  = qs('#gameBanner');
    const bc = qs('#breadcrumbGame');

    let name=null, banner=null;
    if (window.GAMES) {
      const g = GAMES[code?.toLowerCase()];
      if (g) { name = g.name; banner = g.banner || g.cover || null; }
    }
    if (!name && window.PRICES && PRICES[code]) name = PRICES[code].key;

    if (t && name)  t.textContent = `Top Up ${name}`;
    if (bc && name) bc.textContent = name;
    if (b && banner) b.src = banner;
  }

  // ------------------ NOMINAL & TOTAL ---------------------
  let selectedGame = null;
  let selectedItemKey = null;
  let selectedPrice = 0;
  let currentFastFee = 0;
  let lastOrderId = null;
  let lastPayInfo = null;

  function renderNominals(code) {
    const conf = PRICES[code];
    if (!conf) return;

    selectedGame = code;
    selectedItemKey = null;
    selectedPrice = 0;
    currentFastFee = conf.fastFee || 0;
    nominalGrid.innerHTML = '';
    nominalError?.classList.add('d-none');

    const items = conf.items || {};
    Object.keys(items).forEach((key) => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4';
      const id = `opt_${key}`;
      col.innerHTML = `
        <label class="form-check w-100">
          <input class="form-check-input" type="radio" name="nominal" id="${id}" value="${key}">
          <div class="option">
            <div class="fw-semibold small">${items[key].label}</div>
            <div class="small text-muted">${rupiah(items[key].price)}</div>
          </div>
        </label>`;
      nominalGrid.appendChild(col);
    });

    qsa('input[name="nominal"]', nominalGrid).forEach(inp => {
      inp.addEventListener('change', () => {
        selectedItemKey = inp.value;
        selectedPrice = PRICES[code].items[selectedItemKey].price;
        calcTotal();
      });
    });

    const first = nominalGrid.querySelector('input[name="nominal"]');
    if (first) { first.checked = true; first.dispatchEvent(new Event('change')); }
    else calcTotal();
  }

  function calcTotal() {
    let total = selectedPrice || 0;
    if (fastMode?.checked && total > 0) total += currentFastFee || 0;
    if (totalPriceEl) totalPriceEl.textContent = rupiah(total);
  }
  fastMode?.addEventListener('change', calcTotal);

  // --------------------- PRICES FROM BACKEND ---------------
  async function loadPricesFromBackend() {
    try {
      const data = await postJSONAny(PUBLIC_API, { action: 'list_prices' });
      if (data?.ok && data?.prices) {
        window.PRICES = data.prices;
        console.log('[prices] loaded from backend');
        return true;
      }
    } catch (e) {
      console.warn('[prices] backend failed, fallback to data.js:', e.message || e);
    }
    return false;
  }

  // --------------------- LISTENERS -------------------------
  function wireListeners(){
    if (gameSel) {
      orderSection?.classList.add('d-none');
      gameSel.addEventListener('change', e => {
        const val = e.target.value;
        if (!val) {
          nominalGrid.innerHTML = '';
          totalPriceEl.textContent = rupiah(0);
          orderSection?.classList.add('d-none');
          dyn.innerHTML = '';
          return;
        }
        renderNominals(val);
        renderFields(val);
        syncProductHeader(val);
        localStorage.setItem('lastGame', val);
        orderSection?.classList.remove('d-none');
      });
    }

    // SUBMIT: create order → show QR
    form?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!form.checkValidity()) { ev.stopPropagation(); form.classList.add('was-validated'); return; }
      if (!selectedItemKey) { nominalError?.classList.remove('d-none'); nominalGrid.scrollIntoView({behavior:'smooth', block:'center'}); return; }
      nominalError?.classList.add('d-none');

      const readVal = (n) => {
        const el = (form && form[n]) || document.querySelector(`[name="${n}"]`);
        return (el?.value || '').trim();
      };

      const conf = PRICES[selectedGame];
      const item = conf.items[selectedItemKey];
      const total = (item?.price || 0) + (fastMode?.checked ? (conf.fastFee || 0) : 0);

      const payload = {
        action: 'create_order',
        game: selectedGame,
        game_name: conf.key,
        item_key: selectedItemKey,
        item_label: item?.label,
        price: item?.price,
        quantity: 1,
        fast: !!fastMode?.checked,
        fast_fee: conf.fastFee || 0,
        total,
        player_id: readVal('player_id'),
        server_id: readVal('server_id') || undefined,
        whatsapp: to62(readVal('whatsapp')),
        customer_phone: to62(readVal('whatsapp')),
        note: readVal('note') || undefined,
        payment_method: 'qris',
        return_url: location.origin + '/thanks',
        callback_url: location.origin + '/api/webhook',
        timestamp: new Date().toISOString()
      };
      if (API_KEY) payload.api_key = API_KEY;

      const btn = ev.submitter || qs('#btnKirim');
      const prev = btn ? btn.innerHTML : null;
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Membuat pesanan…'; }

      try {
        const d1 = await postJSONAny(PUBLIC_API, payload);

        if (!d1 || (!d1.ok && !d1.order_id)) throw new Error(d1?.message || d1?.error || 'Create order gagal');

        lastOrderId = d1.order_id || d1.id || null;
        lastPayInfo = extractPay(d1);

        const totalPay = lastPayInfo.total || total;
        payTotal.textContent = 'Total: ' + rupiah(totalPay);
        payInfo.textContent  = lastPayInfo.expires ? ('Bayar sebelum: ' + new Date(lastPayInfo.expires).toLocaleString('id-ID')) : 'Scan untuk bayar';

        // --- QR image (qr_url → qr_string → fallback lokal) + cache-busting
        let qrImg = lastPayInfo.qrUrl
          || (lastPayInfo.qrString ? buildQrImgUrlFromString(lastPayInfo.qrString) : null)
          || DEFAULT_QR;

        if (qrImg) {
          const bust = (qrImg.includes('?') ? '&' : '?') + 't=' + Date.now();
          payQr.src = qrImg + bust;
          payQr.style.display = '';
        } else {
          payQr.style.display = 'none';
        }

        btnOpen.classList.toggle('d-none', !lastPayInfo.deeplink);
        btnCopy.classList.toggle('d-none', !(lastPayInfo.qrString || lastPayInfo.va));

        payExtra.innerHTML = '';
        if (lastPayInfo.va) {
          payExtra.innerHTML = `<div class="mt-2">VA Number: <code>${lastPayInfo.va}</code></div>`;
        } else if (!qrImg) {
          payExtra.innerHTML = `<div class="mt-2 small text-muted">Kode bayar belum tersedia dari server.</div>`;
        }

        payModal.show();

      } catch (err) {
        console.error(err);
        let box = qs('#orderErrorMsg');
        if (!box) {
          box = document.createElement('div');
          box.id = 'orderErrorMsg';
          box.className = 'alert alert-danger mt-2';
          form.appendChild(box);
        }
        box.textContent = 'Gagal membuat pesanan: ' + (err.message || err);
        box.scrollIntoView({behavior:'smooth', block:'center'});
      } finally {
        if (btn && prev) { btn.disabled = false; btn.innerHTML = prev; }
      }
    });

    btnCopy?.addEventListener('click', async () => {
      const txt = lastPayInfo?.qrString || lastPayInfo?.va || '';
      if (!txt) return;
      await navigator.clipboard.writeText(txt);
      btnCopy.textContent = 'Disalin ✓';
      setTimeout(()=>btnCopy.textContent='Salin Kode',1200);
    });

    btnOpen?.addEventListener('click', () => {
      if (lastPayInfo?.deeplink) window.open(lastPayInfo.deeplink, '_blank', 'noopener');
    });

    btnUpload?.addEventListener('click', async () => {
      try{
        const f = buktiInput?.files?.[0];
        if (!f) { alert('Pilih bukti transfer dulu ya 🙏'); return; }
        if (!/^image\//.test(f.type)) { alert('File harus gambar'); return; }
        if (f.size > 10*1024*1024) { alert('Maksimal 10MB'); return; }
        if (!lastOrderId) { alert('Order belum terbentuk. Klik "Buat Pesanan" dulu.'); return; }

        const buktiBase64 = await compressImageToDataURL(f, {maxW:1000,maxH:1000,quality:0.65});
        const body = { action:'upload_proof', order_id:lastOrderId, bukti:buktiBase64 };
        if (API_KEY) body.api_key = API_KEY;
        const d2 = await postJSONAny(PUBLIC_API, body);
        if (d2.ok) { alert('Bukti diterima. Terima kasih!'); payModal.hide(); }
        else { throw new Error(d2.error || 'Upload gagal'); }
      }catch(err){
        console.error(err);
        alert('Upload bukti gagal. ' + (err.message||err));
      }
    });
  }

  // ------------------------ BOOT ---------------------------
  async function boot(){
    await loadPricesFromBackend(); // override PRICES dari backend kalau ada

    if (gameSel && window.PRICES) {
      const frag = document.createDocumentFragment();
      Object.keys(PRICES).forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = PRICES[code].key;
        frag.appendChild(opt);
      });
      gameSel.innerHTML = '';
      gameSel.appendChild(frag);
    }

    wireListeners();

    const paramGame = getParam('game');
    const lastGame  = localStorage.getItem('lastGame');
    const initCode  = findPriceCode(paramGame) || findPriceCode(lastGame) || Object.keys(PRICES)[0];

    if (initCode && PRICES[initCode]) {
      if (gameSel) {
        gameSel.value = initCode;
        gameSel.dispatchEvent(new Event('change', { bubbles:true }));
      } else {
        renderNominals(initCode);
        renderFields(initCode);
        syncProductHeader(initCode);
        orderSection?.classList.remove('d-none');
      }
    } else {
      orderSection?.classList.add('d-none');
      console.warn('[product] gagal resolve game dari query. Pastikan ?game=ml/ff/pubg.');
    }
  }

  // start setelah PRICES siap (data.js), tapi boot akan override dari backend
  waitFor(() => typeof window.PRICES !== 'undefined', () => { boot(); });
})();
