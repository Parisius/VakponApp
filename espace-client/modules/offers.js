(async function () {
  const me = await initShell({ view: 'offers' });
  if (!me) return;

  const offers = await api('/offers');
  const grid = document.getElementById('offersGrid');
  grid.innerHTML = offers.map(renderOfferCard).join('') + surMesureCard();

  grid.querySelectorAll('[data-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.href = `index.html?offer=${btn.dataset.book}&new=1`;
    });
  });
  const surMesureBtn = document.getElementById('surMesureBtn');
  if (surMesureBtn) surMesureBtn.addEventListener('click', () => { window.location.href = 'index.html?new=1'; });
})();

function surMesureCard() {
  return `
    <div class="ec-offer-card">
      <img src="images/statue-de-l-amazone-esplanade-de-cotonou.jpg" alt="Sur-Mesure">
      <div class="ec-offer-card-body">
        <h3>Sur-Mesure</h3>
        <div class="ec-offer-quote">« Vous définissez votre aventure, nous la réalisons. »</div>
        <p class="ec-offer-desc">Décrivez-nous votre projet de voyage et notre équipe vous répondra sous 24 heures avec une proposition personnalisée.</p>
        <button class="btn-pill full" id="surMesureBtn" style="margin-top:8px;">Créer mon trajet</button>
      </div>
    </div>`;
}

function renderOfferCard(offer) {
  const img = (offer.images && offer.images[0]) || 'images/route-des-captifs.jpg';
  const price = offer.priceTiers?.[0] ? `${offer.priceTiers[0].label} : ${offer.priceTiers[0].amount}` : '';
  const meta = [offer.durationLabel, offer.routeLabel].filter(Boolean).join(' — ');
  return `
    <div class="ec-offer-card${offer.featured ? ' featured' : ''}">
      <img src="${img}" alt="${offer.title}">
      <div class="ec-offer-card-body">
        ${offer.featured ? '<span class="ec-offer-badge">Offre spéciale</span>' : ''}
        <h3>${offer.title}</h3>
        ${offer.quote ? `<div class="ec-offer-quote">« ${offer.quote} »</div>` : ''}
        ${offer.description ? `<p class="ec-offer-desc">${offer.description}</p>` : ''}
        ${meta ? `<div class="ec-offer-meta">${meta}</div>` : ''}
        ${price ? `<div class="ec-offer-price">${price}</div>` : ''}
        <button class="btn-pill full" data-book="${offer._id}" style="margin-top:8px;">Réserver ce package</button>
      </div>
    </div>`;
}
