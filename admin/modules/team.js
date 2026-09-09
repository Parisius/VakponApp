const PAGE_SIZE = 8;
let teamCache = [];
let page = 1;
let query = '';
let myId = null;

(async function () {
  const identity = await initShell({
    view: 'team',
    requiredRoles: NAV_ITEMS.find((i) => i.view === 'team').roles,
    onSearch: (q) => { query = q; page = 1; render(); },
  });
  if (!identity) return;
  myId = identity.userId;

  document.getElementById('newTeamMemberBtn').addEventListener('click', () => openTeamMemberForm(null));
  document.getElementById('exportCsv').addEventListener('click', exportCsvClick);
  document.getElementById('exportExcel').addEventListener('click', exportExcelClick);

  await load();
})();

async function load() {
  teamCache = await api('/admin/team');
  render();
}

function filtered() {
  if (!query) return teamCache;
  return teamCache.filter((m) => [m.fullName, m.email, ROLE_LABELS[m.role]].join(' ').toLowerCase().includes(query));
}

function render() {
  const list = filtered();
  const tbody = document.querySelector('#teamTable tbody');
  const pageItems = paginate(list, page, PAGE_SIZE);
  tbody.innerHTML = pageItems.map((m) => `
    <tr data-id="${m._id}">
      <td>${escapeHtml(m.fullName)}</td>
      <td>${escapeHtml(m.email)}</td>
      <td>${escapeHtml(ROLE_LABELS[m.role] || m.role)}</td>
      <td>${fmtDateTime(m.createdAt)}</td>
      <td>
        <div class="row-actions">
          <button data-reset="${m._id}">Réinitialiser le mot de passe</button>
          ${m._id === myId ? '' : `<button data-remove="${m._id}" class="danger">Retirer</button>`}
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="color:var(--muted);">Aucun membre.</td></tr>`;

  tbody.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-reset],[data-remove]')) return;
      openTeamMemberForm(teamCache.find((m) => m._id === row.dataset.id));
    });
  });
  tbody.querySelectorAll('[data-reset]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Réinitialiser le mot de passe de ce membre ?')) return;
      try {
        const { tempPassword } = await api(`/admin/team/${btn.dataset.reset}/reset-password`, { method: 'POST' });
        showToast(`Nouveau mot de passe temporaire : ${tempPassword}`, { type: 'success', persistent: true, copyValue: tempPassword });
      } catch (err) { showToast(err.message, { type: 'error' }); }
    });
  });
  tbody.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Retirer ce membre du back-office ?')) return;
      try { await api(`/admin/team/${btn.dataset.remove}`, { method: 'DELETE' }); load(); showToast('Membre retiré.'); }
      catch (err) { showToast(err.message, { type: 'error' }); }
    });
  });
  renderPagination('pagination', list.length, page, PAGE_SIZE, (p) => { page = p; render(); });
}

function openTeamMemberForm(member) {
  const isEdit = !!member;
  const body = document.getElementById('teamModalBody');
  const roleOptions = Object.entries(ROLE_LABELS)
    .map(([value, label]) => `<option value="${value}" ${member?.role === value ? 'selected' : ''}>${label}</option>`)
    .join('');
  body.innerHTML = `
    <h2 style="margin-bottom:16px;">${isEdit ? 'Modifier le membre' : 'Ajouter un membre'}</h2>
    <div class="field"><label>Nom complet</label><input id="tm-name" value="${escapeHtml(member?.fullName)}"></div>
    <div class="field"><label>Email</label><input id="tm-email" type="email" value="${escapeHtml(member?.email)}"></div>
    <div class="field"><label>Rôle</label><select id="tm-role">${roleOptions}</select></div>
    <button class="btn-pill full" id="saveTeamMemberBtn">${isEdit ? 'Enregistrer' : 'Créer le compte'}</button>
    <div class="auth-error" id="teamError"></div>
  `;
  body.querySelector('#saveTeamMemberBtn').addEventListener('click', async () => {
    const errorEl = document.getElementById('teamError');
    errorEl.textContent = '';
    const fullName = document.getElementById('tm-name').value.trim();
    const email = document.getElementById('tm-email').value.trim();
    const role = document.getElementById('tm-role').value;
    if (!fullName || !email) { errorEl.textContent = 'Nom et email sont requis.'; return; }
    try {
      if (isEdit) {
        await api(`/admin/team/${member._id}`, { method: 'PATCH', body: JSON.stringify({ fullName, email, role }) });
        closeModal('teamModal');
        load();
        showToast('Membre mis à jour.');
      } else {
        const { tempPassword } = await api('/admin/team', { method: 'POST', body: JSON.stringify({ fullName, email, role }) });
        closeModal('teamModal');
        load();
        showToast(`Compte créé pour ${fullName}. Mot de passe temporaire : ${tempPassword}`, { type: 'success', persistent: true, copyValue: tempPassword });
      }
    } catch (err) { errorEl.textContent = err.message; }
  });
  openModal('teamModal');
}

function exportCsvClick() {
  const rows = filtered().map((m) => [m.fullName, m.email, ROLE_LABELS[m.role] || m.role, fmtDateTime(m.createdAt)]);
  exportCsv('equipe', ['Nom', 'Email', 'Rôle', 'Créé le'], rows);
}
function exportExcelClick() {
  const rows = filtered().map((m) => [m.fullName, m.email, ROLE_LABELS[m.role] || m.role, fmtDateTime(m.createdAt)]);
  exportExcel('equipe', ['Nom', 'Email', 'Rôle', 'Créé le'], rows);
}
