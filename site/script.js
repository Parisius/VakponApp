// Clone the brand mark SVGs into every logo slot
  const logoTpl = document.getElementById('vakpon-logo-svg');
  const logoTplWhite = document.getElementById('vakpon-logo-svg-white');
  document.querySelectorAll('[data-logo]').forEach(el => el.appendChild(logoTpl.content.cloneNode(true)));
  document.querySelectorAll('[data-logo-white]').forEach(el => el.appendChild(logoTplWhite.content.cloneNode(true)));

  const header = document.getElementById('siteHeader');
  const heroSection = document.querySelector('.hero-ff');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
    if (heroSection) heroSection.classList.toggle('scrolled-past', window.scrollY > 40);
  });

  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  // Scroll-reveal word-by-word text animation (Notre Vision)
  // Word-by-word scroll reveal (Notre Vision). Elements reveal in DOM order
  // as ONE shared sequence — the heading finishes fully before the paragraph
  // below it starts — rather than each element tracking its own position
  // independently. refreshScrollRevealText() re-wraps words after a language
  // switch replaces an element's text (data-i18n overwrites .sr-word spans
  // via textContent, so they'd otherwise never re-run their reveal).
  let updateScrollRevealText = () => {};
  function refreshScrollRevealText() {
    const els = document.querySelectorAll('.scroll-reveal-text');
    if (!els.length) return;
    els.forEach((el) => {
      const words = el.textContent.trim().split(/\s+/).filter(Boolean);
      el.innerHTML = words.map(w => `<span class="sr-word">${w}</span>`).join(' ');
    });
    updateScrollRevealText();
  }
  (function initScrollRevealText(){
    const els = document.querySelectorAll('.scroll-reveal-text');
    if (!els.length) return;
    refreshScrollRevealText();
    updateScrollRevealText = function update(){
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.4;
      const first = els[0].getBoundingClientRect();
      const last = els[els.length - 1].getBoundingClientRect();
      const total = (last.bottom - first.top) + (start - end);
      const scrolled = start - first.top;
      let progress = total > 0 ? scrolled / total : 0;
      progress = Math.max(0, Math.min(1, progress));

      const allWords = [];
      els.forEach((el) => allWords.push(...el.querySelectorAll('.sr-word')));
      const activeCount = Math.round(progress * allWords.length);
      allWords.forEach((w, i) => w.classList.toggle('active', i < activeCount));
    };
    window.addEventListener('scroll', updateScrollRevealText, { passive: true });
    window.addEventListener('resize', updateScrollRevealText);
    updateScrollRevealText();
  })();

  // Local dev keeps working from localhost; everywhere else hits the deployed API.
  const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE = IS_LOCAL ? 'http://localhost:3001/api' : 'https://api.vakpon-tours.com/api';
  const ESPACE_CLIENT_URL = IS_LOCAL ? 'http://localhost:5502/index.html' : 'https://vakpon-tours.com/espace-client/index.html';
  document.querySelectorAll('.espace-client-link').forEach((el) => { el.href = ESPACE_CLIENT_URL; });

  // Visitor tracking — read from the admin's Analytics page. Same backend a
  // future site can reuse via /api/analytics.js (see analytics-snippet.ts).
  // sessionId lives in sessionStorage (cleared when the tab closes, unlike a
  // cookie) so the log/funnel can group events into one visit.
  let analyticsSessionId;
  try {
    analyticsSessionId = sessionStorage.getItem('__vza_sid');
    if (!analyticsSessionId) {
      analyticsSessionId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem('__vza_sid', analyticsSessionId);
    }
  } catch (e) { /* private browsing etc. — tracking just skips session grouping */ }

  function trackEvent(eventType) {
    try {
      const params = new URLSearchParams(location.search);
      const payload = JSON.stringify({
        site: 'vakpon-tours',
        path: location.pathname,
        eventType,
        referrer: document.referrer || '',
        sessionId: analyticsSessionId,
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
      });
      return fetch(`${API_BASE}/analytics/collect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true,
      }).then((r) => r.json()).catch(() => null);
    } catch (e) { return Promise.resolve(null); }
  }

  const pageviewStartedAt = Date.now();
  trackEvent('pageview').then((result) => {
    if (!result || !result.id) return;
    let sent = false;
    const sendDuration = () => {
      if (sent) return;
      sent = true;
      const payload = JSON.stringify({ id: result.id, durationMs: Date.now() - pageviewStartedAt });
      if (navigator.sendBeacon) navigator.sendBeacon(`${API_BASE}/analytics/duration`, new Blob([payload], { type: 'application/json' }));
    };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendDuration(); });
    addEventListener('pagehide', sendDuration);
  });

  // ===== i18n (FR/EN) =====
  // Static chrome comes from GET /translations (admin/translations.html
  // manages it); offer content uses each Offer's own *En fields (see pick()).
  let currentLang = localStorage.getItem('vakpon-lang') || (document.documentElement.lang === 'en' ? 'en' : 'fr');
  let translations = {};
  let allOffers = [];
  let currentModalOffer = null;
  // Declared here (rather than inside the homepage-only hero block below)
  // because applyTranslations() reads it unconditionally on every page —
  // a `let` inside that block is invisible outside it, which used to throw
  // "ffIndex is not defined" and abort applyTranslations() before it could
  // reach refreshScrollRevealText()/startTypewriter().
  let ffIndex = 0;

  function t(key) {
    const entry = translations[key];
    return (entry && entry[currentLang]) || (entry && entry.fr) || '';
  }

  function pick(obj, field) {
    if (!obj) return '';
    const enValue = obj[field + 'En'];
    return currentLang === 'en' && enValue ? enValue : obj[field];
  }

  function pickList(obj, field) {
    if (!obj) return [];
    const enValue = obj[field + 'En'];
    return currentLang === 'en' && enValue && enValue.length ? enValue : (obj[field] || []);
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (translations[key]) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (translations[key]) el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[key]) el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (translations[key]) el.setAttribute('aria-label', t(key));
    });
    document.querySelectorAll('.lang-toggle, [data-lang-toggle]').forEach((btn) => {
      btn.textContent = currentLang === 'fr' ? 'EN' : 'FR';
      btn.setAttribute('aria-label', currentLang === 'fr' ? 'Passer en anglais' : 'Switch to French');
    });
    if (translations['meta.title']) document.title = t('meta.title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && translations['meta.description']) metaDesc.setAttribute('content', t('meta.description'));

    // Re-render everything driven by offer data in the new language.
    if (allOffers.length) renderOffers(allOffers);
    if (currentModalOffer) populateOfferModal(currentModalOffer);
    // setFfSlide only exists on the homepage (declared inside the
    // if (ffPaginationEl) hero block below) — guard it here since this
    // function also runs on the standalone pages.
    if (typeof setFfSlide === 'function') setFfSlide(ffIndex);
    refreshScrollRevealText(); // data-i18n above just overwrote .sr-word spans with plain text
    // startTypewriter, like setFfSlide above, only exists on the homepage.
    if (typeof startTypewriter === 'function' && translations['hero.typewriter']) startTypewriter(t('hero.typewriter'));
  }

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('vakpon-lang', lang);
    applyTranslations();
  }

  fetch(`${API_BASE}/translations?site=vakpon-tours`)
    .then((r) => r.json())
    .then((dict) => { translations = dict; applyTranslations(); })
    .catch(() => { /* falls back to the French baked into the HTML */ });

  document.querySelectorAll('.lang-toggle, [data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(currentLang === 'fr' ? 'en' : 'fr'));
  });

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  // Only present on the homepage — Guide du voyageur / À propos reuse this
  // same script.js for header/theme/lang behavior but have no contact form.
  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', async function(e){
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
    formNote.textContent = t('form.sending');
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
      formNote.textContent = t('form.successMsg');
      contactForm.reset();
      trackEvent('conversion');
    } catch (err) {
      formNote.textContent = t('form.errorMsg').replace('{msg}', err.message);
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
  // Mobile full-screen menu — shared by every page (the hero's own toggle
  // button only exists on the homepage; #siteMenuToggle in the sticky header
  // exists on all of them), so this runs unconditionally rather than inside
  // the homepage-only hero/offers guard below.
  const ffMenuPanel = document.getElementById('ffMenuPanel');
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

  // FarmForm-style hero: pagination sync + text swap for special-offer slides + menu toggle.
  // Every offer the admin flags isHero gets its own slide, added after any existing
  // ones (see applyHeroOffers below) — the static markup below is just slide 0's
  // fallback content until the API responds.
  // Everything from here to the end of the file is homepage-only (hero
  // slider + offer cards/modal) — guarded as a whole since it's one
  // interconnected block, rather than null-checking dozens of individual
  // hero/offer element lookups. Guide du voyageur / À propos have neither.
  const ffPaginationEl = document.getElementById('ffPagination');
  if (ffPaginationEl) {
  const ffBgEl = document.getElementById('ffBg');
  const ffWelcome = document.getElementById('ffWelcome');
  const ffHeadline = document.getElementById('ffHeadline');
  const ffCta = document.getElementById('ffCta');
  // Fallback hero offer text (used only if the active hero offer's own
  // heroWelcomeText/heroHeadline are empty) — kept bilingual directly here
  // since it mirrors the seeded "Pack Séjour Bénin" offer, not admin-managed UI chrome.
  const offerTextFallback = {
    welcome: { fr: 'Offre Spéciale : Places Limitées', en: 'Special Offer: Limited Spots' },
    headline: { fr: 'Pack Séjour Bénin<br>7 jours / 6 nuits <br> dès 2 232€', en: 'Benin Stay Package<br>7 days / 6 nights <br> from €2,232' },
  };

  const ffPin = document.getElementById('ffPin');
  const pinTitle = document.getElementById('pinTitle');
  const pinSub = document.getElementById('pinSub');
  // Per-slide data, keyed by the slide's .seg element (so inserting new offer
  // slides never desyncs stale numeric indices from earlier renders). Offer
  // slides store just the offer reference — text is derived via pick() at
  // render time so a language switch always shows the current selection.
  const slideMeta = new Map();
  let heroOffersList = [];
  {
    // Static "patrimoine" slides — not admin-managed, kept bilingual directly here.
    const initialPins = [
      { title: { fr: 'Route des Esclaves', en: 'Slave Route' }, sub: { fr: ' · Ouidah', en: ' · Ouidah' } },
      { title: { fr: 'Collines de Dassa', en: 'Dassa Hills' }, sub: { fr: ' · Dassa-Zoumè', en: ' · Dassa-Zoumè' } },
      { title: { fr: 'Tata Somba', en: 'Tata Somba' }, sub: { fr: ' · Boukoumbé', en: ' · Boukoumbé' } },
      { title: { fr: 'Ganvié', en: 'Ganvié' }, sub: { fr: ' · Cité lacustre', en: ' · Lake Village' } },
      { title: { fr: 'Porto-Novo', en: 'Porto-Novo' }, sub: { fr: ' · Capitale politique', en: ' · Political Capital' } },
      { title: { fr: 'Statue Bio Guerra', en: 'Bio Guerra Statue' }, sub: { fr: ' · Cotonou', en: ' · Cotonou' } },
    ];
    Array.from(ffPaginationEl.querySelectorAll('.seg')).forEach((seg, i) => {
      slideMeta.set(seg, i === 0
        ? { pin: initialPins[0], isOffer: true, offer: null }
        : { pin: initialPins[i], isOffer: false, offer: null });
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
    const defaultWelcome = translations['hero.defaultWelcome'] ? t('hero.defaultWelcome') : 'Avec Vakpon Tours';
    const defaultHeadline = translations['hero.defaultHeadline'] ? t('hero.defaultHeadline') : 'Vivez une nouvelle façon<br>de découvrir le Bénin';
    if (ffWelcome) ffWelcome.textContent = isOffer ? (meta.offer ? pick(meta.offer, 'heroWelcomeText') : offerTextFallback.welcome[currentLang]) : defaultWelcome;
    if (ffHeadline) ffHeadline.innerHTML = isOffer ? (meta.offer ? escapeHtml(pick(meta.offer, 'heroHeadline')).replace(/\n/g, '<br>') : offerTextFallback.headline[currentLang]) : defaultHeadline;
    if (ffCta) ffCta.classList.toggle('show', isOffer);
    if (meta && ffPin) {
      if (isOffer && meta.offer) {
        pinTitle.textContent = pick(meta.offer, 'heroPinTitle') || meta.offer.title;
        pinSub.textContent = pick(meta.offer, 'heroPinSub') ? ' · ' + pick(meta.offer, 'heroPinSub') : '';
      } else if (meta.pin) {
        pinTitle.textContent = meta.pin.title[currentLang];
        pinSub.textContent = meta.pin.sub[currentLang];
      }
    }
  }

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

  // Typewriter effect for the hero tag (inspired by reactbits TextType).
  // startTypewriter() is re-callable so a language switch can restart the
  // cycle with the translated string instead of leaving the French one
  // stuck mid-animation (see applyTranslations()).
  const typeTarget = document.getElementById('typeText');
  let typewriterTimer = null;
  function startTypewriter(str) {
    if (!typeTarget || !str) return;
    clearTimeout(typewriterTimer);
    let ci = 0, deleting = false;
    function typeLoop() {
      if (!deleting) {
        ci++;
        typeTarget.textContent = str.slice(0, ci);
        if (ci === str.length) { typewriterTimer = setTimeout(() => { deleting = true; typeLoop(); }, 2400); return; }
        typewriterTimer = setTimeout(typeLoop, 55);
      } else {
        ci--;
        typeTarget.textContent = str.slice(0, ci);
        if (ci === 0) { typewriterTimer = setTimeout(() => { deleting = false; typeLoop(); }, 700); return; }
        typewriterTimer = setTimeout(typeLoop, 28);
      }
    }
    typeLoop();
  }
  startTypewriter("Un monde de splendeurs vous attend");

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
    const included = pickList(offer, 'includedItems').map(i => `<div>${escapeHtml(i)}</div>`).join('');
    const pricing = (offer.priceTiers || []).map(tier => `<div class="o-price-tier"><span>${escapeHtml(pick(tier, 'label'))}</span><b>${escapeHtml(tier.amount)}</b></div>`).join('');
    const metaBits = [pick(offer, 'durationLabel'), pick(offer, 'routeLabel')].filter(Boolean);
    const metaHtml = metaBits.length ? `<div class="o-meta"><b>${escapeHtml(metaBits[0])}</b>${metaBits[1] ? ' - ' + escapeHtml(metaBits[1]) : ''}</div>` : '';
    const badge = isSpecial ? `<div class="o-badge">${escapeHtml(t('offerCard.specialBadge'))}</div>` : '';
    const cta = isSpecial
      ? `<a href="#" class="btn-pill" data-open-offer>${escapeHtml(t('offerCard.viewFullOffer'))}</a>`
      : `<a href="#contact" class="btn-pill" data-reserve-offer="${offer._id}" data-reserve-name="${escapeHtml(pick(offer, 'title'))}">${escapeHtml(t('offerCard.reserveBtn'))}</a>`;
    return `
      <div class="offer-card${isSpecial ? ' offer-card-special' : ''} reveal">
        <div class="o-info">
          ${badge}
          <h3>${escapeHtml(pick(offer, 'title'))}</h3>
          ${offer.quote ? `<div class="o-quote">« ${escapeHtml(pick(offer, 'quote'))} »</div>` : ''}
          ${offer.description ? `<p class="o-desc">${escapeHtml(pick(offer, 'description'))}</p>` : ''}
          ${included ? `<div class="o-included-label">${escapeHtml(t('common.includedLabel'))}</div><div class="o-included">${included}</div>` : ''}
          ${pricing ? `<div class="o-pricing">${pricing}</div>` : ''}
          ${cta}
          ${metaHtml}
        </div>
        <div class="o-media">
          <span class="o-index">${isSpecial ? '✦' : String(index + 1).padStart(2, '0')}</span>
          <img src="${escapeHtml(img)}" alt="${escapeHtml(pick(offer, 'title'))}">
        </div>
      </div>`;
  }

  function populateOfferSelect(offers) {
    const select = document.getElementById('resOffer');
    if (!select) return;
    const previousValue = select.value;
    select.querySelectorAll('option[data-dynamic-offer]').forEach((o) => o.remove());
    const options = offers.map(o => `<option data-dynamic-offer value="${o._id}">${escapeHtml(pick(o, 'title'))}</option>`).join('');
    select.insertAdjacentHTML('afterbegin', options);
    if (previousValue) select.value = previousValue;
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
      slideMeta.set(seg, { isOffer: true, offer });
      if (heroImg) { bgImg.src = heroImg; bgImg.alt = pick(offer, 'title') || ''; }
    });

    setFfSlide(ffIndex); // re-render whichever slide is currently showing, in case its content just changed
  }

  // Offer detail modal — populated for whichever offer is being shown
  // (the active hero slide's offer, or the one a card/link was tied to).
  function populateOfferModal(offer) {
    if (!offer) return;

    const heroImg = offer.images && offer.images[0];
    const setText = (id, value) => { const el = document.getElementById(id); if (el && value) el.textContent = value; };
    currentModalOffer = offer;
    const modalBgImg = document.getElementById('modalBgImg');
    if (modalBgImg && heroImg) modalBgImg.src = heroImg;
    setText('modalWelcome', pick(offer, 'heroWelcomeText'));
    setText('modalHeading', pick(offer, 'modalHeading'));
    setText('modalDates', pick(offer, 'modalDatesLabel'));
    setText('modalNote', pick(offer, 'modalNote'));

    const priceRow = document.getElementById('modalPriceRow');
    if (priceRow && offer.priceTiers && offer.priceTiers.length) {
      priceRow.innerHTML = offer.priceTiers.map((tier, i) => `
        <div class="osp-chip${i === 1 ? ' highlight' : ''}"><span>${escapeHtml(pick(tier, 'label'))}</span><b>${escapeHtml(tier.amount)}</b></div>
      `).join('');
    }

    const included = document.getElementById('modalIncluded');
    const includedItems = pickList(offer, 'includedItems');
    if (included && includedItems.length) {
      included.innerHTML = includedItems.map((i) => `<div>${escapeHtml(i)}</div>`).join('');
    }

    const breakdown = document.getElementById('modalPricingBreakdown');
    if (breakdown && offer.modalPricingBreakdown && offer.modalPricingBreakdown.length) {
      breakdown.innerHTML = offer.modalPricingBreakdown.map((r) => `
        <div class="row${r.highlight ? ' save' : ''}"><span>${escapeHtml(pick(r, 'label'))}</span><b>${escapeHtml(r.amount)}</b></div>
      `).join('');
    }

    const itinerary = document.getElementById('modalItinerary');
    if (itinerary && offer.itinerary && offer.itinerary.length) {
      itinerary.innerHTML = offer.itinerary.map((d) => `
        <div class="itinerary-day">
          <div class="date">${escapeHtml(pick(d, 'dateLabel'))}</div>
          <div><h4>${escapeHtml(pick(d, 'title'))}</h4>${d.description ? `<p>${escapeHtml(pick(d, 'description'))}</p>` : ''}</div>
        </div>
      `).join('');
    }

    const reserveBtn = document.getElementById('modalReserveBtn');
    if (reserveBtn) {
      reserveBtn.setAttribute('data-reserve-offer', offer._id);
      reserveBtn.setAttribute('data-reserve-name', pick(offer, 'title'));
    }
  }

  // Renders everything derived from the offers list for the current
  // language — called on first load and again on every language switch.
  function renderOffers(offers) {
    const stack = document.getElementById('offersStack');
    if (stack) {
      stack.querySelectorAll('.offer-card:not(.offer-card-sur-mesure)').forEach((el) => el.remove());
      const surMesureCard = stack.querySelector('.offer-card-sur-mesure');
      const html = offers.map(renderOfferCard).join('');
      if (surMesureCard) surMesureCard.insertAdjacentHTML('beforebegin', html);
      else stack.insertAdjacentHTML('afterbegin', html);
      stack.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
    }
    populateOfferSelect(offers);
    applyHeroOffers(offers);
  }

  async function loadOffers() {
    try {
      const res = await fetch(`${API_BASE}/offers`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      allOffers = await res.json();
      renderOffers(allOffers);
    } catch (err) {
      console.error('Vakpon Tours: could not load offers from the API', err);
    }
  }
  loadOffers();
  }