/* global bootstrap, PRICES, GAMES */
(() => {
  // ====== CONFIG: Ganti ini ======
  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycby69aPEr8C3VZHOB7GeOL0VeYSe5xxWmbWIkU0Rn0C3xt4bxYkiF-gBJjvrA6J2VPAU/exec';
  const API_KEY = '0caef89f31d82ec7922b7a33213b7801f653a72e34062ce4bc88d4c95e2f708e';
  // ===============================

  const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  // DOM
  const gameSel = document.getElementById('game');
  const nominalGrid = document.getElementById('nominalGrid');
  const nominalError = document.getElementById('nominalError');
  const totalPriceEl = document.getElementById('totalPrice');
  const fastMode = document.getElementById('fastMode');
  const payModalEl = document.getElementById('payModal');
  const payModal = new bootstrap.Modal(payModalEl);
  const buktiInput = document.getElementById('buktiTransfer');
  const btnKirim = document.getElementById('btnKirim');
  const modalTotal = document.getElementById('modalTotal');
  const form = document.getElementById('orderForm');
  document.getElementById('year').textContent = new Date().getFullYear();

  // isi select game
  const frag = document.createDocumentFragment();
  (window.GAMES || Object.keys(PRICES)).forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = PRICES[code].key;
    frag.appendChild(opt);
  });
  gameSel.appendChild(frag);

  // popular badges
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

  // submit → buka modal
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

  // kirim ke backend
  btnKirim.addEventListener('click', async () => {
    if (!buktiInput.files[0]) { alert('Upload bukti transfer dulu 🙏'); return; }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buktiBase64 = e.target.result;
      const payload = {
        game: selectedGame,
        game_name: PRICES[selectedGame].key,
        item_key: selectedItemKey,
        item_label: PRICES[selectedGame].items[selectedItemKey].label,
        player_id: form.player_id.value.trim(),
        server_id: form.server_id.value.trim(),
        whatsapp: form.whatsapp.value.trim(),
        note: form.note.value.trim(),
        fast: !!fastMode.checked,
        timestamp: new Date().toISOString()
      };

      try {
        // gunakan text/plain biar simple-request (tanpa preflight)
        const resp = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ ...payload, bukti: buktiBase64 })
        });

        const text = await resp.text();
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text}`);

        let data;
        try { data = JSON.parse(text); } catch { throw new Error(`Bad JSON: ${text}`); }
        if (!data || !data.ok) throw new Error(data && data.error ? data.error : 'Unknown error');

        payModal.hide();
        form.reset();
        nominalGrid.innerHTML = '';
        selectedItemKey = null;
        selectedPrice = 0;
        calcTotal();

        alert(`Order berhasil! ID: ${data.order_id}\nKami update via WhatsApp.`);
        const wa = `https://wa.me/${payload.whatsapp}?text=${encodeURIComponent('Halo! Pesanan kamu kami terima. Order ID: ' + data.order_id)}`;
        window.open(wa, '_blank', 'noopener');
      } catch (err) {
        console.error(err);
        alert('Gagal kirim pesanan. Coba lagi ya 🙏\n\n' + err.message);
      }
    };
    reader.readAsDataURL(buktiInput.files[0]);
  });
})();
