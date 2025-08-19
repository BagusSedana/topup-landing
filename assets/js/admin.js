// assets/js/admin.js
(() => {
  // endpoint selalu ke serverless function
  const BACKEND_URL = '/api/admin';

  const $ = s => document.querySelector(s);
  const tbody = $('#tbody');
  const countInfo = $('#countInfo');
  const toast = new bootstrap.Toast($('#toast'));
  const toastMsg = $('#toastMsg');

  const showToast = (m) => { toastMsg.textContent = m; toast.show(); };
  const rupiah = (n) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const fmtTs = (v) => { try { return new Date(v).toLocaleString('id-ID'); } catch { return v; } };
  const badge = (st) => `<span class="status-badge status-${st}">${st}</span>`;

  // simpan ADMIN_KEY lokal (opsional)
  const saved = localStorage.getItem('ADMIN_KEY'); if (saved) $('#adminKey').value = saved;
  $('#btnRemember').onclick = () => {
    const v = $('#adminKey').value.trim(); if (!v) return showToast('Isi ADMIN_KEY dulu');
    localStorage.setItem('ADMIN_KEY', v); showToast('ADMIN_KEY disimpan lokal');
  };

  async function postJSON(body) {
    const r = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // simple request
      body: JSON.stringify(body)
    });
    const text = await r.text();
    let d; try { d = JSON.parse(text); } catch { throw new Error(text || 'Bad JSON'); }
    if (!r.ok || d.error) throw new Error(d.error || text || `HTTP ${r.status}`);
    return d;
  }

  async function loadOrders() {
    const adminKey = $('#adminKey').value.trim();
    if (!adminKey) return showToast('Masukkan ADMIN_KEY dulu');

    const limit  = Number($('#limit').value || 100);
    const status = $('#filterStatus').value.trim().toUpperCase();
    const q      = $('#searchQ').value.trim();

    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border"></div> Loading...</td></tr>`;
    try {
      const res = await postJSON({ action:'list_orders', admin_key: adminKey, limit, status, q });
      render(res.items || []);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger">${err.message}</td></tr>`;
    }
  }

  function render(items) {
    countInfo.textContent = `${items.length} order ditampilkan`;
    tbody.innerHTML = items.map(o => {
      const pid = o.server_id ? `${o.player_id} (${o.server_id})` : o.player_id;
      const waLink = o.whatsapp ? `https://wa.me/${o.whatsapp}?text=${encodeURIComponent('Halo! Order '+o.order_id+' sedang diproses ya 🙏')}` : '';

      const proofBtn = o.bukti_url
        ? `<a class="btn btn-sm btn-outline-light" href="${o.bukti_url}" target="_blank" rel="noopener">Bukti</a>`
        : `<button class="btn btn-sm btn-outline-light" disabled>Bukti</button>`;

      const topupBtn = o.topupgim_url
        ? `<a class="btn btn-sm btn-primary" href="${o.topupgim_url}" target="_blank" rel="noopener">TopupGim</a>`
        : `<button class="btn btn-sm btn-secondary" disabled>No Link</button>`;

      const waBtn = o.whatsapp
        ? `<a class="btn btn-sm btn-success" href="${waLink}" target="_blank" rel="noopener">WA</a>`
        : `<button class="btn btn-sm btn-secondary" disabled>WA</button>`;

      return `
        <tr>
          <td>
            <div class="fw-semibold">${o.order_id}</div>
            <div class="muted small">${fmtTs(o.ts)}</div>
            <div class="mt-1">${badge(o.status)}</div>
          </td>
          <td>
            <div class="fw-semibold">${pid || '-'}</div>
            <div class="muted small">${o.whatsapp || '-'}</div>
            ${o.note ? `<div class="small small-note mt-1">📝 ${o.note}</div>` : ''}
          </td>
          <td>${o.game || '-'}</td>
          <td>${o.item || '-'} ${o.fast ? '<span class="badge text-bg-warning ms-1">FAST</span>' : ''}</td>
          <td>${rupiah(o.total)}</td>
          <td>${proofBtn}</td>
          <td class="d-flex flex-wrap gap-2">
            ${topupBtn}
            ${waBtn}
            <button class="btn btn-sm btn-outline-light" data-copy="${pid || ''}">Copy ID</button>
            <div class="vr d-none d-md-block"></div>
            <button class="btn btn-sm btn-outline-light" data-status="DONE" data-oid="${o.order_id}">DONE</button>
            <button class="btn btn-sm btn-outline-light" data-status="FAILED" data-oid="${o.order_id}">FAILED</button>
          </td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="7" class="text-center text-muted py-4">Belum ada data</td></tr>`;

    bindRowActions();
  }

  function bindRowActions() {
    // Copy ID
    tbody.querySelectorAll('[data-copy]').forEach(btn => {
      btn.onclick = async () => {
        try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy ID',1200); }
        catch { showToast('Gagal copy'); }
      };
    });
    // Update status
    tbody.querySelectorAll('[data-status]').forEach(btn => {
      btn.onclick = async () => {
        const adminKey = $('#adminKey').value.trim(); if (!adminKey) return showToast('ADMIN_KEY kosong');
        const status = btn.dataset.status; const orderId = btn.dataset.oid;
        const prev = btn.textContent; btn.disabled = true; btn.textContent = '...';
        try {
          await postJSON({ action:'update_status', admin_key: adminKey, order_id: orderId, status });
          const row = btn.closest('tr'); const badgeEl = row.querySelector('.status-badge');
          badgeEl.textContent = status; badgeEl.className = `status-badge status-${status}`;
          btn.textContent='OK'; setTimeout(()=>btn.textContent=prev,900);
          showToast(`Status ${orderId} → ${status}`);
        } catch (err) {
          btn.textContent = prev; showToast('Gagal update: ' + err.message);
        } finally { btn.disabled = false; }
      };
    });
  }

  // Events
  $('#btnRefresh').onclick = loadOrders;
  $('#searchQ').onkeyup = e => { if (e.key === 'Enter') loadOrders(); };
  document.addEventListener('keydown', e => { if (e.key.toLowerCase()==='r') loadOrders(); });

  // auto-load kalau ADMIN_KEY tersimpan
  setTimeout(() => { if ($('#adminKey').value.trim()) loadOrders(); }, 300);
})();
