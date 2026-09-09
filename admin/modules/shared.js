// ====== CONFIG ======
// Local dev keeps working from localhost; everywhere else hits the deployed API.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE = IS_LOCAL ? 'http://localhost:3001/api' : 'https://api.vakpon-tours.com/api';

const ROLE_LABELS = {
  admin: 'Admin',
  operations: 'Responsable des opérations',
  service_client: 'Service client',
  support: 'Support',
  financial: 'Financial manager',
  marketing: 'Marketing & communication',
};

// Which staff roles can see which page. Keep in sync with backend/src/common/roles.ts.
const NAV_ITEMS = [
  { view: 'dashboard', href: 'index.html', label: 'Dashboard', group: 'Général', roles: null, icon: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z' },
  { view: 'reservations', href: 'reservations.html', label: 'Réservations', group: 'Gestion', roles: ['admin', 'operations', 'service_client', 'support', 'financial'] },
  { view: 'offers', href: 'offers.html', label: 'Offres', group: 'Gestion', roles: ['admin', 'operations', 'marketing'] },
  { view: 'customers', href: 'customers.html', label: 'Clients (CRM)', group: 'Gestion', roles: ['admin', 'operations', 'service_client', 'support'] },
  { view: 'analytics', href: 'analytics.html', label: 'Analytics', group: 'Gestion', roles: ['admin', 'operations', 'marketing'] },
  { view: 'translations', href: 'translations.html', label: 'Traductions', group: 'Gestion', roles: ['admin', 'operations', 'marketing'] },
  { view: 'team', href: 'team.html', label: 'Équipe', group: 'Administration', roles: ['admin', 'operations'] },
  { view: 'logs', href: 'logs.html', label: 'Journal', group: 'Administration', roles: ['admin', 'operations'] },
];

const NAV_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7.5" height="9" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="3.5" width="7.5" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="11.5" width="7.5" height="9" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="3.5" y="14.5" width="7.5" height="6" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg>',
  reservations: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  offers: '<svg viewBox="0 0 24 24" fill="none"><path d="M11.3 3.5H5a1.5 1.5 0 00-1.5 1.5v6.3c0 .4.16.78.44 1.06l8.9 8.9c.58.58 1.53.58 2.12 0l6.3-6.3a1.5 1.5 0 000-2.12l-8.9-8.9a1.5 1.5 0 00-1.06-.44z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="8.2" cy="8.2" r="1.3" fill="currentColor"/></svg>',
  customers: '<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M15.5 5.2a3.2 3.2 0 010 6.1M18.5 20c0-2.7-1.8-4.9-4.2-5.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.7"/><circle cx="17" cy="9" r="2.4" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5M14.5 20c.3-2.3 1.8-4.1 3.9-4.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  logs: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  analytics: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20V10M11 20V4M18 20v-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  translations: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h10M9 3v2M9 5c0 4-2.5 7-6 8.5M6 9.5c1.5 2 4 3.5 6.5 4M14 21l4-9 4 9M15.3 18h5.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// ====== AUTH / IDENTITY ======
// The JWT itself lives only in an httpOnly cookie set by the API (never
// readable from JS, so an XSS bug has nothing to steal) — only the
// non-sensitive display identity is cached here for fast UI paint.
function getIdentity() { try { return JSON.parse(localStorage.getItem('vakpon_admin_identity') || 'null'); } catch { return null; } }
function setIdentity(u) {
  localStorage.setItem('vakpon_admin_identity', JSON.stringify({
    userId: u.id || u._id, fullName: u.fullName, email: u.email, role: u.role,
    mustChangePassword: !!u.mustChangePassword,
  }));
}
function clearIdentity() { localStorage.removeItem('vakpon_admin_identity'); }

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    clearIdentity();
    window.location.href = 'login.html';
    throw new Error('Session expirée');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Une erreur est survenue');
  return data;
}

async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* cookie may already be gone */ }
  clearIdentity();
  window.location.href = 'login.html';
}

// ====== THEME ======
function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem('vakpon-admin-theme');
  if (saved) root.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('vakpon-admin-theme', next);
    });
  }
}

