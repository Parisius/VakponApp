// ====== CONFIG ======
const API_BASE = 'http://localhost:3001/api'; // change to your deployed API URL

const NAV_ITEMS = [
  { view: 'reservations', href: 'index.html', label: 'Mes réservations' },
  { view: 'offers', href: 'offers.html', label: 'Offres' },
  { view: 'profile', href: 'profile.html', label: 'Mon profil' },
];

// ====== AUTH / IDENTITY ======
function getToken() { return localStorage.getItem('vakpon_client_token'); }
function setToken(t) { localStorage.setItem('vakpon_client_token', t); }
function clearToken() { localStorage.removeItem('vakpon_client_token'); }

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = 'login.html';
    throw new Error('Session expirée, merci de vous reconnecter.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Une erreur est survenue');
  return data;
}

function logout() {
  clearToken();
  window.location.href = 'login.html';
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
  if (!getToken()) { window.location.href = 'login.html'; return null; }
  initTheme();

  let me;
  try { me = await api('/users/me'); }
  catch { window.location.href = 'login.html'; return null; }

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
