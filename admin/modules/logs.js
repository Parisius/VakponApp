const PAGE_SIZE = 8;
let logsCache = [];
let page = 1;
let query = '';

(async function () {
  const identity = await initShell({
    view: 'logs',
    requiredRoles: NAV_ITEMS.find((i) => i.view === 'logs').roles,
    onSearch: (q) => { query = q; page = 1; render(); },
  });
  if (!identity) return;

  document.getElementById('exportCsv').addEventListener('click', exportCsvClick);
  document.getElementById('exportExcel').addEventListener('click', exportExcelClick);

  logsCache = await api('/admin/logs');
  render();
})();

function filtered() {
  if (!query) return logsCache;
  return logsCache.filter((l) => [l.actorEmail, l.actorRole, ACTION_LABELS[l.action] || l.action, l.details].join(' ').toLowerCase().includes(query));
}

function render() {
  const list = filtered();
  const tbody = document.querySelector('#logsTable tbody');
  const pageItems = paginate(list, page, PAGE_SIZE);
  tbody.innerHTML = pageItems.map((l) => `
    <tr>
      <td>${fmtDateTime(l.createdAt)}</td>
      <td>${l.actorEmail}</td>
      <td>${ROLE_LABELS[l.actorRole] || l.actorRole}</td>
      <td>${ACTION_LABELS[l.action] || l.action}</td>
      <td>${l.details}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="color:var(--muted);">Aucune entrée.</td></tr>`;
  renderPagination('pagination', list.length, page, PAGE_SIZE, (p) => { page = p; render(); });
}

function exportCsvClick() {
  const rows = filtered().map((l) => [fmtDateTime(l.createdAt), l.actorEmail, ROLE_LABELS[l.actorRole] || l.actorRole, ACTION_LABELS[l.action] || l.action, l.details]);
  exportCsv('journal', ['Date', 'Utilisateur', 'Rôle', 'Action', 'Détails'], rows);
}
function exportExcelClick() {
  const rows = filtered().map((l) => [fmtDateTime(l.createdAt), l.actorEmail, ROLE_LABELS[l.actorRole] || l.actorRole, ACTION_LABELS[l.action] || l.action, l.details]);
  exportExcel('journal', ['Date', 'Utilisateur', 'Rôle', 'Action', 'Détails'], rows);
}