// ====== TOASTS ======
function showToast(message, { type = 'success', persistent = false, copyValue = null } = {}) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-msg">${message}</span>
    ${copyValue ? '<button class="toast-copy">Copier</button>' : ''}
    <button class="toast-close">&times;</button>
  `;
  container.appendChild(el);
  const remove = () => el.remove();
  el.querySelector('.toast-close').addEventListener('click', remove);
  if (copyValue) {
    el.querySelector('.toast-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(copyValue); showToast('Copié dans le presse-papiers.', { type: 'success' }); }
      catch { showToast('Impossible de copier automatiquement.', { type: 'error' }); }
    });
  }
  if (!persistent) setTimeout(remove, 4000);
}

// ====== DATE FORMAT ======
// ====== XSS ESCAPING ======
// Every table/list that interpolates admin- or visitor-supplied text into
// innerHTML must run it through this first — offer titles, customer names,
// analytics referrer/UTM values (public, unauthenticated input), etc.
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
function fmtDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

// ====== PAGINATION ======
function paginate(arr, page, pageSize) { return arr.slice((page - 1) * pageSize, page * pageSize); }
function renderPagination(containerId, totalItems, page, pageSize, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);
  let btns = '';
  btns += `<button data-page="1" ${page === 1 ? 'disabled' : ''}>&laquo;</button>`;
  btns += `<button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>&lsaquo;</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && p !== 1 && p !== totalPages && Math.abs(p - page) > 2) {
      if (p === 2 || p === totalPages - 1) btns += `<span style="padding:0 4px;color:var(--muted);">…</span>`;
      continue;
    }
    btns += `<button data-page="${p}" class="${p === page ? 'current' : ''}">${p}</button>`;
  }
  btns += `<button data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>&rsaquo;</button>`;
  btns += `<button data-page="${totalPages}" ${page === totalPages ? 'disabled' : ''}>&raquo;</button>`;
  el.innerHTML = `<div class="pagination-count">${totalItems === 0 ? 'Aucune entrée' : `${from}–${to} sur ${totalItems}`}</div><div class="pagination-controls">${btns}</div>`;
  el.querySelectorAll('button[data-page]').forEach((b) => b.addEventListener('click', () => onPageChange(Number(b.dataset.page))));
}

// ====== CSV / EXCEL EXPORT ======
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function exportCsv(filename, headers, rows) {
  const lines = [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))];
  downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}
function exportExcel(filename, headers, rows) {
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const head = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  const html = `<html><head><meta charset="UTF-8"></head><body><table border="1">${head}${body}</table></body></html>`;
  downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `${filename}.xls`);
}

