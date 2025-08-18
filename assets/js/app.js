/* global bootstrap, PRICES, GAMES */
(() => {
  const rupiah = (n) => new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(n||0);
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

  // populate game select
  const fragment = document.createDocumentFragment();
  GAMES.forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = PRICES[code].key;
    fragment.appendChild(opt);
  });
  gameSel.appendChild(fragment);

  // popular badges
  const popular = document.getElementById('popularBadges');
  GAMES.forEach(code=>{
    const span = document.createElement('a');
    span.href = '#order';
    span.className = 'badge-ghost text-decoration-none';
    span.textContent = PRICES[code].key;
    span.addEventListener('click', (e)=>{
      e.preventDefault();
      gameSel.value = code;
      renderNominals(code);
      window.scrollTo({top: document.getElementById('order').offsetTop - 80, behavior:'smooth'});
    });
    popular.appendChild(span);
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
    const keys = Object.keys(items);

    keys.forEach((key, idx) => {
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

    calcTotal();
    nominalGrid.querySelectorAll('input[name="nominal"]').forEach(inp=>{
      inp.addEventListener('change', () => {
        selectedItemKey = inp.value;
        selectedPrice = items[selectedItemKey].price;
        calcTotal();
      });
    });
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

  // Client-side form validation (Bootstrap)
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // validity
    if (!form.checkValidity()) {
      event.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    if (!selectedItemKey) {
      nominalError.classList.remove('d-none');
      nominalGrid.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    nominalError.classList.add('d-none');
    // open modal
    payModal.show();
  });

  // send order
  btnKirim.addEventListener('click', async () => {
    if (!buktiInput.files[0]) {
      alert('Upload bukti transfer dulu ya 🙏');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buktiBase64 = e.target.result; // data:image/...;base64,xxx

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
        timestamp: new Date().toISOString(),
        // client price sent for display only; server will recompute from a whitelist
        client_price: selectedPrice,
        origin: location.origin
      };

      try {
        const resp = await fetch('YOUR_APPS_SCRIPT_URL', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ ...payload, bukti: buktiBase64 })
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        payModal.hide();
        form.reset();
        nominalGrid.innerHTML = '';
        selectedItemKey = null;
        selectedPrice = 0;
        totalPriceEl.textContent = rupiah(0);
        alert(`Order berhasil! ID: ${data.order_id}\\nKami akan update via WhatsApp.`);
        // optional: open chat
        const wa = `https://wa.me/${payload.whatsapp}?text=${encodeURIComponent('Halo! Pesanan kamu kami terima. Order ID: ' + data.order_id)}`;
        window.open(wa, '_blank', 'noopener');
      } catch (err) {
        console.error(err);
        alert('Gagal kirim pesanan. Coba lagi ya 🙏');
      }
    };
    reader.readAsDataURL(buktiInput.files[0]);
  });

})();
