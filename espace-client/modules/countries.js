// Country → international dial code, for the phone number field.
// Not exhaustive, but covers West Africa, the rest of Africa, and Vakpon's main
// customer markets (Europe, North America) so the right prefix is always one click away.
const COUNTRIES = [
  { name: 'Bénin', code: 'BJ', dial: '229' },
  { name: 'Côte d\'Ivoire', code: 'CI', dial: '225' },
  { name: 'Togo', code: 'TG', dial: '228' },
  { name: 'Ghana', code: 'GH', dial: '233' },
  { name: 'Nigéria', code: 'NG', dial: '234' },
  { name: 'Sénégal', code: 'SN', dial: '221' },
  { name: 'Burkina Faso', code: 'BF', dial: '226' },
  { name: 'Mali', code: 'ML', dial: '223' },
  { name: 'Niger', code: 'NE', dial: '227' },
  { name: 'Guinée', code: 'GN', dial: '224' },
  { name: 'Cameroun', code: 'CM', dial: '237' },
  { name: 'Gabon', code: 'GA', dial: '241' },
  { name: 'Congo (RDC)', code: 'CD', dial: '243' },
  { name: 'Congo (Brazzaville)', code: 'CG', dial: '242' },
  { name: 'Maroc', code: 'MA', dial: '212' },
  { name: 'Algérie', code: 'DZ', dial: '213' },
  { name: 'Tunisie', code: 'TN', dial: '216' },
  { name: 'Égypte', code: 'EG', dial: '20' },
  { name: 'Afrique du Sud', code: 'ZA', dial: '27' },
  { name: 'Kenya', code: 'KE', dial: '254' },
  { name: 'France', code: 'FR', dial: '33' },
  { name: 'Belgique', code: 'BE', dial: '32' },
  { name: 'Suisse', code: 'CH', dial: '41' },
  { name: 'Allemagne', code: 'DE', dial: '49' },
  { name: 'Italie', code: 'IT', dial: '39' },
  { name: 'Espagne', code: 'ES', dial: '34' },
  { name: 'Portugal', code: 'PT', dial: '351' },
  { name: 'Royaume-Uni', code: 'GB', dial: '44' },
  { name: 'Pays-Bas', code: 'NL', dial: '31' },
  { name: 'Canada', code: 'CA', dial: '1' },
  { name: 'États-Unis', code: 'US', dial: '1' },
  { name: 'Chine', code: 'CN', dial: '86' },
  { name: 'Émirats arabes unis', code: 'AE', dial: '971' },
  { name: 'Autre', code: 'XX', dial: '' },
];

function countryFlag(code) {
  if (code === 'XX') return '🌍';
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function populateCountrySelect(selectEl, defaultCode = 'BJ') {
  selectEl.innerHTML = COUNTRIES.map((c) => `<option value="${c.code}" data-dial="${c.dial}">${countryFlag(c.code)} ${c.name}${c.dial ? ` (+${c.dial})` : ''}</option>`).join('');
  selectEl.value = defaultCode;
}

// Combine a country select + local-number input into one E.164-ish string, e.g. "+22901020304".
function getPhoneValue(selectEl, numberInputEl) {
  const country = COUNTRIES.find((c) => c.code === selectEl.value);
  const local = numberInputEl.value.trim().replace(/^0+/, '').replace(/\s+/g, '');
  if (!local) return '';
  return country && country.dial ? `+${country.dial}${local}` : local;
}

// Best-effort split of a stored "+229..." phone back into country + local number,
// so editing a profile doesn't show the raw combined string.
function setPhoneValue(selectEl, numberInputEl, phone) {
  if (!phone) { numberInputEl.value = ''; return; }
  const digits = phone.replace(/^\+/, '');
  const match = COUNTRIES
    .filter((c) => c.dial)
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => digits.startsWith(c.dial));
  if (match) {
    selectEl.value = match.code;
    numberInputEl.value = digits.slice(match.dial.length);
  } else {
    numberInputEl.value = phone;
  }
}
