let reservationsCache = [];

(async function () {
  const me = await initShell({ view: 'reservations' });
  if (!me) return;

  await loadOffersIntoSelect();

  document.getElementById('newReservationBtn').addEventListener('click', () => {
    document.getElementById('newReservationForm').reset();
    document.getElementById('customOfferField').classList.add('hidden');
    document.getElementById('newReservationError').textContent = '';
    openModal('newReservationModal');
  });

  document.getElementById('nr-offer').addEventListener('change', (e) => {
    document.getElementById('customOfferField').classList.toggle('hidden', !!e.target.value);
  });

  document.getElementById('newReservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('newReservationError');
    errorEl.textContent = '';
    const offerId = document.getElementById('nr-offer').value;
    const payload = {
      offerId: offerId || undefined,
      offerName: offerId ? undefined : document.getElementById('nr-offerName').value,
      travelers: Number(document.getElementById('nr-travelers').value),
      startDate: document.getElementById('nr-start').value || undefined,
      endDate: document.getElementById('nr-end').value || undefined,
      message: document.getElementById('nr-message').value,
    };
    try {
      await api('/reservations', { method: 'POST', body: JSON.stringify(payload) });
      closeModal('newReservationModal');
      await loadReservations();
      showToast('Votre demande de réservation a été envoyée.');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  await loadReservations();
})();

async function loadOffersIntoSelect() {
  const offers = await api('/offers');
  const select = document.getElementById('nr-offer');
  select.innerHTML = '<option value="">Offre sur-mesure</option>' + offers.map((o) => `<option value="${o._id}">${o.title}</option>`).join('');
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('offer');
  if (preselect && offers.some((o) => o._id === preselect)) {
    select.value = preselect;
    document.getElementById('customOfferField').classList.add('hidden');
  }
}

async function loadReservations() {
  reservationsCache = await api('/reservations/me');
  const list = document.getElementById('reservationsList');
  list.innerHTML = reservationsCache.map((r) => `
    <div class="res-card" data-id="${r._id}">
      <h3>${r.offerNameSnapshot || r.offer?.title || 'Réservation'}</h3>
      <div class="meta">${r.travelers} voyageur(s) · ${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}</div>
      <span class="badge badge-${r.status}">${STATUS_LABELS[r.status]}</span>
    </div>
  `).join('') || "<div class=\"empty-note\">Vous n'avez pas encore de réservation. Cliquez sur « Nouvelle réservation » pour commencer, ou parcourez nos <a href=\"offers.html\" style=\"color:var(--accent);\">offres</a>.</div>";

  list.querySelectorAll('.res-card').forEach((card) => card.addEventListener('click', () => openReservationDetail(card.dataset.id)));

  const params = new URLSearchParams(window.location.search);
  if (params.get('new') === '1') {
    document.getElementById('newReservationError').textContent = '';
    openModal('newReservationModal');
  }
}

function openReservationDetail(id) {
  const r = reservationsCache.find((x) => x._id === id);
  if (!r) return;
  const body = document.getElementById('reservationModalBody');
  body.innerHTML = `
    <h2 style="margin-bottom:16px;">${r.offerNameSnapshot || 'Réservation'}</h2>
    <div class="detail-row"><span>Statut</span><span class="badge badge-${r.status}">${STATUS_LABELS[r.status]}</span></div>
    <div class="detail-row"><span>Voyageurs</span><b>${r.travelers}</b></div>
    <div class="detail-row"><span>Dates</span><b>${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}</b></div>
    <div class="detail-row"><span>Votre message</span><b>${r.message || '—'}</b></div>
    <div class="thread" id="thread">
      ${r.messages.map((m) => `<div class="thread-msg ${m.from}">${m.text}<div class="meta">${new Date(m.date).toLocaleString('fr-FR')}</div></div>`).join('') || '<div style="color:var(--muted);font-size:13px;">Aucun message pour le moment.</div>'}
    </div>
    <div class="field" style="margin-top:14px;"><textarea id="replyInput" placeholder="Écrire un message à l'équipe Vakpon Tours..."></textarea></div>
    <button class="btn-pill" id="sendReplyBtn">Envoyer</button>
  `;
  body.querySelector('#sendReplyBtn').addEventListener('click', async () => {
    const text = document.getElementById('replyInput').value.trim();
    if (!text) return;
    const updated = await api(`/reservations/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
    const idx = reservationsCache.findIndex((x) => x._id === id);
    reservationsCache[idx] = updated;
    openReservationDetail(id);
    showToast('Message envoyé.');
  });
  openModal('reservationModal');
}
