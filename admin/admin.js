(() => {
  // ====== GANTI dengan punyamu ======
  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbz67mFNM0lcKpBzAPiKzZP9C-ExNRHWgV5bsW-kASV4uiuXhw98I79Ye8t2Ry3kf7bB/exec';
  const API_KEY     = '9247673980b63fc24d566d89ba1d861527b8a99d37c13a91f33c29287f5fa761';
  // ==================================

  const $ = s => document.querySelector(s);
  const tbody = $('#tbody');
  const countInfo = $('#countInfo');
  const tEl = $('#toast'); const toast = new bootstrap.Toast(tEl); const toastMsg = $('#toastMsg');

  function showToast(msg){ toastMsg.textContent = msg; toast.show(); }
  function rupiah(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0); }
  function fmtTs(iso){ try{ return new Date(iso).toLocaleString('id-ID'); }catch{ return iso; } }
  function badge(st){ return `<span class="status-badge status-${st}">${st}</span>`; }

  // Remember ADMIN_KEY (opsional)
  const saved = localStorage.getItem('ADMIN_KEY'); if (saved) $('#adminKey').value = saved;
  $('#btnRemember').onclick = () => {
    const v = $('#adminKey').value.trim(); if(!v) return showToast('Isi ADMIN_KEY dulu');
    localStorage.setItem('ADMIN_KEY', v); showToast('ADMIN_KEY disimpan lokal');
  };

  async function postJSON(body){
    const resp = await fetch(BACKEND_URL, {
      method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body)
    });
    const text = await resp.text();
    let d; try { d = JSON.parse(text); } catch { throw new Error(text || 'Bad JSON'); }
    if (!resp.ok || d.error) throw new Error(d.error || text || `HTTP ${resp.status}`);
    return d;
  }

  async function loadOrders(){
    const adminKey = $('#adminKey').value.trim(); if (!adminKey) return showToast('Masukkan ADMIN_KEY dulu');
    const limit  = Number($('#limit').value || 100);
    const status = $('#filterStatus').value.trim().toUpperCase();
    const q      = $('#searchQ').value.trim();

    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border"></div> Loading...</td></tr>`;
    try{
      const res = await postJSON({ api_key:API_KEY, admin_key:adminKey, action:'list_orders', limit, status, q });
      render(res.items || []);
    }catch(err){
      tbody.innerHTML = `<tr><td colspan="7" class="text-danger">${err.message}</td></tr>`;
    }
  }

  function render(items){
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

  function bindRowActions(){
    // Copy ID
    tbody.querySelectorAll('[data-copy]').forEach(btn=>{
      btn.onclick = async () => {
        try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy ID',1200); }
        catch { showToast('Gagal copy'); }
      };
    });
    // Update status
    tbody.querySelectorAll('[data-status]').forEach(btn=>{
      btn.onclick = async () => {
        const adminKey = $('#adminKey').value.trim(); if (!adminKey) return showToast('ADMIN_KEY kosong');
        const status = btn.dataset.status; const orderId = btn.dataset.oid;
        const prev = btn.textContent; btn.disabled = true; btn.textContent = '...';
        try{
          await postJSON({ api_key:API_KEY, admin_key:adminKey, action:'update_status', order_id:orderId, status });
          const row = btn.closest('tr'); const badgeEl = row.querySelector('.status-badge');
          badgeEl.textContent = status; badgeEl.className = `status-badge status-${status}`;
          btn.textContent='OK'; setTimeout(()=>btn.textContent=prev,800);
          showToast(`Status ${orderId} → ${status}`);
        }catch(err){
          btn.textContent = prev; showToast('Gagal update: '+err.message);
        }finally{ btn.disabled = false; }
      };
    });
  }

  // Events
  $('#btnRefresh').onclick = loadOrders;
  $('#btnClear').onclick   = () => { $('#searchQ').value=''; $('#filterStatus').value=''; loadOrders(); };
  $('#searchQ').onkeyup    = e => { if (e.key === 'Enter') loadOrders(); };
  document.addEventListener('keydown', e => { if (e.key.toLowerCase()==='r') loadOrders(); });

  // Auto-load bila ADMIN_KEY tersimpan
  setTimeout(()=>{ if ($('#adminKey').value.trim()) loadOrders(); }, 250);
})();

