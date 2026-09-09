// Fetches and renders the hero + section-card content for a standalone
// content page (Guide du voyageur, À propos). Loaded after script.js, whose
// theme/lang toggles this reuses as-is via their shared classes
// (.theme-toggle, .lang-toggle) — this file only owns the page-specific
// content in #pageHero* / #pageSections.
(function () {
  const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE = IS_LOCAL ? 'http://localhost:3001/api' : 'https://api.vakpon-tours.com/api';

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function currentLang() {
    return localStorage.getItem('vakpon-lang') || (document.documentElement.lang === 'en' ? 'en' : 'fr');
  }

  function pick(obj, field) {
    const en = obj[`${field}En`];
    return currentLang() === 'en' && en ? en : obj[`${field}Fr`] || '';
  }

  // A fixed, code-owned icon set (not raw HTML from the database — sections
  // only ever store one of these keys) so staff pick a topic icon from a
  // dropdown in the admin editor without any HTML-sanitization surface.
  const ICON_SVGS = {
    passport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="9.5" r="2.5"/><path d="M9 15h6M9 17.5h6"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>',
    'message-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-4.5 7.6 8.5 8.5 0 01-4 1 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6A8.38 8.38 0 0112.5 3h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    'map-pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2C8 2 5 5 5 9c0 5.5 7 13 7 13s7-7.5 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.3" fill="currentColor" stroke="none"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15.5 5.2a3.2 3.2 0 010 6.1M18.5 20c0-2.7-1.8-4.9-4.2-5.7"/></svg>',
  };
  function iconSvg(key) {
    return ICON_SVGS[key] || ICON_SVGS.target;
  }

  let pageData = null;

  // Sections are fetched async, after script.js's own IntersectionObserver
  // has already captured its .reveal snapshot — so this page owns a second,
  // identical observer just for content added after that snapshot.
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.12 });

  function render() {
    if (!pageData) return;
    const titleEl = document.getElementById('pageHeroTitle');
    const subEl = document.getElementById('pageHeroSubtitle');
    if (titleEl) titleEl.textContent = pick(pageData, 'heroTitle');
    if (subEl) subEl.textContent = pick(pageData, 'heroSubtitle');

    const list = document.getElementById('pageSections');
    if (list) {
      list.innerHTML = (pageData.sections || []).map((s, i) => `
        <div class="content-card reveal" style="transition-delay:${Math.min(i, 6) * 70}ms;">
          <span class="content-card-icon">${iconSvg(s.icon)}</span>
          <h3>${escapeHtml(currentLang() === 'en' && s.titleEn ? s.titleEn : s.titleFr)}</h3>
          <p>${escapeHtml(currentLang() === 'en' && s.bodyEn ? s.bodyEn : s.bodyFr)}</p>
        </div>
      `).join('');
      list.querySelectorAll('.reveal:not(.in)').forEach((el) => revealObserver.observe(el));
    }
  }

  async function load() {
    const slug = document.body.getAttribute('data-page-slug');
    if (!slug) return;
    try {
      const res = await fetch(`${API_BASE}/pages/${slug}`);
      pageData = await res.json();
      render();
    } catch {
      const list = document.getElementById('pageSections');
      if (list) list.innerHTML = '<p class="content-loading">Contenu momentanément indisponible.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', load);
  // script.js's own lang-toggle click handler updates document.documentElement.lang
  // synchronously and is attached first (script.js loads before this file) — by
  // the time this listener runs, currentLang() already reflects the new choice.
  document.querySelectorAll('.lang-toggle, [data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => render());
  });
})();
