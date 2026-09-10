let allTranslations = [];
let groups = {};
let groupOrder = [];
let activeGroup = null;

// Friendly label for each key prefix (the part before the first "."), in
// the order translations naturally appear in default-ui-strings.ts —
// roughly top-to-bottom the order things appear on the site. A prefix not
// listed here (a future addition) just falls back to itself as the label,
// so this page never breaks when new keys are added.
const GROUP_LABELS = {
  meta: 'Méta / SEO',
  nav: 'Navigation',
  header: 'En-tête',
  heroMenu: 'Menu héro',
  a11y: 'Accessibilité',
  hero: 'Bannière héro',
  modal: 'Modale offre spéciale',
  vision: 'Section Notre Vision',
  guide: 'Page Guide du voyageur',
  apropos: 'Page À propos',
  contactPage: 'Page Contact',
  offres: 'Section Nos Offres',
  offerCard: "Carte d'offre",
  common: 'Général',
  surMesure: 'Offre Sur-Mesure',
  patrimoine: 'Section Patrimoine',
  heritage: 'Cartes Patrimoine',
  contact: 'Section Réservation (accueil)',
  form: 'Formulaire de réservation',
  footer: 'Pied de page',
};

(async function () {
  const identity = await initShell({ view: 'translations', requiredRoles: ['admin', 'operations', 'marketing'] });
  if (!identity) return;

  document.getElementById('topSearch').addEventListener('input', (e) => render(e.target.value.trim().toLowerCase()));

  await load();
})();

function keyGroup(key) {
  const i = key.indexOf('.');
  return i === -1 ? key : key.slice(0, i);
}

async function load() {
  try {
    allTranslations = await api('/admin/translations');
  } catch {
    showToast('Impossible de charger les traductions.', { type: 'error' });
    return;
  }

  groups = {};
  groupOrder = [];
  allTranslations.forEach((r) => {
    const g = keyGroup(r.key);
    if (!groups[g]) { groups[g] = []; groupOrder.push(g); }
    groups[g].push(r);
  });
  activeGroup = groupOrder[0] || null;

  renderTabs();
  render('');
}

function renderTabs() {
  const wrap = document.getElementById('i18nTabs');
  wrap.innerHTML = groupOrder.map((g) => `
    <button class="i18n-tab${g === activeGroup ? ' active' : ''}" data-group="${g}">
      ${GROUP_LABELS[g] || g}<span class="count">${groups[g].length}</span>
    </button>
  `).join('');

  wrap.querySelectorAll('.i18n-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeGroup = btn.dataset.group;
      const search = document.getElementById('topSearch');
      search.value = '';
      renderTabs();
      render('');
    });
  });
}

function render(filter) {
  const tbody = document.querySelector('#translationsTable tbody');
  const tabsEl = document.getElementById('i18nTabs');
  const noteEl = document.getElementById('i18nSearchNote');

  let rows;
  if (filter) {
    tabsEl.hidden = true;
    rows = allTranslations.filter((r) => r.key.toLowerCase().includes(filter) || r.fr.toLowerCase().includes(filter) || r.en.toLowerCase().includes(filter));
    noteEl.hidden = false;
    noteEl.textContent = rows.length
      ? `${rows.length} résultat${rows.length === 1 ? '' : 's'} pour « ${filter} » — dans toutes les sections.`
      : `Aucun résultat pour « ${filter} ».`;
  } else {
    tabsEl.hidden = false;
    noteEl.hidden = true;
    rows = groups[activeGroup] || [];
  }

  tbody.innerHTML = rows.map((r) => `
    <tr data-key="${r.key}">
      <td style="font-family:monospace;font-size:12.5px;color:var(--muted);vertical-align:top;padding-top:16px;">${r.key}</td>
      <td><textarea class="i18n-fr" rows="2" style="width:100%;background:var(--bg-2);border:1px solid var(--line);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13.5px;font-family:'Inter',sans-serif;resize:vertical;">${escapeAttr(r.fr)}</textarea></td>
      <td><textarea class="i18n-en" rows="2" style="width:100%;background:var(--bg-2);border:1px solid var(--line);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13.5px;font-family:'Inter',sans-serif;resize:vertical;">${escapeAttr(r.en)}</textarea></td>
      <td style="vertical-align:top;padding-top:14px;"><button class="small-btn" data-save>Enregistrer</button></td>
    </tr>
  `).join('') || `<tr><td colspan="4" style="color:var(--muted);text-align:center;">Aucun résultat.</td></tr>`;

  tbody.querySelectorAll('[data-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const key = tr.dataset.key;
      const fr = tr.querySelector('.i18n-fr').value;
      const en = tr.querySelector('.i18n-en').value;
      btn.disabled = true;
      try {
        await api('/admin/translations', { method: 'PATCH', body: JSON.stringify({ key, fr, en }) });
        const row = allTranslations.find((r) => r.key === key);
        if (row) { row.fr = fr; row.en = en; }
        showToast('Traduction enregistrée.');
      } catch {
        showToast("Échec de l'enregistrement.", { type: 'error' });
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
