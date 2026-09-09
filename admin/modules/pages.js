const SLUG_LABELS = { 'guide-du-voyageur': 'Guide du voyageur', 'a-propos': 'À propos' };
let currentSlug = 'guide-du-voyageur';
let pageCache = {};

(async function () {
  const identity = await initShell({
    view: 'pages',
    requiredRoles: NAV_ITEMS.find((i) => i.view === 'pages').roles,
  });
  if (!identity) return;

  document.querySelectorAll('#pageTabs .modal-tab').forEach((tab) => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('#pageTabs .modal-tab').forEach((t) => t.classList.toggle('active', t === tab));
      currentSlug = tab.dataset.slug;
      await load();
    });
  });

  await load();
})();

async function load() {
  if (!pageCache[currentSlug]) {
    pageCache[currentSlug] = await api(`/pages/${currentSlug}`);
  }
  render();
}

function render() {
  const p = pageCache[currentSlug];
  const editor = document.getElementById('pageEditor');
  editor.innerHTML = `
    <div class="table-wrap" style="padding:28px;">
      <h2 style="margin-bottom:18px;">${escapeHtml(SLUG_LABELS[currentSlug])} — En-tête</h2>
      <div class="form-grid">
        <div class="field"><label>Titre (FR)</label><input id="pg-heroTitleFr" value="${escapeHtml(p.heroTitleFr)}"></div>
        <div class="field"><label>Titre (EN)</label><input id="pg-heroTitleEn" value="${escapeHtml(p.heroTitleEn)}"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Sous-titre (FR)</label><textarea id="pg-heroSubtitleFr" rows="2">${escapeHtml(p.heroSubtitleFr)}</textarea></div>
        <div class="field"><label>Sous-titre (EN)</label><textarea id="pg-heroSubtitleEn" rows="2">${escapeHtml(p.heroSubtitleEn)}</textarea></div>
      </div>

      <hr style="border-color:var(--line);margin:24px 0;">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="margin:0;">Sections</h2>
        <button type="button" class="small-btn" id="addSection">+ Ajouter une section</button>
      </div>
      <div id="sectionsList"></div>

      <button class="btn-pill" id="savePageBtn" style="margin-top:20px;">Enregistrer</button>
    </div>
  `;

  const sectionsList = editor.querySelector('#sectionsList');

  function renumber() {
    sectionsList.querySelectorAll('.day-card .day-num').forEach((el, idx) => { el.textContent = `Section ${idx + 1}`; });
  }

  function addSectionCard(section = { icon: '', titleFr: '', titleEn: '', bodyFr: '', bodyEn: '' }) {
    const row = document.createElement('div');
    row.className = 'day-card';
    row.innerHTML = `
      <div class="day-card-head">
        <span class="day-num">Section ${sectionsList.children.length + 1}</span>
        <div style="display:flex;gap:10px;align-items:center;">
          <button type="button" class="small-btn" data-move="up" aria-label="Monter">↑</button>
          <button type="button" class="small-btn" data-move="down" aria-label="Descendre">↓</button>
          <button type="button" class="mini-card-remove" aria-label="Supprimer cette section">✕</button>
        </div>
      </div>
      <div class="field field-sm"><label>Icône (emoji)</label><input data-field="icon" value="${escapeHtml(section.icon)}" style="max-width:100px;"></div>
      <div class="form-grid">
        <div class="field field-sm"><label>Titre FR</label><input data-field="titleFr" value="${escapeHtml(section.titleFr)}"></div>
        <div class="field field-sm"><label>Titre EN</label><input data-field="titleEn" value="${escapeHtml(section.titleEn)}"></div>
      </div>
      <div class="form-grid">
        <div class="field field-sm"><label>Texte FR</label><textarea data-field="bodyFr" rows="4">${escapeHtml(section.bodyFr)}</textarea></div>
        <div class="field field-sm"><label>Texte EN</label><textarea data-field="bodyEn" rows="4">${escapeHtml(section.bodyEn)}</textarea></div>
      </div>`;
    row.querySelector('.mini-card-remove').addEventListener('click', () => { row.remove(); renumber(); });
    row.querySelector('[data-move="up"]').addEventListener('click', () => {
      const prev = row.previousElementSibling;
      if (prev) sectionsList.insertBefore(row, prev);
      renumber();
    });
    row.querySelector('[data-move="down"]').addEventListener('click', () => {
      const next = row.nextElementSibling;
      if (next) sectionsList.insertBefore(next, row);
      renumber();
    });
    sectionsList.appendChild(row);
  }

  (p.sections || []).forEach((s) => addSectionCard(s));
  editor.querySelector('#addSection').addEventListener('click', () => addSectionCard());

  editor.querySelector('#savePageBtn').addEventListener('click', async () => {
    const field = (row, name) => row.querySelector(`[data-field="${name}"]`)?.value || '';
    const payload = {
      heroTitleFr: editor.querySelector('#pg-heroTitleFr').value,
      heroTitleEn: editor.querySelector('#pg-heroTitleEn').value,
      heroSubtitleFr: editor.querySelector('#pg-heroSubtitleFr').value,
      heroSubtitleEn: editor.querySelector('#pg-heroSubtitleEn').value,
      sections: [...sectionsList.querySelectorAll('.day-card')].map((row) => ({
        icon: field(row, 'icon'),
        titleFr: field(row, 'titleFr'),
        titleEn: field(row, 'titleEn'),
        bodyFr: field(row, 'bodyFr'),
        bodyEn: field(row, 'bodyEn'),
      })).filter((s) => s.titleFr),
    };
    try {
      const updated = await api(`/admin/pages/${currentSlug}`, { method: 'PATCH', body: JSON.stringify(payload) });
      pageCache[currentSlug] = updated;
      showToast('Page mise à jour.');
    } catch (err) { showToast(err.message, { type: 'error' }); }
  });
}
