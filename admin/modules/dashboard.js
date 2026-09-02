(async function () {
  const identity = await initShell({ view: 'dashboard' });
  if (!identity) return;

  const role = identity.role;
  const canSee = (view) => {
    const item = NAV_ITEMS.find((i) => i.view === view);
    return !item.roles || item.roles.includes(role);
  };

  const kpis = [];
  let reservations = [];
  let offers = [];
  let customers = [];
  let team = [];

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

  if (canSee('reservations')) {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = reservations.filter((r) => new Date(r.createdAt).getTime() >= sevenDaysAgo);
    kpis.push({ label: 'Réservations', value: reservations.length });
    kpis.push({ label: 'Nouvelles (7 jours)', value: recent.length });
  }
  if (canSee('offers')) {
    kpis.push({ label: 'Offres actives', value: offers.filter((o) => o.active).length });
  }
  if (canSee('customers')) {
    kpis.push({ label: 'Clients', value: customers.length });
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

  // --- Reservations over the last 14 days ---
  const chartEl = document.getElementById('reservationsChart');
  if (canSee('reservations')) {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const counts = days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      return reservations.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).length;
    });
    const max = Math.max(1, ...counts);
    chartEl.innerHTML = days.map((day, i) => `
      <div class="chart-bar-wrap" title="${counts[i]} le ${day.toLocaleDateString('fr-FR')}">
        <div class="chart-bar" style="height:${Math.max(2, (counts[i] / max) * 130)}px;"></div>
        <div class="chart-bar-label">${day.getDate()}/${day.getMonth() + 1}</div>
      </div>
    `).join('');
  } else {
    chartEl.innerHTML = '<div style="color:var(--muted);font-size:13.5px;">Non disponible pour votre rôle.</div>';
  }

  // --- Status breakdown ---
  const statusEl = document.getElementById('statusBreakdown');
  if (canSee('reservations')) {
    const counts = {};
    Object.keys(STATUS_LABELS).forEach((s) => { counts[s] = 0; });
    reservations.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
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
})();
