/* global bootstrap, PRICES, GAMES */
(() => {
  // ====== CONFIG (ganti sesuai punyamu) ======
  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzj_k2IQ9IkJTWd0MpNA7sHOi2mMUQ2YwfkoIrERBz6lfIaXM-E51JDoK4HmnZB5blf/exec';
  const API_KEY     = '0caef89f31d82ec7922b7a33213b7801f653a72e34062ce4bc88d4c95e2f708e';
  // ===========================================

  const rupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
      .format(n || 0);

  // ====== DOM refs ======
  const gameSel      = document.getElementById('game');
  const nominalGrid  = document.getElementById('nominalGrid');
  const nominalError = document.getElementById('nominalError');
  const totalPriceEl = document.getElementById('totalPrice');
  const fastMode     = document.getElementById('fastMode');
  const payModalEl   = document.getElementById('payModal');
  const payModal     = new bootstrap.Modal(payModalEl);
  const buktiInput   = document.getElementById('buktiTransfer');
  const btnKirim     = document.getElementById('btnKirim');
  const modalTotal   = document.getElementById('modalTotal');
  const form         = document.getElementById('orderForm');
  document.getElementById('year').textContent = new Date().getFullYear();

  // ====== Utils ======
  async function postJSON(url, obj) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // simple request (anti-CORS ribet)
      body: JSON.stringify(obj)
    });
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { throw new Error(text || 'Bad JSON'); }
    if (!resp.ok)                 throw new Error(data.error || text || `HTTP ${resp.status}`);
    if (data && data.error)       throw new Error(data.error);
    return data;
  }

  // Kompres gambar -> dataURL (jpeg) biar upload cepat
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

  // ====== Isi pilihan game ======
  const frag = document.createDocumentFragment();
  (window.GAMES || Object.keys(PRICES)).forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = PRICES[code].key;
    frag.appendChild(opt);
  });
  gameSel.appendChild(frag);

  // Badge populer
  const popular = document.getElementById('popularBadges');
  (window.GAMES || Object.keys(PRICES)).forEach(code => {
    const a = document.createElement('a');
    a.href = '#order';
    a.className = 'badge-ghost text-decoration-none';
    a.textContent = PRICES[code].key;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      gameSel.value = code;
      renderNominals(code);
      window.scrollTo({ top: document.getElementById('order').offsetTop - 80, behavior: 'smooth' });
    });
    popular.appendChild(a);
  });

  let selectedGame = null;
  let selectedItemKey = null;
  let selectedPrice = 0;
  let currentFastFee = 0;

  const renderNominals = (code) => {
    selectedGame = code;
    selectedItemKey = null;
    selectedPrice = 0;
    currentFastFee = PRICES[code].fastFee || 0;
    nominalGrid.innerHTML = '';
    nominalError.classList.add('d-none');

    const items = PRICES[code].items;
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
        </label>
      `;
      nominalGrid.appendChild(col);
    });

    nominalGrid.querySelectorAll('input[name="nominal"]').forEach(inp => {
      inp.addEventListener('change', () => {
        selectedItemKey = inp.value;
        selectedPrice = PRICES[code].items[selectedItemKey].price;
        calcTotal();
      });
    });
    calcTotal();
  };

  const calcTotal = () => {
    let total = selectedPrice || 0;
    if (fastMode.checked && total > 0) total += currentFastFee || 0;
    totalPriceEl.textContent = rupiah(total);
    modalTotal.textContent = rupiah(total);
  };

  gameSel.addEventListener('change', e => {
    if (!e.target.value) {
      nominalGrid.innerHTML = '';
      totalPriceEl.textContent = rupiah(0);
      return;
    }
    renderNominals(e.target.value);
  });

  fastMode.addEventListener('change', calcTotal);

  // Submit form → buka modal
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!form.checkValidity()) {
      ev.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    if (!selectedItemKey) {
      nominalError.classList.remove('d-none');
      nominalGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    nominalError.classList.add('d-none');
    payModal.show();
  });

  // ====== Kirim (2 langkah) ======
  btnKirim.addEventListener('click', async () => {
    const f = buktiInput.files[0];
    if (!f) { alert('Upload bukti transfer dulu 🙏'); return; }
    if (!/^image\//.test(f.type)) { alert('File harus gambar ya.'); return; }
    if (f.size > 10 * 1024 * 1024) { alert('Maksimal 10MB ya.'); return; }

    const prev = btnKirim.innerHTML;
    btnKirim.disabled = true;
    btnKirim.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';

    try {
      // STEP 1 — create_order (tanpa bukti) → respon instan
      const basePayload = {
        api_key: API_KEY,
        action: 'create_order',
        origin: location.origin,
        game: selectedGame,
        item_key: selectedItemKey,
        player_id: form.player_id.value.trim(),
        server_id: form.server_id.value.trim(),
        whatsapp: form.whatsapp.value.trim(),
        note: form.note.value.trim(),
        fast: !!fastMode.checked,
        timestamp: new Date().toISOString()
      };

      const d1 = await postJSON(BACKEND_URL, basePayload);
      if (!d1.ok) throw new Error(d1.error || 'Create order failed');

      // Popup sukses CEPAT
      payModal.hide();
      alert(`Order diterima! ID: ${d1.order_id}\nBukti sedang diunggah...`);
      const wa = `https://wa.me/${basePayload.whatsapp}?text=${encodeURIComponent('Halo! Pesanan kamu kami terima. Order ID: ' + d1.order_id)}`;
      window.open(wa, '_blank', 'noopener');

      // STEP 2 — kompres & upload bukti (background)
      const buktiBase64 = await compressImageToDataURL(f, { maxW: 1200, maxH: 1200, quality: 0.75 });
      await postJSON(BACKEND_URL, {
        api_key: API_KEY,
        action: 'upload_proof',
        order_id: d1.order_id,
        bukti: buktiBase64
      });

      // Reset form
      form.reset();
      nominalGrid.innerHTML = '';
      selectedItemKey = null; selectedPrice = 0; calcTotal();

    } catch (err) {
      console.error(err);
      alert('Gagal memproses. Coba lagi ya 🙏\n\n' + (err.message || err));
    } finally {
      btnKirim.disabled = false;
      btnKirim.innerHTML = prev;
    }
  });
})();
