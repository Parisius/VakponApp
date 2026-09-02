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

  // Point this at your deployed API before going live (see README).
  const API_BASE = 'http://localhost:3001/api';

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
  // FarmForm-style hero: pagination sync + text swap for the special-offer slide + menu toggle
  const ffSegs = document.querySelectorAll('#ffPagination .seg');
  const ffWelcome = document.getElementById('ffWelcome');
  const ffHeadline = document.getElementById('ffHeadline');
  const ffCta = document.getElementById('ffCta');
  const OFFER_SLIDE_INDEX = 0; // 1st slide (0-indexed) — the special offer
  const defaultText = { welcome: 'Avec Vakpon Tours', headline: 'Vivez une nouvelle façon<br>de découvrir le Bénin' };
  const offerText = { welcome: 'Offre Spéciale : Places Limitées', headline: 'Pack Séjour Bénin<br>7 jours / 6 nuits <br> dès 2 232€' };

  const ffBgImgs = document.querySelectorAll('#ffBg img');
  const ffPin = document.getElementById('ffPin');
  const pinTitle = document.getElementById('pinTitle');
  const pinSub = document.getElementById('pinSub');
  const pins = [
    { title:'Route des Esclaves', sub:' · Ouidah',              action:'offer' },
    { title:'Collines de Dassa',  sub:' · Dassa-Zoumè',          action:'#patrimoine' },
    { title:'Tata Somba',         sub:' · Boukoumbé',            action:'#patrimoine' },
    { title:'Ganvié',             sub:' · Cité lacustre',        action:'#patrimoine' },
    { title:'Porto-Novo',         sub:' · Capitale politique',   action:'#patrimoine' },
    { title:'Statue Bio Guerra',  sub:' · Cotonou',              action:'#patrimoine' }
  ];

  function setFfSlide(index) {
    ffSegs.forEach(s => s.classList.remove('active'));
    ffSegs[index].classList.add('active');
    ffBgImgs.forEach(img => img.classList.remove('active'));
    if (ffBgImgs[index]) ffBgImgs[index].classList.add('active');
    const isOffer = index === OFFER_SLIDE_INDEX;
    const text = isOffer ? offerText : defaultText;
    if (ffWelcome) ffWelcome.textContent = text.welcome;
    if (ffHeadline) ffHeadline.innerHTML = text.headline;
    if (ffCta) ffCta.classList.toggle('show', isOffer);
    const p = pins[index];
    if (p && ffPin) {
      pinTitle.textContent = p.title;
      pinSub.textContent = p.sub;
    }
  }

  if (ffSegs.length) {
    let ffIndex = 0;
    let ffTimer = setInterval(() => {
      ffIndex = (ffIndex + 1) % ffSegs.length;
      setFfSlide(ffIndex);
    }, 5000);

    ffSegs.forEach((seg, i) => {
      seg.style.cursor = 'pointer';
      seg.addEventListener('click', () => {
        ffIndex = i;
        setFfSlide(ffIndex);
        clearInterval(ffTimer);
        ffTimer = setInterval(() => {
          ffIndex = (ffIndex + 1) % ffSegs.length;
          setFfSlide(ffIndex);
        }, 5000);
      });
    });
  }

  if (ffCta) ffCta.addEventListener('click', () => openOfferModal());

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

  const ffMenuToggle = document.getElementById('ffMenuToggle');
  const ffMenuPanel = document.getElementById('ffMenuPanel');
  if (ffMenuToggle) {
    ffMenuToggle.addEventListener('click', () => ffMenuPanel.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!ffMenuToggle.contains(e.target) && !ffMenuPanel.contains(e.target)) ffMenuPanel.classList.remove('open');
    });
  }

  // Special offer modal — delegated so it also works on offer cards
  // rendered dynamically after the page has already loaded (see loadOffers below).
  const offerModal = document.getElementById('offerModal');
  function openOfferModal() {
    offerModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeOfferModal() {
    offerModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-offer]')) { e.preventDefault(); openOfferModal(); return; }
    if (e.target.closest('[data-close-offer]')) { closeOfferModal(); return; }
    const reserveTrigger = e.target.closest('[data-reserve-offer]');
    if (reserveTrigger) selectOfferInForm(reserveTrigger.getAttribute('data-reserve-offer'), reserveTrigger.getAttribute('data-reserve-name'));
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
    } catch (err) {
      console.error('Vakpon Tours: could not load offers from the API', err);
    }
  }
  loadOffers();