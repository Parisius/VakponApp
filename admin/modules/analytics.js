let currentRange = '7d';

(async function () {
  const identity = await initShell({ view: 'analytics', requiredRoles: ['admin', 'operations', 'marketing'] });
  if (!identity) return;

  document.getElementById('periodFilter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-range]');
    if (!btn) return;
    currentRange = btn.dataset.range;
    document.querySelectorAll('#periodFilter [data-range]').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });

  render();
})();

function statusRows(containerId, rows, labelKey, emptyMessage) {
  const el = document.getElementById(containerId);
  if (!rows.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:13.5px;">${emptyMessage}</div>`;
    return;
  }
  const max = Math.max(1, ...rows.map((r) => r.views));
  el.innerHTML = rows.map((r) => `
    <div class="status-row-item">
      <span class="label" title="${r[labelKey]}">${r[labelKey] || '—'}</span>
      <span class="bar-bg"><span class="bar-fill" style="width:${(r.views / max) * 100}%;"></span></span>
      <span class="count">${r.views}</span>
    </div>
  `).join('');
}

async function render() {
  let data;
  try {
    data = await api(`/admin/analytics/summary?range=${currentRange}`);
  } catch {
    showToast('Impossible de charger les statistiques de visite.', { type: 'error' });
    return;
  }

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-tile">
      <div class="kpi-tile-label">Vues (total)</div>
      <div class="kpi-tile-value">${data.totals.views}</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-tile-label">Visiteurs uniques</div>
      <div class="kpi-tile-value">${data.totals.uniqueVisitors}</div>
    </div>
  `;

  const chartEl = document.getElementById('viewsChart');
  if (!data.byDay.length) {
    chartEl.innerHTML = '<div style="color:var(--muted);font-size:13.5px;">Aucune visite sur cette période.</div>';
  } else {
    const max = Math.max(1, ...data.byDay.map((d) => d.views));
    const labelEvery = data.byDay.length > 14 ? Math.ceil(data.byDay.length / 14) : 1;
    chartEl.innerHTML = data.byDay.map((d, i) => {
      const [y, m, day] = d.date.split('-');
      const label = `${day}/${m}`;
      return `
        <div class="chart-bar-wrap" title="${d.views} vue(s), ${d.uniqueVisitors} visiteur(s) le ${label}">
          <div class="chart-bar" style="height:${Math.max(2, (d.views / max) * 130)}px;"></div>
          <div class="chart-bar-label">${i % labelEvery === 0 ? label : ''}</div>
        </div>
      `;
    }).join('');
  }

  statusRows('topSources', data.topSources, 'source', 'Aucune donnée.');
  statusRows('topPages', data.topPages, 'path', 'Aucune donnée.');
  statusRows('topCountries', data.topCountries, 'country', 'Aucune donnée.');
  statusRows('deviceBreakdown', data.deviceBreakdown, 'device', 'Aucune donnée.');
}
