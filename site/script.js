// Clone the brand mark SVGs into every logo slot
  const logoTpl = document.getElementById('vakpon-logo-svg');
  const logoTplWhite = document.getElementById('vakpon-logo-svg-white');
  document.querySelectorAll('[data-logo]').forEach(el => el.appendChild(logoTpl.content.cloneNode(true)));
  document.querySelectorAll('[data-logo-white]').forEach(el => el.appendChild(logoTplWhite.content.cloneNode(true)));

  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 40));

  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  // Scroll-reveal word-by-word text animation (Notre Vision)
  (function initScrollRevealText(){
    const els = document.querySelectorAll('.scroll-reveal-text');
    if (!els.length) return;
    els.forEach(el => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(w => `<span class="sr-word">${w}</span>`).join(' ');
    });
    function update(){
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.4;
      els.forEach(el => {
        const words = el.querySelectorAll('.sr-word');
        const rect = el.getBoundingClientRect();
        const total = rect.height + (start - end);
        const scrolled = start - rect.top;
        let progress = total > 0 ? scrolled / total : 0;
        progress = Math.max(0, Math.min(1, progress));
        const activeCount = Math.round(progress * words.length);
        words.forEach((w, i) => w.classList.toggle('active', i < activeCount));
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  // Local dev keeps working from localhost; everywhere else hits the deployed API.
  const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE = IS_LOCAL ? 'http://localhost:3001/api' : 'https://api.vakpon-tours.com/api';
  const ESPACE_CLIENT_URL = IS_LOCAL ? 'http://localhost:5502/index.html' : 'https://vakpon-tours.com/espace-client/index.html';
  document.querySelectorAll('.espace-client-link').forEach((el) => { el.href = ESPACE_CLIENT_URL; });

  // Visitor tracking — fires once per pageview, read from the admin's new
  // Analytics page. Same backend a future site can reuse via /api/analytics.js.
  (function trackPageview() {
    try {
      const params = new URLSearchParams(location.search);
      const payload = JSON.stringify({
        site: 'vakpon-tours',
        path: location.pathname,
        referrer: document.referrer || '',
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
      });
      const endpoint = `${API_BASE}/analytics/collect`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
      }
    } catch (e) { /* never block the page for analytics */ }
  })();

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  const contactForm = document.getElementById('contactForm');
  contactForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const formNote = document.getElementById('formNote');
    const submitBtn = contactForm.querySelector('.form-submit');
    const offerSelect = document.getElementById('resOffer');
    const offerId = offerSelect.value;
    const offerName = offerSelect.options[offerSelect.selectedIndex]?.textContent || '';
    const startDate = document.getElementById('resStartDate').value;
    const endDate = document.getElementById('resEndDate').value;
    const message = document.getElementById('resMessage').value.trim();

    const payload = {
      email: document.getElementById('resEmail').value.trim(),
      fullName: document.getElementById('resFullName').value.trim(),
      travelers: parseInt(document.getElementById('resTravelers').value, 10) || 1,
    };
    if (offerId) payload.offerId = offerId; else payload.offerName = offerName;
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    if (message) payload.message = message;

    submitBtn.disabled = true;
    formNote.textContent = "Envoi en cours...";
    try {
      const res = await fetch(`${API_BASE}/reservations/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        const errMsg = Array.isArray(body.message) ? body.message.join(' ') : (body.message || 'Une erreur est survenue.');
        throw new Error(errMsg);
      }
      formNote.textContent = "Merci ! Votre demande de réservation a bien été enregistrée. Nous vous répondrons sous 24 heures.";
      contactForm.reset();
    } catch (err) {
      formNote.textContent = `Erreur : ${err.message} Merci de réessayer ou de nous contacter directement.`;
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Theme toggle with animated circular reveal
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('vakpon-theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      const x = e.clientX, y = e.clientY;
      const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

      const apply = () => { root.setAttribute('data-theme', next); localStorage.setItem('vakpon-theme', next); };

      if (!document.startViewTransition) { apply(); return; }

      const transition = document.startViewTransition(apply);
      transition.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
        );
      });
    });
  });
  // FarmForm-style hero: pagination sync + text swap for special-offer slides + menu toggle.
  // Every offer the admin flags isHero gets its own slide, added after any existing
  // ones (see applyHeroOffers below) — the static markup below is just slide 0's
  // fallback content until the API responds.
  const ffPaginationEl = document.getElementById('ffPagination');
  const ffBgEl = document.getElementById('ffBg');
  const ffWelcome = document.getElementById('ffWelcome');
  const ffHeadline = document.getElementById('ffHeadline');
  const ffCta = document.getElementById('ffCta');
  const defaultText = { welcome: 'Avec Vakpon Tours', headline: 'Vivez une nouvelle façon<br>de découvrir le Bénin' };
  const offerText = { welcome: 'Offre Spéciale : Places Limitées', headline: 'Pack Séjour Bénin<br>7 jours / 6 nuits <br> dès 2 232€' };

  const ffPin = document.getElementById('ffPin');
  const pinTitle = document.getElementById('pinTitle');
  const pinSub = document.getElementById('pinSub');
  // Per-slide data, keyed by the slide's .seg element (so inserting new offer
  // slides never desyncs stale numeric indices from earlier renders).
  const slideMeta = new Map();
  let heroOffersList = [];
  {
    const initialPins = [
      { title: 'Route des Esclaves', sub: ' · Ouidah' },
      { title: 'Collines de Dassa', sub: ' · Dassa-Zoumè' },
      { title: 'Tata Somba', sub: ' · Boukoumbé' },
      { title: 'Ganvié', sub: ' · Cité lacustre' },
      { title: 'Porto-Novo', sub: ' · Capitale politique' },
      { title: 'Statue Bio Guerra', sub: ' · Cotonou' },
    ];
    Array.from(ffPaginationEl.querySelectorAll('.seg')).forEach((seg, i) => {
      slideMeta.set(seg, i === 0
        ? { pinTitle: initialPins[0].title, pinSub: initialPins[0].sub, welcome: offerText.welcome, headline: offerText.headline, isOffer: true, offer: null }
        : { pinTitle: initialPins[i].title, pinSub: initialPins[i].sub, isOffer: false, offer: null });
    });
  }

  function ffSegCount() { return ffPaginationEl.querySelectorAll('.seg').length; }

  function setFfSlide(index) {
    const segs = Array.from(ffPaginationEl.querySelectorAll('.seg'));
    const bgImgs = Array.from(ffBgEl.querySelectorAll('img'));
    segs.forEach(s => s.classList.remove('active'));
    if (segs[index]) segs[index].classList.add('active');
    bgImgs.forEach(img => img.classList.remove('active'));
    if (bgImgs[index]) bgImgs[index].classList.add('active');
    const meta = segs[index] && slideMeta.get(segs[index]);
    const isOffer = !!(meta && meta.isOffer);
    if (ffWelcome) ffWelcome.textContent = isOffer ? meta.welcome : defaultText.welcome;
    if (ffHeadline) ffHeadline.innerHTML = isOffer ? meta.headline : defaultText.headline;
    if (ffCta) ffCta.classList.toggle('show', isOffer);
    if (meta && ffPin) {
      pinTitle.textContent = meta.pinTitle;
      pinSub.textContent = meta.pinSub;
    }
  }

  let ffIndex = 0;
  if (ffSegCount()) {
    let ffTimer = setInterval(() => {
      ffIndex = (ffIndex + 1) % ffSegCount();
      setFfSlide(ffIndex);
    }, 5000);

    ffPaginationEl.addEventListener('click', (e) => {
      const seg = e.target.closest('.seg');
      if (!seg) return;
      const i = Array.from(ffPaginationEl.querySelectorAll('.seg')).indexOf(seg);
      if (i === -1) return;
      ffIndex = i;
      setFfSlide(ffIndex);
      clearInterval(ffTimer);
      ffTimer = setInterval(() => {
        ffIndex = (ffIndex + 1) % ffSegCount();
        setFfSlide(ffIndex);
      }, 5000);
    });
    ffPaginationEl.querySelectorAll('.seg').forEach(seg => { seg.style.cursor = 'pointer'; });
  }

  if (ffCta) ffCta.addEventListener('click', () => {
    const segs = Array.from(ffPaginationEl.querySelectorAll('.seg'));
    const meta = segs[ffIndex] && slideMeta.get(segs[ffIndex]);
    openOfferModal(meta && meta.offer);
  });

  setFfSlide(0);

  // Typewriter effect for the hero tag (inspired by reactbits TextType)
  const typeTarget = document.getElementById('typeText');
  const typeStr = "Un monde de splendeurs vous attend";
  if (typeTarget) {
    let ci = 0, deleting = false;
    function typeLoop() {
      if (!deleting) {
        ci++;
        typeTarget.textContent = typeStr.slice(0, ci);
        if (ci === typeStr.length) { setTimeout(() => { deleting = true; typeLoop(); }, 2400); return; }
        setTimeout(typeLoop, 55);
      } else {
        ci--;
        typeTarget.textContent = typeStr.slice(0, ci);
        if (ci === 0) { setTimeout(() => { deleting = false; typeLoop(); }, 700); return; }
        setTimeout(typeLoop, 28);
      }
    }
    typeLoop();
  }

  const ffMenuPanel = document.getElementById('ffMenuPanel');
  // Two triggers share one panel: the hero's own button (visible at the top
  // of the page) and the sticky header's (reachable once the hero has
  // scrolled out of view — #siteHeader stays position:fixed above it).
  const ffMenuToggles = [document.getElementById('ffMenuToggle'), document.getElementById('siteMenuToggle')].filter(Boolean);
  if (ffMenuPanel && ffMenuToggles.length) {
    const setOpen = (opening) => {
      ffMenuPanel.classList.toggle('open', opening);
      ffMenuToggles.forEach((btn) => btn.classList.toggle('is-open', opening));
      document.body.style.overflow = opening ? 'hidden' : '';
    };
    const closeFfMenu = () => setOpen(false);
    ffMenuToggles.forEach((btn) => {
      btn.addEventListener('click', () => setOpen(!ffMenuPanel.classList.contains('open')));
    });
    document.addEventListener('click', (e) => {
      if (ffMenuToggles.some((btn) => btn.contains(e.target)) || ffMenuPanel.contains(e.target)) return;
      closeFfMenu();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFfMenu(); });
  }

  // Special offer modal — delegated so it also works on offer cards
  // rendered dynamically after the page has already loaded (see loadOffers below).
  const offerModal = document.getElementById('offerModal');
  function openOfferModal(offer) {
    populateOfferModal(offer || heroOffersList[0]);
    offerModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeOfferModal() {
    offerModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-offer]')) { e.preventDefault(); openOfferModal(); return; }
    // Checked before data-close-offer so a button with both (e.g. the modal's
    // "Réserver cette offre") still pre-selects the offer before closing.
    const reserveTrigger = e.target.closest('[data-reserve-offer]');
    if (reserveTrigger) selectOfferInForm(reserveTrigger.getAttribute('data-reserve-offer'), reserveTrigger.getAttribute('data-reserve-name'));
    if (e.target.closest('[data-close-offer]')) { closeOfferModal(); return; }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOfferModal(); });

  // Nos Offres — fetch real offers from the API instead of hardcoding cards.
  // Falls back to leaving just the static "Sur-Mesure" card if the API is unreachable.
  function renderOfferCard(offer, index) {
    const isSpecial = !!offer.featured;
    const img = (offer.images && offer.images[0]) || 'images/route-des-captifs.jpg';
    const included = (offer.includedItems || []).map(i => `<div>${escapeHtml(i)}</div>`).join('');
    const pricing = (offer.priceTiers || []).map(t => `<div class="o-price-tier"><span>${escapeHtml(t.label)}</span><b>${escapeHtml(t.amount)}</b></div>`).join('');
    const metaBits = [offer.durationLabel, offer.routeLabel].filter(Boolean);
    const metaHtml = metaBits.length ? `<div class="o-meta"><b>${escapeHtml(metaBits[0])}</b>${metaBits[1] ? ' - ' + escapeHtml(metaBits[1]) : ''}</div>` : '';
    const badge = isSpecial ? '<div class="o-badge">Offre Spéciale : Places Limitées</div>' : '';
    const cta = isSpecial
      ? `<a href="#" class="btn-pill" data-open-offer>Voir l'offre complète</a>`
      : `<a href="#contact" class="btn-pill" data-reserve-offer="${offer._id}" data-reserve-name="${escapeHtml(offer.title)}">Réserver ce package</a>`;
    return `
      <div class="offer-card${isSpecial ? ' offer-card-special' : ''} reveal">
        <div class="o-info">
          ${badge}
          <h3>${escapeHtml(offer.title)}</h3>
          ${offer.quote ? `<div class="o-quote">« ${escapeHtml(offer.quote)} »</div>` : ''}
          ${offer.description ? `<p class="o-desc">${escapeHtml(offer.description)}</p>` : ''}
          ${included ? `<div class="o-included-label">CE QUI EST INCLUS</div><div class="o-included">${included}</div>` : ''}
          ${pricing ? `<div class="o-pricing">${pricing}</div>` : ''}
          ${cta}
          ${metaHtml}
        </div>
        <div class="o-media">
          <span class="o-index">${isSpecial ? '✦' : String(index + 1).padStart(2, '0')}</span>
          <img src="${escapeHtml(img)}" alt="${escapeHtml(offer.title)}">
        </div>
      </div>`;
  }

  function populateOfferSelect(offers) {
    const select = document.getElementById('resOffer');
    if (!select) return;
    const options = offers.map(o => `<option value="${o._id}">${escapeHtml(o.title)}</option>`).join('');
    select.insertAdjacentHTML('afterbegin', options);
  }

  function selectOfferInForm(offerId, offerName) {
    const select = document.getElementById('resOffer');
    if (!select) return;
    if (!offerId) { select.value = ''; return; }
    select.value = offerId;
    if (select.value !== offerId) {
      const opt = document.createElement('option');
      opt.value = offerId;
      opt.textContent = offerName || 'Offre sélectionnée';
      select.insertAdjacentElement('afterbegin', opt);
      select.value = offerId;
    }
  }

  // Hero carousel — every offer the admin flags isHero gets its own slide,
  // appended after any slide(s) already built for earlier hero offers rather
  // than replacing them (see the static-fallback comment near slideMeta above).
  // Capped at 9 slides total (5 static "patrimoine" slides + up to 4 offer
  // slides) so the pagination row stays usable.
  const MAX_HERO_SLIDES = 4;
  function applyHeroOffers(offers) {
    const heroList = offers.filter((o) => o.isHero).slice(0, MAX_HERO_SLIDES);
    heroOffersList = heroList;
    if (!heroList.length) return;

    heroList.forEach((offer, i) => {
      const segs = Array.from(ffPaginationEl.querySelectorAll('.seg'));
      const bgImgs = Array.from(ffBgEl.querySelectorAll('img'));
      let seg = segs[i];
      let bgImg = bgImgs[i];
      const existingMeta = seg && slideMeta.get(seg);
      if (!existingMeta || !existingMeta.isOffer) {
        // No offer slide at this position yet — insert a brand-new one right
        // before whatever sits there now (a patrimoine slide, or nothing).
        seg = document.createElement('div');
        seg.className = 'seg';
        seg.style.cursor = 'pointer';
        bgImg = document.createElement('img');
        ffPaginationEl.insertBefore(seg, segs[i] || null);
        ffBgEl.insertBefore(bgImg, bgImgs[i] || null);
      }
      const heroImg = offer.images && offer.images[0];
      slideMeta.set(seg, {
        pinTitle: offer.heroPinTitle || offer.title,
        pinSub: offer.heroPinSub ? ' · ' + offer.heroPinSub : '',
        welcome: offer.heroWelcomeText || offerText.welcome,
        headline: offer.heroHeadline ? escapeHtml(offer.heroHeadline).replace(/\n/g, '<br>') : offerText.headline,
        isOffer: true,
        offer,
      });
      if (heroImg) { bgImg.src = heroImg; bgImg.alt = offer.title || ''; }
    });

    setFfSlide(ffIndex); // re-render whichever slide is currently showing, in case its content just changed
  }

  // Offer detail modal — populated for whichever offer is being shown
  // (the active hero slide's offer, or the one a card/link was tied to).
  function populateOfferModal(offer) {
    if (!offer) return;

    const heroImg = offer.images && offer.images[0];
    const setText = (id, value) => { const el = document.getElementById(id); if (el && value) el.textContent = value; };
    const modalBgImg = document.getElementById('modalBgImg');
    if (modalBgImg && heroImg) modalBgImg.src = heroImg;
    setText('modalWelcome', offer.heroWelcomeText);
    setText('modalHeading', offer.modalHeading);
    setText('modalDates', offer.modalDatesLabel);
    setText('modalNote', offer.modalNote);

    const priceRow = document.getElementById('modalPriceRow');
    if (priceRow && offer.priceTiers && offer.priceTiers.length) {
      priceRow.innerHTML = offer.priceTiers.map((t, i) => `
        <div class="osp-chip${i === 1 ? ' highlight' : ''}"><span>${escapeHtml(t.label)}</span><b>${escapeHtml(t.amount)}</b></div>
      `).join('');
    }

    const included = document.getElementById('modalIncluded');
    if (included && offer.includedItems && offer.includedItems.length) {
      included.innerHTML = offer.includedItems.map((i) => `<div>${escapeHtml(i)}</div>`).join('');
    }

    const breakdown = document.getElementById('modalPricingBreakdown');
    if (breakdown && offer.modalPricingBreakdown && offer.modalPricingBreakdown.length) {
      breakdown.innerHTML = offer.modalPricingBreakdown.map((r) => `
        <div class="row${r.highlight ? ' save' : ''}"><span>${escapeHtml(r.label)}</span><b>${escapeHtml(r.amount)}</b></div>
      `).join('');
    }

    const itinerary = document.getElementById('modalItinerary');
    if (itinerary && offer.itinerary && offer.itinerary.length) {
      itinerary.innerHTML = offer.itinerary.map((d) => `
        <div class="itinerary-day">
          <div class="date">${escapeHtml(d.dateLabel)}</div>
          <div><h4>${escapeHtml(d.title)}</h4>${d.description ? `<p>${escapeHtml(d.description)}</p>` : ''}</div>
        </div>
      `).join('');
    }

    const reserveBtn = document.getElementById('modalReserveBtn');
    if (reserveBtn) {
      reserveBtn.setAttribute('data-reserve-offer', offer._id);
      reserveBtn.setAttribute('data-reserve-name', offer.title);
    }
  }

  async function loadOffers() {
    const stack = document.getElementById('offersStack');
    const surMesureCard = stack ? stack.querySelector('.offer-card-sur-mesure') : null;
    try {
      const res = await fetch(`${API_BASE}/offers`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const offers = await res.json();
      if (stack) {
        const html = offers.map(renderOfferCard).join('');
        if (surMesureCard) surMesureCard.insertAdjacentHTML('beforebegin', html);
        else stack.insertAdjacentHTML('afterbegin', html);
        stack.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
      }
      populateOfferSelect(offers);
      applyHeroOffers(offers);
    } catch (err) {
      console.error('Vakpon Tours: could not load offers from the API', err);
    }
  }
  loadOffers();