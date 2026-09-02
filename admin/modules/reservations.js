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
      <td>${r.customer?.fullName || '—'}</td>
      <td>${r.offerNameSnapshot || r.offer?.title || '—'}</td>
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
  body.innerHTML = `
    <h2 style="margin-bottom:16px;">${r.offerNameSnapshot || 'Réservation'}</h2>
    <div class="detail-row"><span>Client</span><b>${r.customer?.fullName || ''} (${r.customer?.email || ''})</b></div>
    <div class="detail-row"><span>Téléphone</span><b>${r.customer?.phone || '—'}</b></div>
    <div class="detail-row"><span>Voyageurs</span><b>${r.travelers}</b></div>
    <div class="detail-row"><span>Dates</span><b>${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}</b></div>
    <div class="detail-row"><span>Message initial</span><b>${r.message || '—'}</b></div>
    <div class="status-row">
      ${Object.keys(STATUS_LABELS).map((s) => `<button ${canManage ? '' : 'disabled'} class="btn-outline small-btn" data-status="${s}" style="${s === r.status ? 'border-color:var(--accent);color:var(--accent);' : ''}">${STATUS_LABELS[s]}</button>`).join('')}
    </div>
    ${canManage ? `
      <div class="field"><label>Notes internes (non visibles par le client)</label><textarea id="adminNotesInput">${r.adminNotes || ''}</textarea></div>
      <button class="btn-outline" id="saveNotesBtn">Enregistrer les notes</button>
      <hr style="border-color:var(--line);margin:18px 0;">
    ` : '<hr style="border-color:var(--line);margin:18px 0;">'}
    <div class="thread" id="reservationThread">
      ${r.messages.map((m) => `<div class="thread-msg ${m.from}">${m.text}<div class="meta">${new Date(m.date).toLocaleString('fr-FR')}</div></div>`).join('') || '<div style="color:var(--muted);font-size:13px;">Aucun message.</div>'}
    </div>
    ${canManage ? `
      <div class="field" style="margin-top:14px;"><textarea id="newMessageInput" placeholder="Répondre au client..."></textarea></div>
      <button class="btn-pill" id="sendMessageBtn">Envoyer</button>
    ` : ''}
  `;

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
