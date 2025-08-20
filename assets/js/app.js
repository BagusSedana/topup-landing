/* global bootstrap, PRICES, GAMES */
(() => {
  // =========================================================
  //  TopUpGim - Product Page Logic
  // =========================================================

  // -------------------- CONFIG & UTILS ---------------------
  const PUBLIC_API = '/api/public';
  const API_KEY = window.API_KEY || null; // kalau call langsung Apps Script
  const DEFAULT_QR = '/assets/img/qris.jpg'; // fallback QR lokal
  const DISCOUNT_RATE = 0; // contoh diskon global (0.03 = 3%). Biarkan 0 jika tidak ada.

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

  // util spinner singkat untuk tombol
  function withSpinner(btn, runningText, fn) {
    const prev = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${runningText}`;
    const done = () => { btn.disabled = false; btn.innerHTML = prev; };
    return Promise.resolve().then(fn).finally(done);
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

  // bikin input bukti ramah mobile kamera
  if (buktiInput) {
    buktiInput.setAttribute('accept', 'image/*');
    buktiInput.setAttribute('capture', 'environment');
  }

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

  // kalau gambar QR gagal dimuat, pakai fallback lokal
  if (payQr) {
    payQr.addEventListener('error', () => {
      if (!payQr.dataset.fallbacked) {
        payQr.dataset.fallbacked = '1';
        payQr.src = DEFAULT_QR + '?t=' + Date.now();
        payQr.style.display = '';
      }
    });
  }

  // -------------------- DYNAMIC FIELDS ---------------------
  const FORM_FIELDS = {
    ML: [
      { name:'player_id', label:'Player ID',  placeholder:'contoh: 12345678', required:true,  pattern:'\\d{4,}' },
      { name:'server_id', label:'Server ID (opsional)', placeholder:'contoh: 1234', required:false, pattern:'\\d{1,6}' }
    ],
    FF:   [{ name:'player_id', label:'Player ID', placeholder:'contoh: 123456789', required:true, pattern:'\\d{4,}' }],
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

  // ------------------------ UI PATCH (hapus Periksa/Tutorial + tambah Konfirmasi) -------------
  function setupConfirmationCard() {
    // hapus tombol "Periksa" & "Tutorial" kalau ada
    qsa('button, a').forEach(el => {
      const t = (el.textContent||'').trim().toLowerCase();
      if (t === 'periksa' || t === 'tutorial') el.remove();
    });

    // jika confirm card belum ada → buat & pindahkan tombol submit lama ke dalamnya
    let confirmCard = qs('#confirmCard');
    if (!confirmCard) {
      confirmCard = document.createElement('div');
      confirmCard.id = 'confirmCard';
      confirmCard.className = 'card border-0 shadow-sm rounded-4 mt-3';
      confirmCard.innerHTML = `
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-5">
              <div class="fw-semibold mb-2">Konfirmasi Pembelian</div>
              <label class="form-label small text-muted mb-1">No. WhatsApp (opsional)</label>
              <input type="tel" class="form-control rounded-4" name="whatsapp_alt" placeholder="08xxxxxxxxxx" />
              <div class="form-text">Kalau diisi, struk juga dikirim ke nomor ini.</div>
            </div>
            <div class="col-md-7">
              <div class="fw-semibold mb-2">Ringkasan Pesanan</div>
              <div class="summary small">
                <div class="d-flex justify-content-between py-1 border-bottom">
                  <span>Item</span><span id="sumItem">-</span>
                </div>
                <div class="d-flex justify-content-between py-1">
                  <span>Metode Pembayaran</span><span>QRIS</span>
                </div>
                <div class="d-flex justify-content-between py-1">
                  <span>Harga Awal</span><span id="sumPrice">Rp0</span>
                </div>
                <div class="d-flex justify-content-between py-1">
                  <span>Biaya Admin</span><span id="sumAdmin">Rp0</span>
                </div>
                <div class="d-flex justify-content-between py-1 border-bottom">
                  <span>Diskon Hemat</span><span id="sumDisc">-Rp0</span>
                </div>
                <div class="d-flex justify-content-between py-2 fw-bold fs-6">
                  <span>Total Tagihan</span><span id="sumTotal">Rp0</span>
                </div>
              </div>
              <div class="text-muted small mt-2">
                Pastikan pesanan kamu sudah benar sebelum melanjutkan pesanan.
              </div>
            </div>
          </div>
          <div class="mt-3">
            <!-- tombol submit lama (kalau ada) akan dipindahkan ke sini -->
          </div>
        </div>`;
      // taruh setelah section nominal
      (orderSection || document.body).appendChild(confirmCard);
    }

    // pindahkan tombol submit lama ke dalam confirmCard, ubah teksnya
    const submitOld = form?.querySelector('button[type="submit"]');
    if (submitOld && !confirmCard.contains(submitOld)) {
      const holder = confirmCard.querySelector('.mt-3');
      submitOld.id = 'btnBeli';
      submitOld.classList.add('btn','btn-success','rounded-4','w-100');
      submitOld.textContent = '🧾 Beli Sekarang';
      holder.appendChild(submitOld);
    }
  }

  // refs ringkasan (akan terisi setelah card dibuat)
  let sumItem, sumPrice, sumAdmin, sumDisc, sumTotal;

  // ------------------------ HTTP --------------------------
  async function postJSONAny(url, obj) {
    // try text/plain (anti preflight)
    let resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(obj)
    });
    let text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { data = { error: text || 'Bad JSON' }; }
    if (resp.ok && !data.error) return data;

    // fallback application/json
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

  // kompres gambar (fallback kalau createImageBitmap tidak ada)
  async function compressImageToDataURL(file, {maxW=1000, maxH=1000, quality=0.65} = {}) {
    const drawToCanvas = (img, w, h) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.readAsDataURL(blob);
        }, 'image/jpeg', quality);
      });
    };

    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, maxW / bmp.width, maxH / bmp.height);
      const img = document.createElement('canvas');
      img.width = Math.round(bmp.width * scale);
      img.height = Math.round(bmp.height * scale);
      img.getContext('2d').drawImage(bmp, 0, 0, img.width, img.height);
      return new Promise((resolve) => {
        img.toBlob((blob) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.readAsDataURL(blob);
        }, 'image/jpeg', quality);
      });
    } catch {
      const fr = new FileReader();
      const src = await new Promise(res => { fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
      const im = new Image();
      await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = src; });
      const scale = Math.min(1, maxW / im.naturalWidth, maxH / im.naturalHeight);
      return drawToCanvas(im, Math.round(im.naturalWidth*scale), Math.round(im.naturalHeight*scale));
    }
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
    const conf  = PRICES[selectedGame] || { items:{} };
    const item  = conf.items[selectedItemKey] || {};
    const admin = (fastMode?.checked ? (conf.fastFee || 0) : 0);
    const diskon = Math.round((item.price || 0) * DISCOUNT_RATE);
    const total  = Math.max(0, (item.price || 0) + admin - diskon);

    if (totalPriceEl) totalPriceEl.textContent = rupiah(total);

    // refresh refs ringkasan (mungkin baru dibuat)
    sumItem  = qs('#sumItem'); sumPrice = qs('#sumPrice');
    sumAdmin = qs('#sumAdmin'); sumDisc  = qs('#sumDisc'); sumTotal = qs('#sumTotal');

    if (sumItem)  sumItem.textContent  = item.label || '-';
    if (sumPrice) sumPrice.textContent = rupiah(item.price || 0);
    if (sumAdmin) sumAdmin.textContent = rupiah(admin);
    if (sumDisc)  sumDisc.textContent  = '-' + rupiah(diskon).replace('Rp','Rp');
    if (sumTotal) sumTotal.textContent = rupiah(total);
  }
  fastMode?.addEventListener('change', calcTotal);

  // --------------------- PRICES FROM BACKEND ---------------
  function showNominalSkeleton() {
    if (!nominalGrid) return;
    nominalGrid.innerHTML = '';
    for (let i=0;i<6;i++){
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4';
      col.innerHTML = '<div class="skeleton"></div>';
      nominalGrid.appendChild(col);
    }
  }

  async function loadPricesFromBackend() {
    try {
      const KEY = 'PRICES_CACHE_V1';
      const cached = localStorage.getItem(KEY);
      if (cached) {
        const { ts, prices } = JSON.parse(cached);
        if (Date.now() - ts < 5 * 60 * 1000 && prices) {
          window.PRICES = prices;
          return true;
        }
      }
      const data = await postJSONAny(PUBLIC_API, { action: 'list_prices' });
      if (data?.ok && data?.prices) {
        window.PRICES = data.prices;
        localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), prices: data.prices }));
        return true;
      }
    } catch (e) {
      console.warn('[prices] backend failed, fallback ke data.js:', e.message || e);
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
        setupConfirmationCard();
        calcTotal();
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

      const admin  = (fastMode?.checked ? (conf.fastFee || 0) : 0);
      const diskon = Math.round((item?.price || 0) * DISCOUNT_RATE);
      const total  = Math.max(0, (item?.price || 0) + admin - diskon);

      // nomor WA alternatif (opsional)
      const waAlt = readVal('whatsapp_alt');
      const waFinal = to62(waAlt || readVal('whatsapp'));

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
        discount: diskon,
        total,
        player_id: readVal('player_id'),
        server_id: readVal('server_id') || undefined,
        whatsapp: waFinal,
        customer_phone: waFinal,
        note: readVal('note') || undefined,
        payment_method: 'qris',
        return_url: location.origin + '/thanks',
        callback_url: location.origin + '/api/webhook',
        timestamp: new Date().toISOString()
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
      }).catch(err => {
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
      });
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

    // ==== Upload Bukti dengan auto file picker ====
    async function doUpload(file) {
      if (!/^image\//.test(file.type)) { alert('File harus gambar'); return; }
      if (file.size > 10*1024*1024)   { alert('Maksimal 10MB');     return; }
      if (!lastOrderId)               { alert('Order belum terbentuk. Klik "Buat Pesanan" dulu.'); return; }

      const buktiBase64 = await compressImageToDataURL(file, {maxW:1000,maxH:1000,quality:0.65});
      const body = { action:'upload_proof', order_id:lastOrderId, bukti:buktiBase64 };
      if (API_KEY) body.api_key = API_KEY;

      const d2 = await postJSONAny(PUBLIC_API, body);
      if (d2.ok) {
        alert('Bukti diterima. Terima kasih!');
        payModal.hide();
        if (buktiInput) buktiInput.value = ''; // reset
      } else {
        throw new Error(d2.error || 'Upload gagal');
      }
    }

    btnUpload?.addEventListener('click', async () => {
      if (!buktiInput) { alert('Input bukti tidak ditemukan.'); return; }

      // belum ada file → buka picker dan auto-upload setelah dipilih
      if (!buktiInput.files?.length) {
        buktiInput.click();
        const onPick = () => {
          buktiInput.removeEventListener('change', onPick);
          const f = buktiInput.files?.[0];
          if (f) withSpinner(btnUpload, 'Mengunggah…', () => doUpload(f));
        };
        buktiInput.addEventListener('change', onPick, { once: true });
        return;
      }

      // sudah ada file → langsung upload
      const f = buktiInput.files[0];
      await withSpinner(btnUpload, 'Mengunggah…', () => doUpload(f));
    });
  }

  // ------------------------ BOOT ---------------------------
  async function boot(){
    showNominalSkeleton();
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
    setupConfirmationCard(); // pastikan card ada

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
        setupConfirmationCard();
        calcTotal();
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
