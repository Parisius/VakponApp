const PAGE_SIZE = 8;
let customersCache = [];
let page = 1;
let query = '';

(async function () {
  const identity = await initShell({
    view: 'customers',
    requiredRoles: NAV_ITEMS.find((i) => i.view === 'customers').roles,
    onSearch: (q) => { query = q; page = 1; render(); },
  });
  if (!identity) return;

  document.getElementById('exportCsv').addEventListener('click', exportCsvClick);
  document.getElementById('exportExcel').addEventListener('click', exportExcelClick);

  await load();
})();

async function load() {
  customersCache = await api('/admin/customers');
  render();
}

function filtered() {
  if (!query) return customersCache;
  return customersCache.filter((c) => [c.fullName, c.email, c.phone, ...(c.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(query));
}

function render() {
  const list = filtered();
  const tbody = document.querySelector('#customersTable tbody');
  const pageItems = paginate(list, page, PAGE_SIZE);
  tbody.innerHTML = pageItems.map((c) => `
    <tr data-id="${c._id}">
      <td>${c.fullName}</td>
      <td>${c.email}</td>
      <td>${c.phone || '—'}</td>
      <td>${(c.tags || []).map((t) => `<span class="tag-chip">${t}</span>`).join('')}</td>
      <td>${fmtDateTime(c.createdAt)}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="color:var(--muted);">Aucun client.</td></tr>`;

  tbody.querySelectorAll('tr[data-id]').forEach((row) => row.addEventListener('click', () => openCustomer(row.dataset.id)));
  renderPagination('pagination', list.length, page, PAGE_SIZE, (p) => { page = p; render(); });
}

function openCustomer(id) {
  const c = customersCache.find((x) => x._id === id);
  if (!c) return;
  const body = document.getElementById('customerModalBody');
  body.innerHTML = `
    <h2 style="margin-bottom:16px;">${c.fullName}</h2>
    <div class="detail-row"><span>Email</span><b>${c.email}</b></div>
    <div class="detail-row"><span>Téléphone</span><b>${c.phone || '—'}</b></div>
    <div class="detail-row"><span>Client depuis</span><b>${fmtDateTime(c.createdAt)}</b></div>
    <div class="field" style="margin-top:16px;"><label>Tags (séparés par virgule)</label><input id="c-tags" value="${(c.tags || []).join(', ')}"></div>
    <div class="field"><label>Notes internes</label><textarea id="c-notes">${c.adminNotes || ''}</textarea></div>
    <button class="btn-pill" id="saveCustomerBtn">Enregistrer</button>
  `;
  body.querySelector('#saveCustomerBtn').addEventListener('click', async () => {
    try {
      const tags = body.querySelector('#c-tags').value.split(',').map((t) => t.trim()).filter(Boolean);
      const adminNotes = body.querySelector('#c-notes').value;
      await api(`/admin/customers/${id}`, { method: 'PATCH', body: JSON.stringify({ tags, adminNotes }) });
      closeModal('customerModal');
      load();
      showToast('Client mis à jour.');
    } catch (err) { showToast(err.message, { type: 'error' }); }
  });
  openModal('customerModal');
}

function exportCsvClick() {
  const rows = filtered().map((c) => [c.fullName, c.email, c.phone || '', (c.tags || []).join('; '), fmtDateTime(c.createdAt)]);
  exportCsv('clients', ['Nom', 'Email', 'Téléphone', 'Tags', 'Depuis'], rows);
}
function exportExcelClick() {
  const rows = filtered().map((c) => [c.fullName, c.email, c.phone || '', (c.tags || []).join('; '), fmtDateTime(c.createdAt)]);
  exportExcel('clients', ['Nom', 'Email', 'Téléphone', 'Tags', 'Depuis'], rows);
}
