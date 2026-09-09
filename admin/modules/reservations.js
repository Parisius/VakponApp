const PAGE_SIZE = 8;
let reservationsCache = [];
let page = 1;
let query = '';
let canManage = false;

(async function () {
  const identity = await initShell({
    view: 'reservations',
    requiredRoles: NAV_ITEMS.find((i) => i.view === 'reservations').roles,
    onSearch: (q) => { query = q; page = 1; render(); },
  });
  if (!identity) return;
  canManage = ['admin', 'operations', 'service_client', 'support'].includes(identity.role);

  document.getElementById('statusFilter').addEventListener('change', () => { page = 1; load(); });
  document.getElementById('exportCsv').addEventListener('click', exportCsvClick);
  document.getElementById('exportExcel').addEventListener('click', exportExcelClick);

  await load();
})();

async function load() {
  const status = document.getElementById('statusFilter').value;
  reservationsCache = await api(`/admin/reservations${status ? `?status=${status}` : ''}`);
  render();
}

function filtered() {
  if (!query) return reservationsCache;
  return reservationsCache.filter((r) => [
    r.customer?.fullName, r.customer?.email, r.offerNameSnapshot, r.offer?.title, STATUS_LABELS[r.status],
  ].filter(Boolean).join(' ').toLowerCase().includes(query));
}

function render() {
  const list = filtered();
  const tbody = document.querySelector('#reservationsTable tbody');
  const pageItems = paginate(list, page, PAGE_SIZE);
  tbody.innerHTML = pageItems.map((r) => `
    <tr data-id="${r._id}">
      <td>${escapeHtml(r.customer?.fullName) || '—'}</td>
      <td>${escapeHtml(r.offerNameSnapshot || r.offer?.title) || '—'}</td>
      <td>${r.travelers}</td>
      <td>${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}</td>
      <td><span class="badge badge-${r.status}">${STATUS_LABELS[r.status]}</span></td>
      <td>${fmtDateTime(r.createdAt)}</td>
    </tr>
  `).join('') || `<tr><td colspan="6" style="color:var(--muted);">Aucune réservation.</td></tr>`;

  tbody.querySelectorAll('tr[data-id]').forEach((row) => row.addEventListener('click', () => openReservation(row.dataset.id)));
  renderPagination('pagination', list.length, page, PAGE_SIZE, (p) => { page = p; render(); });
}