// ====== SHELL (sidebar + topbar) ======
// Call once per page: initShell({ view: 'reservations', requiredRoles: [...] | null, onSearch: fn })
// Redirects to login.html if unauthenticated, renders nav filtered by role,
// and shows an access-denied panel (instead of the page content) if the role can't see this page.
async function initShell({ view, requiredRoles = null, onSearch = null } = {}) {
  initTheme();

  // No client-readable token to check anymore (httpOnly cookie) — the
  // session cookie, if any, is validated by asking the API directly.
  try { setIdentity(await api('/users/me')); }
  catch { window.location.href = 'login.html'; return null; }
  const identity = getIdentity();

  if (requiredRoles && !requiredRoles.includes(identity.role)) {
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;">
        <div style="text-align:center;max-width:360px;">
          <h1 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:10px;">Accès non autorisé</h1>
          <p style="color:var(--muted);font-size:14px;margin-bottom:20px;">Votre rôle (${ROLE_LABELS[identity.role] || identity.role}) ne donne pas accès à cette page.</p>
          <a href="index.html" style="background:var(--accent, #15b568);color:#0b0b0a;font-weight:700;padding:11px 22px;border-radius:100px;text-decoration:none;display:inline-block;">Retour au dashboard</a>
        </div>
      </div>`;
    return null;
  }

  const initial = (identity.fullName || identity.email || '?').trim().charAt(0).toUpperCase();
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarName = document.getElementById('sidebarName');
  const sidebarRole = document.getElementById('sidebarRole');
  const topbarAvatar = document.getElementById('topbarAvatar');
  const profileMenuName = document.getElementById('profileMenuName');
  const profileMenuEmail = document.getElementById('profileMenuEmail');
  if (sidebarAvatar) sidebarAvatar.textContent = initial;
  if (sidebarName) sidebarName.textContent = identity.fullName || identity.email;
  if (sidebarRole) sidebarRole.textContent = ROLE_LABELS[identity.role] || identity.role;
  if (topbarAvatar) topbarAvatar.textContent = initial;
  if (profileMenuName) profileMenuName.textContent = identity.fullName || identity.email;
  if (profileMenuEmail) profileMenuEmail.textContent = identity.email || '';

  const nav = document.getElementById('sidebarNav');
  if (nav) {
    const visible = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(identity.role));
    let html = '';
    let lastGroup = null;
    visible.forEach((item) => {
      if (item.group !== lastGroup) { html += `<div class="nav-group-label">${item.group}</div>`; lastGroup = item.group; }
      html += `<a class="nav-item${item.view === view ? ' active' : ''}" href="${item.href}">${NAV_ICONS[item.view] || ''}${item.label}</a>`;
    });
    nav.innerHTML = html;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && sidebarToggle && sidebarBackdrop) {
    const closeSidebar = () => { sidebar.classList.remove('open'); sidebarBackdrop.classList.remove('open'); };
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarBackdrop.classList.toggle('open');
    });
    sidebarBackdrop.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });
  }

  const profileMenuBtn = document.getElementById('profileMenuBtn');
  const profileMenu = document.getElementById('profileMenu');
  if (profileMenuBtn && profileMenu) {
    profileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); profileMenu.classList.toggle('open'); });
    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && !profileMenuBtn.contains(e.target)) profileMenu.classList.remove('open');
    });
  }

  if (onSearch) {
    const searchInput = document.getElementById('topSearch');
    if (searchInput) {
      let timer;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => onSearch(searchInput.value.trim().toLowerCase()), 200);
      });
    }
  }

  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', (e) => e.target.closest('.modal').classList.remove('open'));
  });

  initChangePassword(identity);

  return identity;
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ====== CHANGE PASSWORD (voluntary from the profile menu, or forced on first login) ======
function initChangePassword(identity) {
  if (!document.getElementById('changePasswordModal')) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'changePasswordModal';
    modal.innerHTML = `
      <div class="modal-backdrop" data-close-modal></div>
      <div class="modal-panel">
        <button class="modal-close" data-close-modal>&times;</button>
        <h2 style="margin-bottom:16px;">Changer le mot de passe</h2>
        <p id="changePasswordNote" class="hidden" style="color:var(--muted);font-size:13px;margin-bottom:16px;">
          Merci de définir un nouveau mot de passe pour sécuriser votre compte.
        </p>
        <form id="changePasswordForm">
          <div class="field"><label>Mot de passe actuel</label><input type="password" id="cp-current" required></div>
          <div class="field"><label>Nouveau mot de passe</label><input type="password" id="cp-new" required minlength="6"></div>
          <button type="submit" class="btn-pill full">Mettre à jour</button>
          <div class="auth-error" id="changePasswordError"></div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#changePasswordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('changePasswordError');
      errorEl.textContent = '';
      try {
        await api('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: document.getElementById('cp-current').value,
            newPassword: document.getElementById('cp-new').value,
          }),
        });
        const stored = getIdentity();
        if (stored) { stored.mustChangePassword = false; localStorage.setItem('vakpon_admin_identity', JSON.stringify(stored)); }
        setChangePasswordForced(false);
        closeModal('changePasswordModal');
        e.target.reset();
        showToast('Mot de passe mis à jour.');
      } catch (err) { errorEl.textContent = err.message; }
    });
  }

  const profileMenu = document.getElementById('profileMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  if (profileMenu && logoutBtn && !document.getElementById('changePasswordMenuBtn')) {
    const btn = document.createElement('button');
    btn.id = 'changePasswordMenuBtn';
    btn.textContent = 'Changer le mot de passe';
    btn.addEventListener('click', () => { profileMenu.classList.remove('open'); openModal('changePasswordModal'); });
    logoutBtn.parentNode.insertBefore(btn, logoutBtn);
  }

  if (identity.mustChangePassword) {
    setChangePasswordForced(true);
    openModal('changePasswordModal');
  }
}

function setChangePasswordForced(forced) {
  const modal = document.getElementById('changePasswordModal');
  if (!modal) return;
  modal.querySelector('.modal-close').classList.toggle('hidden', forced);
  modal.querySelector('.modal-backdrop').style.pointerEvents = forced ? 'none' : '';
  modal.querySelector('#changePasswordNote').classList.toggle('hidden', !forced);
}

const STATUS_LABELS = {
  pending: 'En attente', confirmed: 'Confirmée', awaiting_payment: 'Attente paiement',
  paid: 'Payée', completed: 'Terminée', cancelled: 'Annulée',
};
const ACTION_LABELS = {
  'member.create': 'Création membre', 'member.update': 'Modification membre', 'member.remove': 'Suppression membre',
  'password.reset': 'Réinitialisation mot de passe', 'password.change': 'Changement mot de passe',
  'password.forgot': 'Mot de passe oublié',
  'reservation.status': 'Statut réservation', 'reservation.notes': 'Notes réservation',
  'customer.update': 'Fiche client', 'offer.create': 'Création offre',
  'offer.update': 'Modification offre', 'offer.delete': 'Suppression offre',
};
