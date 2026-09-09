let currentRange = '7d';
let currentPath = '';
let currentDevice = '';
let currentLogPage = 1;
const LOG_PAGE_SIZE = 20;

const DEVICE_LABELS = { desktop: 'Ordinateur', mobile: 'Mobile', tablet: 'Tablette' };

(async function () {
  const identity = await initShell({ view: 'analytics', requiredRoles: ['admin', 'operations', 'marketing'] });
  if (!identity) return;

  document.getElementById('periodFilter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-range]');
    if (!btn) return;
    currentRange = btn.dataset.range;
    document.querySelectorAll('#periodFilter [data-range]').forEach((b) => b.classList.toggle('active', b === btn));
    currentLogPage = 1;
    render();
  });
  document.getElementById('pathFilter').addEventListener('change', (e) => { currentPath = e.target.value; currentLogPage = 1; render(); });
  document.getElementById('deviceFilter').addEventListener('change', (e) => { currentDevice = e.target.value; currentLogPage = 1; render(); });

  document.getElementById('exportCsv').addEventListener('click', () => exportLog('csv'));
  document.getElementById('exportExcel').addEventListener('click', () => exportLog('excel'));

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
      <span class="label" title="${escapeHtml(r[labelKey])}">${escapeHtml(r[labelKey]) || '—'}</span>
      <span class="bar-bg"><span class="bar-fill" style="width:${(r.views / max) * 100}%;"></span></span>
      <span class="count">${r.views}</span>
    </div>
  `).join('');
}

function formatDuration(ms) {
  const totalSec = Math.round((ms || 0) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function renderLineChart(el, days) {
  if (!days.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13.5px;">Aucune visite sur cette période.</div>';
    return;
  }
  const cs = getComputedStyle(document.documentElement);
  const accent = cs.getPropertyValue('--accent').trim() || '#15b568';
  const accent2 = cs.getPropertyValue('--accent-2').trim() || '#4c86e0';
  const series = [
    { key: 'views', label: 'Visites', color: accent },
    { key: 'uniqueVisitors', label: 'Visiteurs uniques', color: accent2 },
  ];

  const W = 700, H = 200, padL = 6, padR = 6, padT = 10, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...days.flatMap((d) => series.map((s) => d[s.key])));
  const stepX = days.length > 1 ? innerW / (days.length - 1) : 0;
  const xAt = (i) => padL + stepX * i;
  const yAt = (v) => padT + innerH - (v / maxVal) * innerH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = padT + innerH * (1 - f);
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" style="stroke:var(--line);stroke-width:1;"></line>`;
  }).join('');

  const pathsHtml = series.map((s) => {
    const points = days.map((d, i) => `${xAt(i)},${yAt(d[s.key])}`);
    const linePath = `M${points.join(' L')}`;
    const areaPath = `M${xAt(0)},${padT + innerH} L${points.join(' L')} L${xAt(days.length - 1)},${padT + innerH} Z`;
    const dots = days.map((d, i) => `<circle cx="${xAt(i)}" cy="${yAt(d[s.key])}" r="2.5" fill="${s.color}"></circle>`).join('');
    return `<path d="${areaPath}" fill="${s.color}" fill-opacity="0.12" stroke="none"></path>
            <path d="${linePath}" fill="none" stroke="${s.color}" stroke-width="2"></path>${dots}`;
  }).join('');

  const labelEvery = days.length > 10 ? Math.ceil(days.length / 10) : 1;
  const xLabels = days.map((d, i) => {
    if (i % labelEvery !== 0 && i !== days.length - 1) return '';
    const [, m, day] = d.date.split('-');
    return `<text x="${xAt(i)}" y="${H - 4}" font-size="10" style="fill:var(--muted);" text-anchor="middle">${day}/${m}</text>`;
  }).join('');

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:200px;display:block;">
      ${gridLines}${pathsHtml}${xLabels}
    </svg>
    <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;">
      ${series.map((s) => `
        <div style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);">
          <span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block;"></span>${s.label}
        </div>`).join('')}
    </div>
  `;
}

function renderFunnel(funnel) {
  const el = document.getElementById('funnel');
  el.innerHTML = `
    <div class="funnel-step"><span>Landing</span><b>${funnel.landing}</b></div>
    <div class="funnel-drop">↓ ${funnel.rate}%</div>
    <div class="funnel-step"><span>Réservation soumise</span><b>${funnel.conversion}</b></div>
  `;
}

async function render() {
  let data;
  try {
    data = await api(`/admin/analytics/summary?range=${currentRange}&path=${encodeURIComponent(currentPath)}&device=${encodeURIComponent(currentDevice)}`);
  } catch {
    showToast('Impossible de charger les statistiques de visite.', { type: 'error' });
    return;
  }

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-tile"><div class="kpi-tile-label">Vues</div><div class="kpi-tile-value">${data.totals.views}</div></div>
    <div class="kpi-tile"><div class="kpi-tile-label">Visiteurs uniques</div><div class="kpi-tile-value">${data.totals.uniqueVisitors}</div></div>
    <div class="kpi-tile"><div class="kpi-tile-label">Durée moyenne</div><div class="kpi-tile-value">${formatDuration(data.avgDurationMs)}</div></div>
    <div class="kpi-tile"><div class="kpi-tile-label">Landing → Réservation</div><div class="kpi-tile-value">${data.funnel.rate}%</div></div>
  `;

  renderLineChart(document.getElementById('viewsChart'), data.byDay);
  renderFunnel(data.funnel);
  statusRows('topSources', data.topSources, 'source', 'Aucune donnée.');
  statusRows('topPages', data.topPages, 'path', 'Aucune donnée.');
  statusRows('topCountries', data.topCountries, 'country', 'Aucune donnée.');
  statusRows('topCities', data.topCities, 'city', 'Aucune donnée.');
  statusRows('deviceBreakdown', data.deviceBreakdown.map((d) => ({ ...d, device: DEVICE_LABELS[d.device] || d.device })), 'device', 'Aucune donnée.');

  const pathFilter = document.getElementById('pathFilter');
  const knownPaths = new Set(Array.from(pathFilter.options).map((o) => o.value));
  data.topPages.forEach((p) => {
    if (!knownPaths.has(p.path)) {
      pathFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(p.path)}">${escapeHtml(p.path)}</option>`);
      knownPaths.add(p.path);
    }
  });
  pathFilter.value = currentPath;

  await renderLog();
}

