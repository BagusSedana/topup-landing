/* global bootstrap, PRICES, GAMES */
(() => {
  // =========================================================
  //  TopUpGim - Product Page Logic (full, uncut)
  //  - Auto load PRICES/GAMES (waitFor)
  //  - Form field dinamis per game
  //  - Render nominal & total (with Fast Mode)
  //  - Create order → show QR modal
  //  - Optional: upload bukti (manual)
  //  - Robust mapping for different backend fields
  // =========================================================

  // -------------------- CONFIG & UTILS ---------------------
  const PUBLIC_API = '/api/public';
  // Kalau kamu call langsung Apps Script (tanpa proxy), isi window.API_KEY di HTML:
  // <script>window.API_KEY="...";</script>
  const API_KEY = window.API_KEY || null;

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

  // wait helper → nunggu PRICES siap kalau data.js load belakangan
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
  const gameSel      = qs('#game');
  const nominalGrid  = qs('#nominalGrid');
  const nominalError = qs('#nominalError');
  const totalPriceEl = qs('#totalPrice');
  const fastMode     = qs('#fastMode');
  const buktiInput   = qs('#buktiTransfer');
  const form         = qs('#orderForm');
  const yearEl       = qs('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // container dinamis untuk field akun (auto-create kalau belum ada)
  let dyn = qs('#dynamicFields');
  if (!dyn && orderSection) {
    dyn = document.createElement('div');
    dyn.id = 'dynamicFields';
    dyn.className = 'row g-3';
    orderSection.prepend(dyn);
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
    if (!dyn) return;
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

  // WA diwajibkan (kebanyakan backend minta ini)
  const waInput = form?.['whatsapp'];
  if (waInput) {
    waInput.required = true;
    waInput.pattern = '^0\\d{8,14}$'; // 08xxxxxxxx (9–15 digit)
    waInput.addEventListener('input', () => {
      waInput.setCustomValidity(waInput.validity.patternMismatch ? 'Format WA tidak valid (contoh 08xxxxxxxxxx)' : '');
    });
  }

  // ------------------------ HTTP --------------------------
  // dual-mode post: text/plain → fallback application/json
  async function postJSONAny(url, obj) {
    // try 1: text/plain (anti preflight)
    let resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(obj)
    });
    let text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { data = { error: text || 'Bad JSON' }; }
    if (resp.ok && !data.error) return data;

    // try 2: application/json
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

  // kompres gambar → dataURL (jpeg)
  async function compressImageToDataURL(file, {maxW=1200, maxH=1200, quality=0.75} = {}) {
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

    if (PRICES[up]) return up;                           // ML
    for (const code of Object.keys(PRICES)) {            // slug
      const slug = PRICES[code]?.slug;
      if (slug && String(slug).toLowerCase() === low) return code;
    }
    for (const code of Object.keys(PRICES)) {            // nama
      if (sanitize(PRICES[code]?.key) === norm) return code;
    }
    if (window.GAMES) {                                  // dari GAMES
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

    // auto pilih opsi pertama (biar total nggak 0 melulu)
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

      const v = (n) => (form?.[n]?.value || '').trim();
      const conf = PRICES[selectedGame];
      const item = conf.items[selectedItemKey];
      const total = (item?.price || 0) + (fastMode?.checked ? (conf.fastFee || 0) : 0);

      const payload = {
        action: 'create_order',
        // produk
        game: selectedGame,                // ML / FF / PUBG
        game_name: conf.key,               // "Mobile Legends"
        item_key: selectedItemKey,         // d12, ml_86, etc
        item_label: item?.label,
        price: item?.price,
        quantity: 1,
        fast: !!fastMode?.checked,
        fast_fee: conf.fastFee || 0,
        total,

        // akun
        player_id: v('player_id'),
        server_id: v('server_id') || undefined,

        // customer (normalisasi WA ke 62)
        whatsapp: to62(v('whatsapp')),
        customer_phone: to62(v('whatsapp')),
        note: v('note') || undefined,

        // pembayaran
        payment_method: 'qris',
        return_url: location.origin + '/thanks',
        callback_url: location.origin + '/api/webhook',
        timestamp: new Date().toISOString()
      };

      // inject API key kalau ada (untuk Apps Script yang require api_key)
      if (API_KEY) payload.api_key = API_KEY;

      // loading state (tombol submit)
      const btn = ev.submitter || qs('#btnKirim');
      const prev = btn ? btn.innerHTML : null;
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Membuat pesanan…'; }

      try {
        console.debug('[create_order] payload =>', payload);
        const d1 = await postJSONAny(PUBLIC_API, payload);
        console.debug('[create_order] resp <=', d1);

        if (!d1 || (!d1.ok && !d1.order_id)) throw new Error(d1?.message || d1?.error || 'Create order gagal');

        lastOrderId = d1.order_id || d1.id || null;
        lastPayInfo = extractPay(d1);

        // tampilkan modal QR
        payTotal.textContent = 'Total: ' + rupiah(lastPayInfo.total || total);
        payInfo.textContent  = lastPayInfo.expires ? ('Bayar sebelum: ' + new Date(lastPayInfo.expires).toLocaleString('id-ID')) : 'Scan untuk bayar';

        let qrImg = null;
        if (lastPayInfo.qrUrl) qrImg = lastPayInfo.qrUrl;
        else if (lastPayInfo.qrString) qrImg = buildQrImgUrlFromString(lastPayInfo.qrString);

        if (qrImg) { payQr.src = qrImg; payQr.style.display = ''; } else { payQr.style.display = 'none'; }

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
        // tampilkan pesan error dekat form
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

    // tombol copy
    btnCopy?.addEventListener('click', async () => {
      const txt = lastPayInfo?.qrString || lastPayInfo?.va || '';
      if (!txt) return;
      await navigator.clipboard.writeText(txt);
      btnCopy.textContent = 'Disalin ✓';
      setTimeout(()=>btnCopy.textContent='Salin Kode',1200);
    });

    // tombol open app
    btnOpen?.addEventListener('click', () => {
      if (lastPayInfo?.deeplink) window.open(lastPayInfo.deeplink, '_blank', 'noopener');
    });

    // upload bukti (opsional) via modal
    btnUpload?.addEventListener('click', async () => {
      try{
        const f = buktiInput?.files?.[0];
        if (!f) { alert('Pilih bukti transfer dulu ya 🙏'); return; }
        if (!/^image\//.test(f.type)) { alert('File harus gambar'); return; }
        if (f.size > 10*1024*1024) { alert('Maksimal 10MB'); return; }
        if (!lastOrderId) { alert('Order belum terbentuk. Klik "Buat Pesanan" dulu.'); return; }

        const buktiBase64 = await compressImageToDataURL(f, {maxW:1200,maxH:1200,quality:0.75});
        const body = { action:'upload_proof', order_id:lastOrderId, bukti:buktiBase64 };
        if (API_KEY) body.api_key = API_KEY; // ikutkan api_key kalau diperlukan backend
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
  function boot(){
    // isi <select> game kalau ada
    if (gameSel && window.PRICES) {
      const frag = document.createDocumentFragment();
      Object.keys(PRICES).forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = PRICES[code].key;
        frag.appendChild(opt);
      });
      gameSel.appendChild(frag);
    }

    wireListeners();

    const paramGame = getParam('game');
    const lastGame  = localStorage.getItem('lastGame');
    const initCode  = findPriceCode(paramGame) || findPriceCode(lastGame);

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

  // start setelah PRICES siap
  waitFor(() => typeof window.PRICES !== 'undefined', boot);
})();
