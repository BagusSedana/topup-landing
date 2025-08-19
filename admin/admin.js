(() => {
  const API_PATH = '/api/admin'; // proxy di Vercel
  const $ = s => document.querySelector(s);

  // ====== Auth layer (login screen) ======
  function getAdminKey(){
    return sessionStorage.getItem('ADMIN_KEY') || localStorage.getItem('ADMIN_KEY') || '';
  }
  function setAdminKey(v, remember){
    sessionStorage.removeItem('ADMIN_KEY');
    localStorage.removeItem('ADMIN_KEY');
    if (remember) localStorage.setItem('ADMIN_KEY', v);
    else sessionStorage.setItem('ADMIN_KEY', v);
  }
  function logout(){
    sessionStorage.removeItem('ADMIN_KEY'); localStorage.removeItem('ADMIN_KEY');
    $('#appWrap').style.display='none'; $('#loginWrap').style.display='flex';
  }

  $('#loginForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const key = $('#adminKeyInput').value.trim();
    if(!key) return;
    setAdminKey(key, $('#rememberMe').checked);
    $('#loginWrap').style.display='none';
    $('#appWrap').style.display='block';
    loadOrders();
  });
  $('#btnLogout').onclick = logout;

  // Auto-login jika ada key tersimpan
  (function bootstrapLogin(){
    const k = getAdminKey();
    if (k) { $('#loginWrap').style.display='none'; $('#appWrap').style.display='block'; loadOrders(); }
  })();

  // ====== UI helpers ======
  const tbody = $('#tbody');
  const countInfo = $('#countInfo');
  const tEl = $('#toast'); const toast = new bootstrap.Toast(tEl); const toastMsg = $('#toastMsg');
  const fmtTs = iso => { try { return new Date(iso).toLocaleString('id-ID'); } catch { return iso; } };
  const rupiah = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const badge = st => `<span class="status-badge status-${st}">${st}</span>`;
  function showToast(m){ toastMsg.textContent = m; toast.show(); }

  async function postJSON(body){
    const resp = await fetch(API_PATH, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const text = await resp.text();
    let d; try { d = JSON.parse(text); } catch { throw new Error(text || 'Bad JSON'); }
    if (!resp.ok || d.error) throw new Error(d.error || text || `HTTP ${resp.status}`);
    return d;
  }

  async function loadOrders(){
    const adminKey = getAdminKey();
    if (!adminKey) return showToast('Masukkan ADMIN_KEY dulu');
    const limit  = Number($('#limit').value || 100);
    const status = $('#filterStatus').value.trim().toUpperCase();
    const q      = $('#searchQ').value.trim();

    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border"></div> Loading...</td></tr>`;
    try{
      const res = await postJSON({ action:'list_orders', admin_key:adminKey, limit, status, q });
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
        ? `<a class="btn btn-sm btn-primary" href="${o.topupgim_url}" target="_blank" rel="noopener">TopUpGim</a>`
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
            ${o.note ? `<div class="small mt-1 muted">📝 ${o.note}</div>` : ''}
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
    }).join('') || `<tr><td colspan="7" class="text-center text-secondary py-4">Belum ada data</td></tr>`;

    bindRowActions();
  }

  function bindRowActions(){
    tbody.querySelectorAll('[data-copy]').forEach(btn=>{
      btn.onclick = async () => {
        try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy ID',900); }
        catch { showToast('Gagal copy'); }
      };
    });
    tbody.querySelectorAll('[data-status]').forEach(btn=>{
      btn.onclick = async () => {
        const adminKey = getAdminKey(); if (!adminKey) return showToast('ADMIN_KEY kosong');
        const status = btn.dataset.status; const orderId = btn.dataset.oid;
        const prev = btn.textContent; btn.disabled = true; btn.textContent = '...';
        try{
          await postJSON({ action:'update_status', admin_key:adminKey, order_id:orderId, status });
          const row = btn.closest('tr'); const badgeEl = row.querySelector('.status-badge');
          badgeEl.textContent = status; badgeEl.className = `status-badge status-${status}`;
          btn.textContent='OK'; setTimeout(()=>btn.textContent=prev,700);
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
})();