function openReservation(id) {
  const r = reservationsCache.find((x) => x._id === id);
  if (!r) return;
  const body = document.getElementById('reservationModalBody');
  const initial = (r.customer?.fullName || '?').trim().charAt(0).toUpperCase();
  body.innerHTML = `
    <div class="modal-split">
      <div class="modal-side">
        <div class="modal-side-icon">${initial}</div>
        <div class="modal-side-title">${escapeHtml(r.customer?.fullName) || 'Client'}</div>
        <div class="modal-side-sub">${escapeHtml(r.offerNameSnapshot) || 'Réservation'}</div>
        <div class="modal-side-stats">
          <div class="modal-side-stat"><span>Email</span><span>${escapeHtml(r.customer?.email) || '—'}</span></div>
          <div class="modal-side-stat"><span>Téléphone</span><span>${escapeHtml(r.customer?.phone) || '—'}</span></div>
          <div class="modal-side-stat"><span>Voyageurs</span><span>${r.travelers}</span></div>
          <div class="modal-side-stat"><span>Dates</span><span>${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}</span></div>
          <div class="modal-side-stat"><span>Statut</span><span><span class="badge badge-${r.status}">${STATUS_LABELS[r.status]}</span></span></div>
        </div>
        <label style="font-size:11.5px;color:var(--muted);font-weight:600;display:block;margin:18px 0 8px;">Changer le statut</label>
        <div class="status-row" style="margin:0;">
          ${Object.keys(STATUS_LABELS).map((s) => `<button ${canManage ? '' : 'disabled'} class="btn-outline small-btn" data-status="${s}" style="${s === r.status ? 'border-color:var(--accent);color:var(--accent);' : ''}">${STATUS_LABELS[s]}</button>`).join('')}
        </div>
      </div>
      <div class="modal-main">
        <h2 style="margin-bottom:4px;">${escapeHtml(r.offerNameSnapshot) || 'Réservation'}</h2>
        <div class="modal-tabs">
          <button type="button" class="modal-tab active" data-tab="messages">Messages</button>
          ${canManage ? '<button type="button" class="modal-tab" data-tab="notes">Notes internes</button>' : ''}
        </div>

        <div class="tab-panel active" data-panel="messages">
          <div class="detail-row"><span>Message initial</span><b>${escapeHtml(r.message) || '—'}</b></div>
          <div class="thread" id="reservationThread">
            ${r.messages.map((m) => `<div class="thread-msg ${m.from}">${escapeHtml(m.text)}<div class="meta">${new Date(m.date).toLocaleString('fr-FR')}</div></div>`).join('') || '<div style="color:var(--muted);font-size:13px;">Aucun message.</div>'}
          </div>
          ${canManage ? `
            <div class="field" style="margin-top:14px;"><textarea id="newMessageInput" placeholder="Répondre au client..."></textarea></div>
            <button class="btn-pill" id="sendMessageBtn">Envoyer</button>
          ` : ''}
        </div>

        ${canManage ? `
          <div class="tab-panel" data-panel="notes">
            <div class="field"><label>Notes internes (non visibles par le client)</label><textarea id="adminNotesInput" rows="8">${escapeHtml(r.adminNotes)}</textarea></div>
            <button class="btn-outline" id="saveNotesBtn">Enregistrer les notes</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  body.querySelectorAll('.modal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      body.querySelectorAll('.modal-tab').forEach((t) => t.classList.toggle('active', t === tab));
      body.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
    });
  });

  if (canManage) {
    body.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/admin/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: btn.dataset.status }) });
          await load();
          openReservation(id);
          showToast(`Statut mis à jour : ${STATUS_LABELS[btn.dataset.status]}.`);
        } catch (err) { showToast(err.message, { type: 'error' }); }
      });
    });
    body.querySelector('#saveNotesBtn').addEventListener('click', async () => {
      try {
        await api(`/admin/reservations/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ adminNotes: document.getElementById('adminNotesInput').value }) });
        showToast('Notes internes enregistrées.');
      } catch (err) { showToast(err.message, { type: 'error' }); }
    });
    body.querySelector('#sendMessageBtn').addEventListener('click', async () => {
      try {
        const text = document.getElementById('newMessageInput').value.trim();
        if (!text) return;
        await api(`/reservations/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
        const updated = await api(`/reservations/${id}`);
        const idx = reservationsCache.findIndex((x) => x._id === id);
        reservationsCache[idx] = updated;
        openReservation(id);
        showToast('Message envoyé.');
      } catch (err) { showToast(err.message, { type: 'error' }); }
    });
  }

  openModal('reservationModal');
}

function exportCsvClick() {
  const rows = filtered().map((r) => [
    r.customer?.fullName || '', r.customer?.email || '', r.offerNameSnapshot || '', r.travelers,
    fmtDate(r.startDate), fmtDate(r.endDate), STATUS_LABELS[r.status], fmtDateTime(r.createdAt),
  ]);
  exportCsv('reservations', ['Client', 'Email', 'Offre', 'Voyageurs', 'Début', 'Fin', 'Statut', 'Créée le'], rows);
}
function exportExcelClick() {
  const rows = filtered().map((r) => [
    r.customer?.fullName || '', r.customer?.email || '', r.offerNameSnapshot || '', r.travelers,
    fmtDate(r.startDate), fmtDate(r.endDate), STATUS_LABELS[r.status], fmtDateTime(r.createdAt),
  ]);
  exportExcel('reservations', ['Client', 'Email', 'Offre', 'Voyageurs', 'Début', 'Fin', 'Statut', 'Créée le'], rows);
}
