// ====== CONFIG ======
// Local dev keeps working from localhost; everywhere else hits the deployed API.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE = IS_LOCAL ? 'http://localhost:3001/api' : 'https://api.vakpon-tours.com/api';

const NAV_ITEMS = [
  { view: 'reservations', href: 'index.html', label: 'Mes réservations' },
  { view: 'offers', href: 'offers.html', label: 'Offres' },
  { view: 'profile', href: 'profile.html', label: 'Mon profil' },
];

// ====== AUTH / IDENTITY ======
// The JWT lives only in an httpOnly cookie set by the API — never readable
// from JS, so an XSS bug has nothing to steal.
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
    window.location.href = 'login.html';
    throw new Error('Session expirée, merci de vous reconnecter.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Une erreur est survenue');
  return data;
}

async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* cookie may already be gone */ }
  window.location.href = 'login.html';
}

// The auth cookie is shared across every portal on this domain (espace-client
// AND management both read the same vakpon_jwt), and /users/me succeeds for
// any authenticated role — so a staff member who is logged into /management
// and simply navigates here would otherwise land in the customer portal
// without ever signing in as a customer. Clear the mismatched session rather
// than just redirecting, so they don't bounce straight back in via the
// still-valid staff cookie.
async function requireCustomerRole(me) {
  if (me.role === 'customer') return true;
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* best effort */ }
  window.location.href = 'login.html';
  return false;
}

// ====== THEME ======
function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem('vakpon-client-theme');
  if (saved) root.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('vakpon-client-theme', next);
    });
  }
}

// ====== TOASTS ======
function showToast(message, { type = 'success', persistent = false } = {}) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-msg">${message}</span><button class="toast-close">&times;</button>`;
  container.appendChild(el);
  const remove = () => el.remove();
  el.querySelector('.toast-close').addEventListener('click', remove);
  if (!persistent) setTimeout(remove, 4000);
}

// ====== DATE FORMAT ======
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
function fmtDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

const STATUS_LABELS = {
  pending: 'En attente', confirmed: 'Confirmée', awaiting_payment: 'Attente paiement',
  paid: 'Payée', completed: 'Terminée', cancelled: 'Annulée',
};

// ====== MODALS ======
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ====== SHELL (topbar + nav) ======
// Call once per authenticated page: initShell({ view: 'reservations' })
async function initShell({ view } = {}) {
  initTheme();

  let me;
  try { me = await api('/users/me'); }
  catch { window.location.href = 'login.html'; return null; }
  if (!(await requireCustomerRole(me))) return null;

  const initial = (me.fullName || me.email || '?').trim().charAt(0).toUpperCase();
  const topbarAvatar = document.getElementById('topbarAvatar');
  const profileMenuName = document.getElementById('profileMenuName');
  if (topbarAvatar) topbarAvatar.textContent = initial;
  if (profileMenuName) profileMenuName.textContent = me.fullName || me.email;

  const nav = document.getElementById('ecNav');
  if (nav) {
    nav.innerHTML = NAV_ITEMS.map((item) => `<a class="ec-nav-link${item.view === view ? ' active' : ''}" href="${item.href}">${item.label}</a>`).join('');
  }

  const mustChangeBanner = document.getElementById('mustChangeBanner');
  if (mustChangeBanner) mustChangeBanner.classList.toggle('hidden', !me.mustChangePassword);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const profileMenuBtn = document.getElementById('profileMenuBtn');
  const profileMenu = document.getElementById('profileMenu');
  if (profileMenuBtn && profileMenu) {
    profileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); profileMenu.classList.toggle('open'); });
    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && !profileMenuBtn.contains(e.target)) profileMenu.classList.remove('open');
    });
  }

  const openChangePassword = document.getElementById('openChangePassword');
  if (openChangePassword) openChangePassword.addEventListener('click', () => openModal('changePasswordModal'));
  const changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
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
        closeModal('changePasswordModal');
        showToast('Mot de passe mis à jour.');
        if (mustChangeBanner) mustChangeBanner.classList.add('hidden');
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', (e) => e.target.closest('.modal').classList.remove('open'));
  });

  return me;
}