async function renderLog() {
  let data;
  try {
    data = await api(`/admin/analytics/log?range=${currentRange}&path=${encodeURIComponent(currentPath)}&device=${encodeURIComponent(currentDevice)}&page=${currentLogPage}&limit=${LOG_PAGE_SIZE}`);
  } catch {
    showToast('Impossible de charger le journal des visites.', { type: 'error' });
    return;
  }

  const tbody = document.querySelector('#logTable tbody');
  tbody.innerHTML = data.rows.map((r) => `
    <tr>
      <td>${new Date(r.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
      <td>${escapeHtml(r.page)}</td>
      <td>${escapeHtml(r.visitor)}</td>
      <td>${escapeHtml(r.session)}</td>
      <td>${escapeHtml(r.referrer)}</td>
      <td>${escapeHtml(r.utmSource)}</td>
      <td>${escapeHtml(r.country)}</td>
      <td>${escapeHtml(r.city) || '—'}</td>
      <td>${escapeHtml(DEVICE_LABELS[r.device] || r.device)}</td>
      <td>${escapeHtml(r.browser)}</td>
      <td>${escapeHtml(r.os)}</td>
      <td>${formatDuration(r.durationMs)}</td>
    </tr>
  `).join('') || `<tr><td colspan="12" style="color:var(--muted);text-align:center;">Aucune visite sur cette période.</td></tr>`;

  renderPagination('logPagination', data.total, currentLogPage, LOG_PAGE_SIZE, (p) => { currentLogPage = p; renderLog(); });
}

async function exportLog(format) {
  let data;
  try {
    data = await api(`/admin/analytics/log?range=${currentRange}&path=${encodeURIComponent(currentPath)}&device=${encodeURIComponent(currentDevice)}&page=1&limit=1000`);
  } catch {
    showToast("Impossible d'exporter le journal des visites.", { type: 'error' });
    return;
  }
  const headers = ['Date', 'Page', 'Visiteur', 'Session', 'Référent', 'Source UTM', 'Pays', 'Ville', 'Appareil', 'Navigateur', 'OS', 'Durée'];
  const rows = data.rows.map((r) => [
    new Date(r.date).toLocaleString('fr-FR'), r.page, r.visitor, r.session, r.referrer, r.utmSource,
    r.country, r.city || '—', DEVICE_LABELS[r.device] || r.device, r.browser, r.os, formatDuration(r.durationMs),
  ]);
  if (format === 'csv') exportCsv('journal-des-visites', headers, rows);
  else exportExcel('journal-des-visites', headers, rows);
}
