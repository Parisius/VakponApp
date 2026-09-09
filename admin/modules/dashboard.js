const PERIOD_LABELS = { today: "Aujourd'hui", '7': '7 jours', '30': '30 jours', all: 'Tout' };
let currentPeriod = '7';
let reservations = [];
let offers = [];
let customers = [];
let team = [];
let canSee = () => false;

(async function () {
  const identity = await initShell({ view: 'dashboard' });
  if (!identity) return;

  const role = identity.role;
  canSee = (view) => {
    const item = NAV_ITEMS.find((i) => i.view === view);
    return !item.roles || item.roles.includes(role);
  };

  if (canSee('reservations')) {
    try { reservations = await api('/admin/reservations'); } catch { /* no access */ }
  }
  if (canSee('offers')) {
    try { offers = await api('/admin/offers'); } catch { /* no access */ }
  }
  if (canSee('customers')) {
    try { customers = await api('/admin/customers'); } catch { /* no access */ }
  }
  if (canSee('team')) {
    try { team = await api('/admin/team'); } catch { /* no access */ }
  }

  document.getElementById('periodFilter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-period]');
    if (!btn) return;
    currentPeriod = btn.dataset.period;
    document.querySelectorAll('#periodFilter [data-period]').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });

  render();
})();

function periodStartDate(period) {
  const d = new Date();
  if (period === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (period === '7') { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 6); return d; }
  if (period === '30') { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 29); return d; }
  return null;
}

function offerTitleOf(r) {
  return r.offer?.title || r.offerNameSnapshot || 'Offre sur-mesure';
}

function buildBuckets(period, allReservations) {
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);

  if (period === 'today') {
    const buckets = Array.from({ length: 24 }, (_, h) => {
      const start = new Date(today0); start.setHours(h);
      const end = new Date(start); end.setHours(h + 1);
      return { label: `${h}h`, count: 0, start, end };
    });
    allReservations.forEach((r) => {
      const t = new Date(r.createdAt);
      if (t >= today0) buckets[t.getHours()].count++;
    });
    return { buckets, labelEvery: 2 };
  }

  if (period === '7' || period === '30') {
    const days = period === '7' ? 7 : 30;
    const start = new Date(today0); start.setDate(start.getDate() - (days - 1));
    const buckets = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0, start: d, end: next });
    }
    fillBuckets(buckets, allReservations);
    return { buckets, labelEvery: days <= 14 ? 1 : Math.ceil(days / 14) };
  }

  // 'all'
  if (!allReservations.length) return { buckets: [], labelEvery: 1 };
  const earliest = allReservations.reduce((min, r) => Math.min(min, new Date(r.createdAt).getTime()), Date.now());
  const start0 = new Date(earliest); start0.setHours(0, 0, 0, 0);
  const totalDays = Math.round((today0 - start0) / 86400000) + 1;

  if (totalDays <= 60) {
    const buckets = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start0); d.setDate(d.getDate() + i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0, start: d, end: next });
    }
    fillBuckets(buckets, allReservations);
    return { buckets, labelEvery: Math.max(1, Math.ceil(totalDays / 14)) };
  }

  const buckets = [];
  let cursor = new Date(start0);
  while (cursor <= today0) {
    const next = new Date(cursor); next.setDate(next.getDate() + 7);
    buckets.push({ label: `${cursor.getDate()}/${cursor.getMonth() + 1}`, count: 0, start: new Date(cursor), end: next });
    cursor = next;
  }
  fillBuckets(buckets, allReservations);
  return { buckets, labelEvery: Math.max(1, Math.ceil(buckets.length / 14)) };
}

