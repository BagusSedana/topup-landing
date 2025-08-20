/* global bootstrap, PRICES, GAMES */
(() => {
  const PUBLIC_API = window.PUBLIC_API || '/api/public';
  const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const getParam = (k) => new URLSearchParams(location.search).get(k);
  const to62 = (wa) => { wa = String(wa||'').replace(/\D/g,''); return /^0\d{8,15}$/.test(wa) ? ('62' + wa.slice(1)) : wa; };
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

  async function postJSONAny(url, obj) {
    let resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(obj) });
    let text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { data = { error: text || 'Bad JSON' }; }
    if (resp.ok && !data.error) return data;

    resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
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

  // DOM refs
  const form         = qs('#orderForm');
  const nominalGrid  = qs('#nominalGrid');
  const nominalError = qs('#nominalError');
  const totalPriceEl = qs('#totalPrice');
  const fastMode     = qs('#fastMode');
  const buktiInput   = qs('#buktiTransfer'); // hidden
  const yearEl       = qs('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // modal
  const payModalEl = qs('#payModal');
  const payModal   = new bootstrap.Modal(payModalEl);
  const payQr      = qs('#payQr', payModalEl);
  const payInfo    = qs('#payInfo', payModalEl);
  const payTotal   = qs('#payTotal', payModalEl);
  const payExtra   = qs('#payExtra', payModalEl);
  const btnCopy    = qs('#btnCopyCode', payModalEl);
  const btnOpen    = qs('#btnOpenPayApp', payModalEl);
  const btnUpload  = qs('#btnUploadProof', payModalEl);

  const FORM_FIELDS = {
    ML:   [{ name:'player_id', label:'Player ID',  placeholder:'contoh: 12345678', required:true,  pattern:'\\d{4,}' },
           { name:'server_id', label:'Server ID (opsional)', placeholder:'contoh: 1234', required:false, pattern:'\\d{1,6}' }],
    FF:   [{ name:'player_id', label:'Player ID', placeholder:'contoh: 123456789', required:true, pattern:'\\d{4,'} }],
    PUBG: [{ name:'player_id', label:'UID',       placeholder:'contoh: 5123456789', required:true, pattern:'\\d{5,'} }],
    DEFAULT: [{ name:'player_id', label:'Player ID', placeholder:'ID/UID akun', required:true }]
  };

  const dyn = qs('#dynamicFields');
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

  const waInput = form?.['whatsapp'];
  if (waInput) {
    waInput.required = true;
    waInput.pattern = '^0\\d{8,14}$';
    waInput.addEventListener('input', () => {
      waInput.setCustomValidity(waInput.validity.patternMismatch ? 'Format WA tidak valid (contoh 08xxxxxxxxxx)' : '');
    });
  }

  // payment mapper
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

  // state
  let selectedGame = null;
  let selectedItemKey = null;
  let selectedPrice = 0;
  let currentFastFee = 0;
  let lastOrderId = null;
  let lastPayInfo = null;

  function renderNominals(code) {
    const conf = PRICES[code]; if (!conf) return;
    selectedGame = code; selectedItemKey = null; selectedPrice = 0; currentFastFee = conf.fastFee || 0;
    nominalGrid.innerHTML = ''; nominalError?.classList.add('d-none');

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
    if (first) { first.checked = true; first.dispatchEvent(new Event('change')); } else calcTotal();
  }

  function calcTotal() {
    let total = selectedPrice || 0;
    if (fastMode?.checked && total > 0) total += currentFastFee || 0;
    if (totalPriceEl) totalPriceEl.textContent = rupiah(total);
  }
  fastMode?.addEventListener('change', calcTotal);

  // submit
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errBox = qs('#orderErrorMsg');
    const showErr = (msg) => { errBox.textContent = msg; errBox.classList.remove('d-none'); errBox.scrollIntoView({behavior:'smooth', block:'center'}); }
    errBox.classList.add('d-none');

    // FE guard
    const v = (n) => (form?.[n]?.value || '').trim();
    const pid = v('player_id');
    const wa  = v('whatsapp');
    if (!pid) return showErr('Player ID wajib diisi.');
    if (!wa)  return showErr('WhatsApp wajib diisi.');
    if (!selectedItemKey) { nominalError?.classList.remove('d-none'); nominalGrid.scrollIntoView({behavior:'smooth', block:'center'}); return; }
    nominalError?.classList.add('d-none');

    const conf = PRICES[selectedGame];
    const item = conf.items[selectedItemKey];
    const total = (item?.price || 0) + (fastMode?.checked ? (conf.fastFee || 0) : 0);

    const payload = {
      action: 'create_order',
      game: selectedGame || findPriceCode(getParam('game')) || Object.keys(PRICES)[0],
      game_name: conf.key,
      item_key: selectedItemKey,
      item_label: item?.label,
      price: item?.price,
      quantity: 1,
      fast: !!fastMode?.checked,
      fast_fee: conf.fastFee || 0,
      total,
      player_id: pid,
      server_id: v('server_id') || undefined,
      whatsapp: to62(wa),
      customer_phone: to62(wa),
      note: v('note') || undefined,
      payment_method: 'qris',
      return_url: location.origin + '/thanks',
      callback_url: location.origin + '/api/webhook',
      timestamp: new Date().toISOString()
    };

    const btn = ev.submitter || qs('#btnKirim');
    const prev = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Membuat pesanan…'; }

    try {
      const d1 = await postJSONAny(PUBLIC_API, payload);
      if (!d1 || (!d1.ok && !d1.order_id)) throw new Error(d1?.message || d1?.error || 'Create order gagal');

      lastOrderId = d1.order_id || d1.id || null;
      lastPayInfo = extractPay(d1);

      // tampilkan modal QR
      const totalPay = lastPayInfo.total || total;
      payTotal.textContent = 'Total: ' + rupiah(totalPay);
      payInfo.textContent  = lastPayInfo.expires ? ('Bayar sebelum: ' + new Date(lastPayInfo.expires).toLocaleString('id-ID')) : 'Scan untuk bayar';

      let qrImg = null;
      if (lastPayInfo.qrUrl) qrImg = lastPayInfo.qrUrl;
      else if (lastPayInfo.qrString) qrImg = buildQrImgUrlFromString(lastPayInfo.qrString);

      if (qrImg) { payQr.src = qrImg; payQr.style.display = ''; } else { payQr.style.display = 'none'; payExtra.innerHTML = `<div class="mt-2 small text-muted">Kode bayar belum tersedia dari server.</div>`; }

      btnOpen.classList.toggle('d-none', !lastPayInfo.deeplink);
      btnCopy.classList.toggle('d-none', !(lastPayInfo.qrString || lastPayInfo.va));
      payExtra.innerHTML = lastPayInfo.va ? `<div class="mt-2">VA Number: <code>${lastPayInfo.va}</code></div>` : (payExtra.innerHTML || '');

      payModal.show();

    } catch (err) {
      showErr('Gagal membuat pesanan: ' + (err.message || err));
    } finally {
      if (btn && prev) { btn.disabled = false; btn.innerHTML = prev; }
    }
  });

  // Tombol copy
  qs('#btnCopyCode')?.addEventListener('click', async () => {
    const txt = lastPayInfo?.qrString || lastPayInfo?.va || '';
    if (!txt) return;
    await navigator.clipboard.writeText(txt);
    const b = qs('#btnCopyCode'); b.textContent = 'Disalin ✓'; setTimeout(()=>b.textContent='Salin Kode',1200);
  });

  // Open app
  qs('#btnOpenPayApp')?.addEventListener('click', () => {
    if (lastPayInfo?.deeplink) window.open(lastPayInfo.deeplink, '_blank', 'noopener');
  });

  // Upload bukti via modal
  btnUpload?.addEventListener('click', async () => {
    try{
      // pakai input hidden
      if (!buktiInput) return alert('Input bukti tidak tersedia.');
      buktiInput.click();
      const waitPick = await new Promise((res) => {
        const onChange = () => { buktiInput.removeEventListener('change', onChange); res(buktiInput.files?.[0] || null); };
        buktiInput.addEventListener('change', onChange, { once:true });
      });
      const f = waitPick;
      if (!f) return;

      if (!/^image\//.test(f.type)) return alert('File harus gambar');
      if (f.size > 10*1024*1024) return alert('Maksimal 10MB');
      if (!lastOrderId) return alert('Order belum terbentuk. Klik "Buat Pesanan" dulu.');

      // spinner on button
      const prev = btnUpload.innerHTML;
      btnUpload.disabled = true;
      btnUpload.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Mengunggah…';

      const buktiBase64 = await compressImageToDataURL(f, {maxW:1000,maxH:1000,quality:0.65});
      const d2 = await postJSONAny(PUBLIC_API, { action:'upload_proof', order_id:lastOrderId, bukti:buktiBase64 });
      if (d2.ok) { alert('Bukti diterima. Terima kasih!'); payModal.hide(); }
      else { throw new Error(d2.error || 'Upload gagal'); }

    }catch(err){
      console.error(err);
      alert('Upload bukti gagal. ' + (err.message||err));
    } finally {
      btnUpload.disabled = false;
      btnUpload.innerHTML = 'Upload Bukti';
    }
  });

  // boot
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

  function boot() {
    const initCode = findPriceCode(getParam('game')) || Object.keys(PRICES)[0];
    renderNominals(initCode);
    renderFields(initCode);
    syncProductHeader(initCode);
  }

  boot();

  // Periksa (dummy)
  qs('#btnPeriksa')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Data akun terlihat valid. (Integrasi API cek akun bisa ditaruh di sini.)');
  });
})();
