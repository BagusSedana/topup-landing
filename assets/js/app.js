/* global bootstrap, PRICES, GAMES */
(() => {
  // ================== UTIL & CONFIG ==================
  const PUBLIC_API = '/api/public';
  const rupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
      .format(n || 0);

  // wait helper -> handle kalau data.js load setelah app.js
  function waitFor(cond, cb, { timeout = 4000, every = 40 } = {}) {
    const start = Date.now();
    (function loop() {
      if (cond()) return cb();
      if (Date.now() - start > timeout) return console.warn('[product] data tidak ditemukan (PRICES/GAMES)');
      setTimeout(loop, every);
    })();
  }

  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  // ================== DOM refs ==================
  const orderSection = qs('#orderSection');
  const gameSel      = qs('#game');
  const nominalGrid  = qs('#nominalGrid');
  const nominalError = qs('#nominalError');
  const totalPriceEl = qs('#totalPrice');
  const fastMode     = qs('#fastMode');
  const buktiInput   = qs('#buktiTransfer');
  const btnKirim     = qs('#btnKirim');
  const form         = qs('#orderForm');
  const yearEl       = qs('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // pastiin container field ada
  let dyn = qs('#dynamicFields');
  if (!dyn && orderSection) {
    dyn = document.createElement('div');
    dyn.id = 'dynamicFields';
    dyn.className = 'row g-3';
    orderSection.prepend(dyn);
  }

  // ================== Field per game ==================
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

  // ================== HTTP util ==================
  async function postJSON(url, obj) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // simple request (anti preflight)
      body: JSON.stringify(obj)
    });
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { throw new Error(text || 'Bad JSON'); }
    if (!resp.ok)           throw new Error(data.error || text || `HTTP ${resp.status}`);
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  // Kompres gambar -> dataURL (jpeg)
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
        r.onload = () => resolve(r.result); // -> data:image/jpeg;base64,...
        r.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    });
  }

  // ================== Mapping game ==================
  const getParam = (k) => new URLSearchParams(location.search).get(k);
  const sanitize = (s='') => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'');
  function findPriceCode(inputRaw) {
    if (!window.PRICES) return null;
    if (!inputRaw) return null;
    const up = String(inputRaw).toUpperCase();     // ML
    const low = String(inputRaw).toLowerCase();    // ml
    const norm = sanitize(inputRaw);               // mobilelegends

    // 1) langsung cocok kode
    if (PRICES[up]) return up;

    // 2) kalau PRICES punya .slug yang sama
    for (const code of Object.keys(PRICES)) {
      const slug = PRICES[code]?.slug;
      if (slug && String(slug).toLowerCase() === low) return code;
    }

    // 3) cocok berdasarkan nama (key) yang disanitasi
    for (const code of Object.keys(PRICES)) {
      if (sanitize(PRICES[code]?.key) === norm) return code;
    }

    // 4) pakai GAMES (slug→name→key)
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

    // coba dari GAMES
    let name=null, banner=null;
    if (window.GAMES) {
      const bySlug = GAMES[code?.toLowerCase()];
      if (bySlug) { name = bySlug.name; banner = bySlug.banner || bySlug.cover || null; }
      else if (window.PRICES && PRICES[code]) name = PRICES[code].key;
    } else if (window.PRICES && PRICES[code]) {
      name = PRICES[code].key;
    }

    if (t && name)  t.textContent = `Top Up ${name}`;
    if (bc && name) bc.textContent = name;
    if (b && banner) b.src = banner;
  }

  // ================== Nominal render & total ==================
  let selectedGame = null;
  let selectedItemKey = null;
  let selectedPrice = 0;
  let currentFastFee = 0;

  function renderNominals(code) {
    const conf = PRICES[code];
    if (!conf) { console.warn('[product] PRICES['+code+'] tidak ada'); return; }

    selectedGame = code;
    selectedItemKey = null;
    selectedPrice = 0;
    currentFastFee = conf.fastFee || 0;
    if (nominalGrid) nominalGrid.innerHTML = '';
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
    calcTotal();
  }

  function calcTotal() {
    let total = selectedPrice || 0;
    if (fastMode?.checked && total > 0) total += currentFastFee || 0;
    if (totalPriceEl) totalPriceEl.textContent = rupiah(total);
  }

  // ================== Form & submit ==================
  function wireListeners() {
    if (gameSel) {
      if (orderSection) orderSection.classList.add('d-none');
      gameSel.addEventListener('change', e => {
        const val = e.target.value;
        if (!val) {
          if (nominalGrid) nominalGrid.innerHTML = '';
          if (totalPriceEl) totalPriceEl.textContent = rupiah(0);
          if (orderSection) orderSection.classList.add('d-none');
          if (dyn) dyn.innerHTML = '';
          return;
        }
        renderNominals(val);
        renderFields(val);
        syncProductHeader(val);
        localStorage.setItem('lastGame', val);
        if (orderSection) orderSection.classList.remove('d-none');
      });
    }
    fastMode?.addEventListener('change', calcTotal);

    form?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!form.checkValidity()) { ev.stopPropagation(); form.classList.add('was-validated'); return; }
      if (!selectedItemKey) { nominalError?.classList.remove('d-none'); nominalGrid.scrollIntoView({ behavior:'smooth', block:'center' }); return; }
      nominalError?.classList.add('d-none');

      const f = buktiInput?.files?.[0];
      if (!f) { alert('Upload bukti transfer dulu 🙏'); return; }
      if (!/^image\//.test(f.type)) { alert('File harus gambar ya.'); return; }
      if (f.size > 10 * 1024 * 1024) { alert('Maksimal 10MB ya.'); return; }

      const prev = btnKirim.innerHTML;
      btnKirim.disabled = true;
      btnKirim.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';

      try {
        const v = (n) => (form?.[n]?.value || '').trim();
        const basePayload = {
          action: 'create_order',
          origin: location.origin,
          game: selectedGame,
          item_key: selectedItemKey,
          player_id: v('player_id'),
          server_id: v('server_id'),
          whatsapp: v('whatsapp'),
          note: v('note'),
          fast: !!fastMode?.checked,
          timestamp: new Date().toISOString()
        };

        const d1 = await postJSON(PUBLIC_API, basePayload);
        if (!d1.ok) throw new Error(d1.error || 'Create order failed');

        alert(`Order diterima! ID: ${d1.order_id}\nBukti sedang diunggah...`);
        if (basePayload.whatsapp) {
          const wa = `https://wa.me/${basePayload.whatsapp}?text=${encodeURIComponent('Halo! Pesanan kamu kami terima. Order ID: ' + d1.order_id)}`;
          window.open(wa, '_blank', 'noopener');
        }

        const buktiBase64 = await compressImageToDataURL(f, { maxW: 1200, maxH: 1200, quality: 0.75 });
        await postJSON(PUBLIC_API, { action: 'upload_proof', order_id: d1.order_id, bukti: buktiBase64 });

        form.reset();
        if (nominalGrid) nominalGrid.innerHTML = '';
        selectedItemKey = null; selectedPrice = 0; calcTotal();

      } catch (err) {
        console.error(err);
        alert('Gagal memproses. Coba lagi ya 🙏\n\n' + (err.message || err));
      } finally {
        btnKirim.disabled = false;
        btnKirim.innerHTML = prev;
      }
    });
  }

  // ================== BOOT ==================
  function boot() {
    // isi select (kalau ada)
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

    // resolve kode dari URL / storage
    const paramGame = getParam('game'); // ml atau ML atau mobile-legends
    const lastGame  = localStorage.getItem('lastGame');
    const codeFromParam = findPriceCode(paramGame);
    const codeFromLast  = findPriceCode(lastGame);
    const initCode      = codeFromParam || codeFromLast;

    if (initCode && window.PRICES && PRICES[initCode]) {
      if (gameSel) {
        gameSel.value = initCode;
        gameSel.dispatchEvent(new Event('change', { bubbles:true }));
      } else {
        renderNominals(initCode);
        renderFields(initCode);
        syncProductHeader(initCode);
        if (orderSection) orderSection.classList.remove('d-none');
      }
    } else {
      // fallback: sembunyiin form sampai user pilih manual
      if (orderSection) orderSection.classList.add('d-none');
      console.warn('[product] gagal resolve game dari query. Pastikan ?game=ml/ML/nama.');
    }
  }

  // jalankan setelah PRICES siap (GAMES opsional)
  waitFor(() => typeof window.PRICES !== 'undefined', boot);
})();
