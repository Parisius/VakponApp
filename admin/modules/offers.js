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
      <td>${o.title}</td>
      <td>${o.priceTiers?.[0]?.amount || '—'}</td>
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
    title: '', slug: '', quote: '', description: '', durationLabel: '', routeLabel: '',
    includedItems: [], priceTiers: [], images: [], featured: false, active: true,
    isHero: false, heroWelcomeText: '', heroHeadline: '', heroPinTitle: '', heroPinSub: '',
    modalHeading: '', modalDatesLabel: '', modalPricingBreakdown: [], itinerary: [], modalNote: '',
  };
  const body = document.getElementById('offerModalBody');
  body.innerHTML = `
    <h2 style="margin-bottom:16px;">${id ? "Modifier l'offre" : 'Nouvelle offre'}</h2>
    <div class="form-grid">
      <div class="field"><label>Titre</label><input id="f-title" value="${o.title || ''}"></div>
      <div class="field"><label>Slug (URL)</label><input id="f-slug" value="${o.slug || ''}"></div>
    </div>
    <div class="field"><label>Citation</label><input id="f-quote" value="${o.quote || ''}"></div>
    <div class="field"><label>Description</label><textarea id="f-desc">${o.description || ''}</textarea></div>
    <div class="form-grid">
      <div class="field"><label>Durée (ex: 7 jours · 6 nuits)</label><input id="f-duration" value="${o.durationLabel || ''}"></div>
      <div class="field"><label>Itinéraire (ex: Cotonou · Ouidah)</label><input id="f-route" value="${o.routeLabel || ''}"></div>
    </div>
    <label style="font-size:12.5px;color:var(--muted);font-weight:600;">Ce qui est inclus</label>
    <div id="includedList"></div>
    <button type="button" class="small-btn" id="addIncluded">+ Ajouter</button>
    <label style="font-size:12.5px;color:var(--muted);font-weight:600;display:block;margin-top:16px;">Tarifs</label>
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
        <div class="field"><label>Texte au-dessus du titre (héros)</label><input id="f-heroWelcome" value="${o.heroWelcomeText || ''}"></div>
        <div class="field"><label>Titre du héros (une ligne = un retour à la ligne)</label><textarea id="f-heroHeadline">${o.heroHeadline || ''}</textarea></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Lieu affiché (titre)</label><input id="f-heroPinTitle" value="${o.heroPinTitle || ''}"></div>
        <div class="field"><label>Lieu affiché (sous-titre)</label><input id="f-heroPinSub" value="${o.heroPinSub || ''}"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Titre de la fenêtre détaillée</label><input id="f-modalHeading" value="${o.modalHeading || ''}"></div>
        <div class="field"><label>Dates affichées (texte libre)</label><input id="f-modalDates" value="${o.modalDatesLabel || ''}"></div>
      </div>

      <label style="font-size:12.5px;color:var(--muted);font-weight:600;">Détail des prix (fenêtre détaillée)</label>
      <div id="pricingBreakdownList"></div>
      <button type="button" class="small-btn" id="addPricingRow">+ Ajouter une ligne</button>

      <label style="font-size:12.5px;color:var(--muted);font-weight:600;display:block;margin-top:16px;">Programme jour par jour</label>
      <div id="itineraryList"></div>
      <button type="button" class="small-btn" id="addItineraryDay">+ Ajouter un jour</button>

      <div class="field" style="margin-top:16px;"><label>Note de bas de page (fenêtre détaillée)</label><textarea id="f-modalNote">${o.modalNote || ''}</textarea></div>
    </div>

    <button class="btn-pill full" id="saveOfferBtn" style="margin-top:20px;">Enregistrer</button>
  `;

  const includedList = body.querySelector('#includedList');
  const priceList = body.querySelector('#priceList');
  const pricingBreakdownList = body.querySelector('#pricingBreakdownList');
  const itineraryList = body.querySelector('#itineraryList');

  function addIncludedRow(value = '') {
    const row = document.createElement('div');
    row.className = 'included-row';
    row.innerHTML = `<input value="${value}"><button type="button" class="small-btn">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    includedList.appendChild(row);
  }
  function addPriceRow(label = '', amount = '') {
    const row = document.createElement('div');
    row.className = 'price-row';
    row.innerHTML = `<input placeholder="Label" value="${label}"><input placeholder="Montant" value="${amount}"><button type="button" class="small-btn">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    priceList.appendChild(row);
  }
  function addPricingBreakdownRow(label = '', amount = '', highlight = false) {
    const row = document.createElement('div');
    row.className = 'price-row';
    row.innerHTML = `
      <input placeholder="Label (ex: Prix normal)" value="${label}">
      <input placeholder="Montant" value="${amount}">
      <label style="display:flex;align-items:center;gap:4px;font-size:11.5px;white-space:nowrap;"><input type="checkbox" class="pb-highlight" ${highlight ? 'checked' : ''}> Mise en avant</label>
      <button type="button" class="small-btn">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    pricingBreakdownList.appendChild(row);
  }
  function addItineraryRow(dateLabel = '', title = '', description = '') {
    const row = document.createElement('div');
    row.className = 'included-row';
    row.style.flexWrap = 'wrap';
    row.innerHTML = `
      <input placeholder="Date (ex: 1er oct. - Arrivée)" value="${dateLabel}" style="flex:0 0 100%;margin-bottom:6px;">
      <input placeholder="Titre du jour" value="${title}" style="flex:1;">
      <input placeholder="Description" value="${description}" style="flex:2;">
      <button type="button" class="small-btn">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    itineraryList.appendChild(row);
  }

  (o.includedItems || []).forEach((i) => addIncludedRow(i));
  (o.priceTiers || []).forEach((p) => addPriceRow(p.label, p.amount));
  (o.modalPricingBreakdown || []).forEach((p) => addPricingBreakdownRow(p.label, p.amount, p.highlight));
  (o.itinerary || []).forEach((d) => addItineraryRow(d.dateLabel, d.title, d.description));
  body.querySelector('#addIncluded').addEventListener('click', () => addIncludedRow());
  body.querySelector('#addPrice').addEventListener('click', () => addPriceRow());
  body.querySelector('#addPricingRow').addEventListener('click', () => addPricingBreakdownRow());
  body.querySelector('#addItineraryDay').addEventListener('click', () => addItineraryRow());
  body.querySelector('#f-hero').addEventListener('change', (e) => {
    body.querySelector('#heroFields').style.display = e.target.checked ? '' : 'none';
  });

  body.querySelector('#saveOfferBtn').addEventListener('click', async () => {
    const payload = {
      title: body.querySelector('#f-title').value,
      slug: body.querySelector('#f-slug').value,
      quote: body.querySelector('#f-quote').value,
      description: body.querySelector('#f-desc').value,
      durationLabel: body.querySelector('#f-duration').value,
      routeLabel: body.querySelector('#f-route').value,
      includedItems: [...includedList.querySelectorAll('input')].map((i) => i.value).filter(Boolean),
      priceTiers: [...priceList.querySelectorAll('.price-row')].map((row) => {
        const inputs = row.querySelectorAll('input');
        return { label: inputs[0].value, amount: inputs[1].value };
      }).filter((p) => p.label && p.amount),
      featured: body.querySelector('#f-featured').checked,
      active: body.querySelector('#f-active').checked,
      isHero: body.querySelector('#f-hero').checked,
      heroWelcomeText: body.querySelector('#f-heroWelcome').value,
      heroHeadline: body.querySelector('#f-heroHeadline').value,
      heroPinTitle: body.querySelector('#f-heroPinTitle').value,
      heroPinSub: body.querySelector('#f-heroPinSub').value,
      modalHeading: body.querySelector('#f-modalHeading').value,
      modalDatesLabel: body.querySelector('#f-modalDates').value,
      modalNote: body.querySelector('#f-modalNote').value,
      modalPricingBreakdown: [...pricingBreakdownList.querySelectorAll('.price-row')].map((row) => {
        const inputs = row.querySelectorAll('input[type="text"], input:not([type])');
        return { label: inputs[0]?.value, amount: inputs[1]?.value, highlight: row.querySelector('.pb-highlight').checked };
      }).filter((p) => p.label && p.amount),
      itinerary: [...itineraryList.querySelectorAll('.included-row')].map((row) => {
        const inputs = row.querySelectorAll('input');
        return { dateLabel: inputs[0].value, title: inputs[1].value, description: inputs[2].value };
      }).filter((d) => d.dateLabel && d.title),
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
