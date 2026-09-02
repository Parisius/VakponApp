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
      <td>${o.active ? '✅' : '—'}</td>
      <td><div class="row-actions"><button data-delete="${o._id}" class="danger">Suppr.</button></div></td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="color:var(--muted);">Aucune offre.</td></tr>`;

  tbody.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', (e) => { if (!e.target.closest('[data-delete]')) openOfferForm(row.dataset.id); });
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
    <button class="btn-pill full" id="saveOfferBtn" style="margin-top:20px;">Enregistrer</button>
  `;

  const includedList = body.querySelector('#includedList');
  const priceList = body.querySelector('#priceList');
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
  (o.includedItems || []).forEach((i) => addIncludedRow(i));
  (o.priceTiers || []).forEach((p) => addPriceRow(p.label, p.amount));
  body.querySelector('#addIncluded').addEventListener('click', () => addIncludedRow());
  body.querySelector('#addPrice').addEventListener('click', () => addPriceRow());

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
