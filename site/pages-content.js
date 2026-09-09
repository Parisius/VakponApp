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

  let pageData = null;

  function render() {
    if (!pageData) return;
    const titleEl = document.getElementById('pageHeroTitle');
    const subEl = document.getElementById('pageHeroSubtitle');
    if (titleEl) titleEl.textContent = pick(pageData, 'heroTitle');
    if (subEl) subEl.textContent = pick(pageData, 'heroSubtitle');

    const list = document.getElementById('pageSections');
    if (list) {
      list.innerHTML = (pageData.sections || []).map((s) => `
        <div class="content-card">
          <span class="content-card-icon">${escapeHtml(s.icon)}</span>
          <h3>${escapeHtml(currentLang() === 'en' && s.titleEn ? s.titleEn : s.titleFr)}</h3>
          <p>${escapeHtml(currentLang() === 'en' && s.bodyEn ? s.bodyEn : s.bodyFr)}</p>
        </div>
      `).join('');
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
