const PAGE_SIZE = 8;
let offersCache = [];
let page = 1;
let query = '';

(async function () {
  const identity = await initShell({
    view: 'offers',
    requiredRoles: NAV_ITEMS.find((i) => i.view === 'offers').roles,
    onSearch: (q) => { query = q; page = 1; render(); },
  });
  if (!identity) return;

  document.getElementById('newOfferBtn').addEventListener('click', () => openOfferForm(null));
  document.getElementById('exportCsv').addEventListener('click', exportCsvClick);
  document.getElementById('exportExcel').addEventListener('click', exportExcelClick);

  await load();
})();

async function load() {
  offersCache = await api('/admin/offers');
  render();
}

function filtered() {
  if (!query) return offersCache;
  return offersCache.filter((o) => (o.title || '').toLowerCase().includes(query) || (o.slug || '').toLowerCase().includes(query));
}

function render() {
  const list = filtered();
  const tbody = document.querySelector('#offersTable tbody');
  const pageItems = paginate(list, page, PAGE_SIZE);
  tbody.innerHTML = pageItems.map((o) => `
    <tr data-id="${o._id}">
      <td>${escapeHtml(o.title)}</td>
      <td>${escapeHtml(o.priceTiers?.[0]?.amount) || '—'}</td>
      <td>${o.featured ? '✅' : '—'}</td>
      <td>${o.active ? '✅' : '<span style="color:var(--muted);">Expirée</span>'}</td>
      <td>
        <div class="row-actions">
          <button data-toggle="${o._id}">${o.active ? 'Désactiver' : 'Réactiver'}</button>
          <button data-delete="${o._id}" class="danger">Suppr.</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="color:var(--muted);">Aucune offre.</td></tr>`;

  tbody.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', (e) => { if (!e.target.closest('[data-delete],[data-toggle]')) openOfferForm(row.dataset.id); });
  });
  tbody.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const o = offersCache.find((x) => x._id === btn.dataset.toggle);
      const nextActive = !o.active;
      if (!confirm(nextActive ? 'Réactiver cette offre ?' : 'Marquer cette offre comme expirée ? Elle disparaîtra du site.')) return;
      try {
        await api(`/admin/offers/${btn.dataset.toggle}`, { method: 'PATCH', body: JSON.stringify({ active: nextActive }) });
        load();
        showToast(nextActive ? 'Offre réactivée.' : 'Offre marquée comme expirée.');
      } catch (err) { showToast(err.message, { type: 'error' }); }
    });
  });
  tbody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Supprimer cette offre ?')) return;
      try { await api(`/admin/offers/${btn.dataset.delete}`, { method: 'DELETE' }); load(); showToast('Offre supprimée.'); }
      catch (err) { showToast(err.message, { type: 'error' }); }
    });
  });
  renderPagination('pagination', list.length, page, PAGE_SIZE, (p) => { page = p; render(); });
}

