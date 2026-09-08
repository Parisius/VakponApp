let allTranslations = [];

(async function () {
  const identity = await initShell({ view: 'translations', requiredRoles: ['admin', 'operations', 'marketing'] });
  if (!identity) return;

  document.getElementById('topSearch').addEventListener('input', (e) => render(e.target.value.trim().toLowerCase()));

  await load();
})();

async function load() {
  try {
    allTranslations = await api('/admin/translations');
  } catch {
    showToast('Impossible de charger les traductions.', { type: 'error' });
    return;
  }
  render('');
}

function render(filter) {
  const tbody = document.querySelector('#translationsTable tbody');
  const rows = filter
    ? allTranslations.filter((r) => r.key.toLowerCase().includes(filter) || r.fr.toLowerCase().includes(filter) || r.en.toLowerCase().includes(filter))
    : allTranslations;

  tbody.innerHTML = rows.map((r) => `
    <tr data-key="${r.key}">
      <td style="font-family:monospace;font-size:12.5px;color:var(--muted);vertical-align:top;padding-top:16px;">${r.key}</td>
      <td><textarea class="i18n-fr" rows="2" style="width:100%;background:var(--bg-2);border:1px solid var(--line);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13.5px;font-family:'Inter',sans-serif;resize:vertical;">${escapeAttr(r.fr)}</textarea></td>
      <td><textarea class="i18n-en" rows="2" style="width:100%;background:var(--bg-2);border:1px solid var(--line);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13.5px;font-family:'Inter',sans-serif;resize:vertical;">${escapeAttr(r.en)}</textarea></td>
      <td style="vertical-align:top;padding-top:14px;"><button class="small-btn" data-save>Enregistrer</button></td>
    </tr>
  `).join('') || `<tr><td colspan="4" style="color:var(--muted);text-align:center;">Aucun résultat.</td></tr>`;

  tbody.querySelectorAll('[data-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const key = tr.dataset.key;
      const fr = tr.querySelector('.i18n-fr').value;
      const en = tr.querySelector('.i18n-en').value;
      btn.disabled = true;
      try {
        await api('/admin/translations', { method: 'PATCH', body: JSON.stringify({ key, fr, en }) });
        const row = allTranslations.find((r) => r.key === key);
        if (row) { row.fr = fr; row.en = en; }
        showToast('Traduction enregistrée.');
      } catch {
        showToast("Échec de l'enregistrement.", { type: 'error' });
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
