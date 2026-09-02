(async function () {
  const me = await initShell({ view: 'profile' });
  if (!me) return;

  populateCountrySelect(document.getElementById('profileCountry'), 'BJ');
  document.getElementById('profileName').value = me.fullName || '';
  document.getElementById('profileEmail').value = me.email || '';
  setPhoneValue(document.getElementById('profileCountry'), document.getElementById('profilePhone'), me.phone);

  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    try {
      await api('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: document.getElementById('profileName').value,
          phone: getPhoneValue(document.getElementById('profileCountry'), document.getElementById('profilePhone')),
        }),
      });
      showToast('Profil mis à jour.');
    } catch (err) {
      showToast(err.message, { type: 'error' });
    }
  });

  await renderDashboard();
})();

async function renderDashboard() {
  const reservations = await api('/reservations/me');

  const total = reservations.length;
  const upcoming = reservations
    .filter((r) => r.startDate && new Date(r.startDate).getTime() >= Date.now() && r.status !== 'cancelled')
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
  const active = reservations.filter((r) => !['completed', 'cancelled'].includes(r.status)).length;
  const messagesCount = reservations.reduce((sum, r) => sum + r.messages.length, 0);

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-tile"><div class="kpi-tile-label">Réservations</div><div class="kpi-tile-value">${total}</div></div>
    <div class="kpi-tile"><div class="kpi-tile-label">En cours</div><div class="kpi-tile-value">${active}</div></div>
    <div class="kpi-tile"><div class="kpi-tile-label">Messages échangés</div><div class="kpi-tile-value">${messagesCount}</div></div>
  `;

  const nextTripEl = document.getElementById('nextTripCard');
  if (upcoming) {
    nextTripEl.innerHTML = `
      <div class="next-trip-card">
        <div class="eyebrow">Prochain voyage</div>
        <h3>${upcoming.offerNameSnapshot || upcoming.offer?.title || 'Réservation'}</h3>
        <div class="meta">${fmtDate(upcoming.startDate)} → ${fmtDate(upcoming.endDate)} · ${upcoming.travelers} voyageur(s) · <span class="badge badge-${upcoming.status}">${STATUS_LABELS[upcoming.status]}</span></div>
      </div>`;
  } else {
    nextTripEl.innerHTML = '';
  }
}