function openOfferForm(id) {
  const o = id ? offersCache.find((x) => x._id === id) : {
    title: '', titleEn: '', slug: '', quote: '', quoteEn: '', description: '', descriptionEn: '',
    durationLabel: '', durationLabelEn: '', routeLabel: '', routeLabelEn: '',
    includedItems: [], includedItemsEn: [], priceTiers: [], images: [], featured: false, active: true,
    isHero: false, heroWelcomeText: '', heroWelcomeTextEn: '', heroHeadline: '', heroHeadlineEn: '',
    heroPinTitle: '', heroPinTitleEn: '', heroPinSub: '', heroPinSubEn: '',
    modalHeading: '', modalHeadingEn: '', modalDatesLabel: '', modalDatesLabelEn: '',
    modalPricingBreakdown: [], itinerary: [], modalNote: '', modalNoteEn: '',
  };
  const body = document.getElementById('offerModalBody');
  body.innerHTML = `
    <h2 style="margin-bottom:16px;">${id ? "Modifier l'offre" : 'Nouvelle offre'}</h2>
    <div class="form-grid">
      <div class="field"><label>Titre (FR)</label><input id="f-title" value="${escapeHtml(o.title)}"></div>
      <div class="field"><label>Titre (EN)</label><input id="f-titleEn" value="${escapeHtml(o.titleEn)}"></div>
    </div>
    <div class="field"><label>Slug (URL)</label><input id="f-slug" value="${escapeHtml(o.slug)}"></div>
    <div class="form-grid">
      <div class="field"><label>Citation (FR)</label><input id="f-quote" value="${escapeHtml(o.quote)}"></div>
      <div class="field"><label>Citation (EN)</label><input id="f-quoteEn" value="${escapeHtml(o.quoteEn)}"></div>
    </div>
    <div class="form-grid">
      <div class="field"><label>Description (FR)</label><textarea id="f-desc">${escapeHtml(o.description)}</textarea></div>
      <div class="field"><label>Description (EN)</label><textarea id="f-descEn">${escapeHtml(o.descriptionEn)}</textarea></div>
    </div>
    <div class="form-grid">
      <div class="field"><label>Durée FR (ex: 7 jours · 6 nuits)</label><input id="f-duration" value="${escapeHtml(o.durationLabel)}"></div>
      <div class="field"><label>Durée EN (ex: 7 days · 6 nights)</label><input id="f-durationEn" value="${escapeHtml(o.durationLabelEn)}"></div>
    </div>
    <div class="form-grid">
      <div class="field"><label>Itinéraire FR (ex: Cotonou · Ouidah)</label><input id="f-route" value="${escapeHtml(o.routeLabel)}"></div>
      <div class="field"><label>Itinéraire EN</label><input id="f-routeEn" value="${escapeHtml(o.routeLabelEn)}"></div>
    </div>
    <label style="font-size:12.5px;color:var(--muted);font-weight:600;">Ce qui est inclus (FR / EN)</label>
    <div id="includedList"></div>
    <button type="button" class="small-btn" id="addIncluded">+ Ajouter</button>
    <label style="font-size:12.5px;color:var(--muted);font-weight:600;display:block;margin-top:16px;">Tarifs (label FR / EN + montant)</label>
    <div id="priceList"></div>
    <button type="button" class="small-btn" id="addPrice">+ Ajouter</button>
    <div class="form-grid" style="margin-top:16px;">
      <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="f-featured" ${o.featured ? 'checked' : ''}> Mise en avant (carte spéciale)</label>
      <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="f-active" ${o.active !== false ? 'checked' : ''}> Active sur le site</label>
    </div>

    <hr style="border-color:var(--line);margin:22px 0;">
    <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
      <input type="checkbox" id="f-hero" ${o.isHero ? 'checked' : ''}> Afficher en une (section héros de la page d'accueil)
    </label>
    <div id="heroFields" style="${o.isHero ? '' : 'display:none;'}">
      <div class="form-grid">
        <div class="field"><label>Texte au-dessus du titre FR</label><input id="f-heroWelcome" value="${escapeHtml(o.heroWelcomeText)}"></div>
        <div class="field"><label>Texte au-dessus du titre EN</label><input id="f-heroWelcomeEn" value="${escapeHtml(o.heroWelcomeTextEn)}"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Titre du héros FR (une ligne = un retour à la ligne)</label><textarea id="f-heroHeadline">${escapeHtml(o.heroHeadline)}</textarea></div>
        <div class="field"><label>Titre du héros EN</label><textarea id="f-heroHeadlineEn">${escapeHtml(o.heroHeadlineEn)}</textarea></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Lieu affiché FR (titre)</label><input id="f-heroPinTitle" value="${escapeHtml(o.heroPinTitle)}"></div>
        <div class="field"><label>Lieu affiché EN (titre)</label><input id="f-heroPinTitleEn" value="${escapeHtml(o.heroPinTitleEn)}"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Lieu affiché FR (sous-titre)</label><input id="f-heroPinSub" value="${escapeHtml(o.heroPinSub)}"></div>
        <div class="field"><label>Lieu affiché EN (sous-titre)</label><input id="f-heroPinSubEn" value="${escapeHtml(o.heroPinSubEn)}"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Titre de la fenêtre FR</label><input id="f-modalHeading" value="${escapeHtml(o.modalHeading)}"></div>
        <div class="field"><label>Titre de la fenêtre EN</label><input id="f-modalHeadingEn" value="${escapeHtml(o.modalHeadingEn)}"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Dates affichées FR (texte libre)</label><input id="f-modalDates" value="${escapeHtml(o.modalDatesLabel)}"></div>
        <div class="field"><label>Dates affichées EN</label><input id="f-modalDatesEn" value="${escapeHtml(o.modalDatesLabelEn)}"></div>
      </div>

      <label style="font-size:12.5px;color:var(--muted);font-weight:600;">Détail des prix — label FR / EN + montant</label>
      <div id="pricingBreakdownList"></div>
      <button type="button" class="small-btn" id="addPricingRow">+ Ajouter une ligne</button>

      <label style="font-size:12.5px;color:var(--muted);font-weight:600;display:block;margin-top:16px;">Programme jour par jour (FR / EN)</label>
      <div id="itineraryList"></div>
      <button type="button" class="small-btn" id="addItineraryDay">+ Ajouter un jour</button>

      <div class="form-grid" style="margin-top:16px;">
        <div class="field"><label>Note de bas de page FR</label><textarea id="f-modalNote">${escapeHtml(o.modalNote)}</textarea></div>
        <div class="field"><label>Note de bas de page EN</label><textarea id="f-modalNoteEn">${escapeHtml(o.modalNoteEn)}</textarea></div>
      </div>
    </div>

    <button class="btn-pill full" id="saveOfferBtn" style="margin-top:20px;">Enregistrer</button>
  `;

  const includedList = body.querySelector('#includedList');
  const priceList = body.querySelector('#priceList');
  const pricingBreakdownList = body.querySelector('#pricingBreakdownList');
  const itineraryList = body.querySelector('#itineraryList');

  function addIncludedRow(value = '', valueEn = '') {
    const row = document.createElement('div');
    row.className = 'included-row';
    row.innerHTML = `<input data-field="fr" placeholder="FR" value="${escapeHtml(value)}"><input data-field="en" placeholder="EN" value="${escapeHtml(valueEn)}"><button type="button" class="small-btn">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    includedList.appendChild(row);
  }
  function addPriceRow(label = '', labelEn = '', amount = '') {
    const row = document.createElement('div');
    row.className = 'price-row';
    row.innerHTML = `<input data-field="label" placeholder="Label FR" value="${escapeHtml(label)}"><input data-field="labelEn" placeholder="Label EN" value="${escapeHtml(labelEn)}"><input data-field="amount" placeholder="Montant" value="${escapeHtml(amount)}"><button type="button" class="small-btn">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    priceList.appendChild(row);
  }
  function addPricingBreakdownRow(label = '', labelEn = '', amount = '', highlight = false) {
    const row = document.createElement('div');
    row.className = 'price-row';
    row.innerHTML = `
      <input data-field="label" placeholder="Label FR (ex: Prix normal)" value="${escapeHtml(label)}">
      <input data-field="labelEn" placeholder="Label EN" value="${escapeHtml(labelEn)}">
      <input data-field="amount" placeholder="Montant" value="${escapeHtml(amount)}">
      <label style="display:flex;align-items:center;gap:4px;font-size:11.5px;white-space:nowrap;"><input type="checkbox" class="pb-highlight" ${highlight ? 'checked' : ''}> Mise en avant</label>
      <button type="button" class="small-btn">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    pricingBreakdownList.appendChild(row);
  }
  function addItineraryRow(dateLabel = '', dateLabelEn = '', title = '', titleEn = '', description = '', descriptionEn = '') {
    const row = document.createElement('div');
    row.className = 'included-row';
    row.style.flexWrap = 'wrap';
    row.innerHTML = `
      <input data-field="dateLabel" placeholder="Date FR (ex: 1er oct. - Arrivée)" value="${escapeHtml(dateLabel)}" style="flex:1 1 45%;margin-bottom:6px;">
      <input data-field="dateLabelEn" placeholder="Date EN (ex: Oct 1 - Arrival)" value="${escapeHtml(dateLabelEn)}" style="flex:1 1 45%;margin-bottom:6px;">
      <input data-field="title" placeholder="Titre du jour FR" value="${escapeHtml(title)}" style="flex:1;">
      <input data-field="titleEn" placeholder="Titre du jour EN" value="${escapeHtml(titleEn)}" style="flex:1;">
      <input data-field="description" placeholder="Description FR" value="${escapeHtml(description)}" style="flex:2;">
      <input data-field="descriptionEn" placeholder="Description EN" value="${escapeHtml(descriptionEn)}" style="flex:2;">
      <button type="button" class="small-btn">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    itineraryList.appendChild(row);
  }

  (o.includedItems || []).forEach((i, idx) => addIncludedRow(i, (o.includedItemsEn || [])[idx] || ''));
  (o.priceTiers || []).forEach((p) => addPriceRow(p.label, p.labelEn, p.amount));
  (o.modalPricingBreakdown || []).forEach((p) => addPricingBreakdownRow(p.label, p.labelEn, p.amount, p.highlight));
  (o.itinerary || []).forEach((d) => addItineraryRow(d.dateLabel, d.dateLabelEn, d.title, d.titleEn, d.description, d.descriptionEn));
  body.querySelector('#addIncluded').addEventListener('click', () => addIncludedRow());
  body.querySelector('#addPrice').addEventListener('click', () => addPriceRow());
  body.querySelector('#addPricingRow').addEventListener('click', () => addPricingBreakdownRow());
  body.querySelector('#addItineraryDay').addEventListener('click', () => addItineraryRow());
  body.querySelector('#f-hero').addEventListener('change', (e) => {
    body.querySelector('#heroFields').style.display = e.target.checked ? '' : 'none';
  });

  body.querySelector('#saveOfferBtn').addEventListener('click', async () => {
    const field = (row, name) => row.querySelector(`[data-field="${name}"]`)?.value || '';
    const includedRows = [...includedList.querySelectorAll('.included-row')];
    const payload = {
      title: body.querySelector('#f-title').value,
      titleEn: body.querySelector('#f-titleEn').value,
      slug: body.querySelector('#f-slug').value,
      quote: body.querySelector('#f-quote').value,
      quoteEn: body.querySelector('#f-quoteEn').value,
      description: body.querySelector('#f-desc').value,
      descriptionEn: body.querySelector('#f-descEn').value,
      durationLabel: body.querySelector('#f-duration').value,
      durationLabelEn: body.querySelector('#f-durationEn').value,
      routeLabel: body.querySelector('#f-route').value,
      routeLabelEn: body.querySelector('#f-routeEn').value,
      includedItems: includedRows.map((row) => field(row, 'fr')).filter(Boolean),
      includedItemsEn: includedRows.map((row) => field(row, 'en')).filter(Boolean),
      priceTiers: [...priceList.querySelectorAll('.price-row')].map((row) => (
        { label: field(row, 'label'), labelEn: field(row, 'labelEn'), amount: field(row, 'amount') }
      )).filter((p) => p.label && p.amount),
      featured: body.querySelector('#f-featured').checked,
      active: body.querySelector('#f-active').checked,
      isHero: body.querySelector('#f-hero').checked,
      heroWelcomeText: body.querySelector('#f-heroWelcome').value,
      heroWelcomeTextEn: body.querySelector('#f-heroWelcomeEn').value,
      heroHeadline: body.querySelector('#f-heroHeadline').value,
      heroHeadlineEn: body.querySelector('#f-heroHeadlineEn').value,
      heroPinTitle: body.querySelector('#f-heroPinTitle').value,
      heroPinTitleEn: body.querySelector('#f-heroPinTitleEn').value,
      heroPinSub: body.querySelector('#f-heroPinSub').value,
      heroPinSubEn: body.querySelector('#f-heroPinSubEn').value,
      modalHeading: body.querySelector('#f-modalHeading').value,
      modalHeadingEn: body.querySelector('#f-modalHeadingEn').value,
      modalDatesLabel: body.querySelector('#f-modalDates').value,
      modalDatesLabelEn: body.querySelector('#f-modalDatesEn').value,
      modalNote: body.querySelector('#f-modalNote').value,
      modalNoteEn: body.querySelector('#f-modalNoteEn').value,
      modalPricingBreakdown: [...pricingBreakdownList.querySelectorAll('.price-row')].map((row) => (
        { label: field(row, 'label'), labelEn: field(row, 'labelEn'), amount: field(row, 'amount'), highlight: row.querySelector('.pb-highlight').checked }
      )).filter((p) => p.label && p.amount),
      itinerary: [...itineraryList.querySelectorAll('.included-row')].map((row) => ({
        dateLabel: field(row, 'dateLabel'), dateLabelEn: field(row, 'dateLabelEn'),
        title: field(row, 'title'), titleEn: field(row, 'titleEn'),
        description: field(row, 'description'), descriptionEn: field(row, 'descriptionEn'),
      })).filter((d) => d.dateLabel && d.title),
    };
    try {
      if (id) await api(`/admin/offers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/admin/offers', { method: 'POST', body: JSON.stringify(payload) });
      closeModal('offerModal');
      load();
      showToast(id ? 'Offre mise à jour.' : 'Offre créée.');
    } catch (err) { showToast(err.message, { type: 'error' }); }
  });

  openModal('offerModal');
}

function exportCsvClick() {
  const rows = filtered().map((o) => [o.title, o.slug, o.priceTiers?.[0]?.amount || '', o.featured ? 'Oui' : 'Non', o.active ? 'Oui' : 'Non']);
  exportCsv('offres', ['Titre', 'Slug', 'Prix individuel', 'Mise en avant', 'Active'], rows);
}
function exportExcelClick() {
  const rows = filtered().map((o) => [o.title, o.slug, o.priceTiers?.[0]?.amount || '', o.featured ? 'Oui' : 'Non', o.active ? 'Oui' : 'Non']);
  exportExcel('offres', ['Titre', 'Slug', 'Prix individuel', 'Mise en avant', 'Active'], rows);
}