function fillBuckets(buckets, allReservations) {
  allReservations.forEach((r) => {
    const t = new Date(r.createdAt).getTime();
    const bucket = buckets.find((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (bucket) bucket.count++;
  });
}

function topOffers(list, limit = 5) {
  const counts = {};
  list.forEach((r) => { const title = offerTitleOf(r); counts[title] = (counts[title] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function render() {
  const periodStart = periodStartDate(currentPeriod);
  const periodReservations = periodStart
    ? reservations.filter((r) => new Date(r.createdAt) >= periodStart)
    : reservations;
  const periodLabel = PERIOD_LABELS[currentPeriod];

  // --- KPIs ---
  const kpis = [];
  if (canSee('reservations')) {
    kpis.push({ label: 'Réservations (total)', value: reservations.length });
    kpis.push({ label: `Nouvelles · ${periodLabel}`, value: periodReservations.length });
    const avgTravelers = periodReservations.length
      ? (periodReservations.reduce((s, r) => s + (r.travelers || 0), 0) / periodReservations.length).toFixed(1)
      : '—';
    kpis.push({ label: 'Voyageurs / réservation', value: avgTravelers });
  }
  if (canSee('offers')) {
    kpis.push({ label: 'Offres actives', value: offers.filter((o) => o.active).length });
  }
  if (canSee('customers')) {
    kpis.push({ label: 'Clients (total)', value: customers.length });
    const newCustomers = periodStart ? customers.filter((c) => new Date(c.createdAt) >= periodStart).length : customers.length;
    kpis.push({ label: `Nouveaux clients · ${periodLabel}`, value: newCustomers });
  }
  if (canSee('team')) {
    kpis.push({ label: "Membres de l'équipe", value: team.length });
  }

  document.getElementById('kpiGrid').innerHTML = kpis.map((k) => `
    <div class="kpi-tile">
      <div class="kpi-tile-label">${k.label}</div>
      <div class="kpi-tile-value">${k.value}</div>
    </div>
  `).join('') || '<div style="color:var(--muted);font-size:14px;">Aucune donnée disponible pour votre rôle.</div>';

  // --- Trend chart ---
  const chartTitle = document.getElementById('chartTitle');
  const chartEl = document.getElementById('reservationsChart');
  if (canSee('reservations')) {
    chartTitle.textContent = `Réservations · ${periodLabel}`;
    const { buckets, labelEvery } = buildBuckets(currentPeriod, reservations);
    const max = Math.max(1, ...buckets.map((b) => b.count));
    chartEl.innerHTML = buckets.map((b, i) => `
      <div class="chart-bar-wrap" title="${b.count} le ${b.label}">
        <div class="chart-bar" style="height:${Math.max(2, (b.count / max) * 130)}px;"></div>
        <div class="chart-bar-label">${i % labelEvery === 0 ? b.label : ''}</div>
      </div>
    `).join('') || '<div style="color:var(--muted);font-size:13.5px;">Aucune réservation.</div>';
  } else {
    chartTitle.textContent = 'Réservations';
    chartEl.innerHTML = '<div style="color:var(--muted);font-size:13.5px;">Non disponible pour votre rôle.</div>';
  }

  // --- Status breakdown ---
  const statusEl = document.getElementById('statusBreakdown');
  if (canSee('reservations')) {
    const counts = {};
    Object.keys(STATUS_LABELS).forEach((s) => { counts[s] = 0; });
    periodReservations.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    statusEl.innerHTML = Object.entries(counts).map(([status, count]) => `
      <div class="status-row-item">
        <span class="label">${STATUS_LABELS[status]}</span>
        <span class="bar-bg"><span class="bar-fill" style="width:${(count / max) * 100}%;"></span></span>
        <span class="count">${count}</span>
      </div>
    `).join('');
  } else {
    statusEl.innerHTML = '<div style="color:var(--muted);font-size:13.5px;">Non disponible pour votre rôle.</div>';
  }

  // --- Top offers ---
  const topOffersEl = document.getElementById('topOffers');
  if (canSee('reservations') && periodReservations.length) {
    const top = topOffers(periodReservations);
    const max = Math.max(1, ...top.map(([, c]) => c));
    topOffersEl.innerHTML = top.map(([title, count]) => `
      <div class="status-row-item">
        <span class="label" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
        <span class="bar-bg"><span class="bar-fill" style="width:${(count / max) * 100}%;"></span></span>
        <span class="count">${count}</span>
      </div>
    `).join('');
  } else if (!canSee('reservations')) {
    topOffersEl.innerHTML = '<div style="color:var(--muted);font-size:13.5px;">Non disponible pour votre rôle.</div>';
  } else {
    topOffersEl.innerHTML = '<div style="color:var(--muted);font-size:13.5px;">Aucune réservation sur cette période.</div>';
  }
}
