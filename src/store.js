// localStorage-Zugriff für FlopMelder
// Keys: fm_profile, fm_filialen, fm_artikel, fm_meldungen

const KEY_PROFILE = 'fm_profile'
const KEY_FILIALEN = 'fm_filialen'
const KEY_ARTIKEL = 'fm_artikel'
const KEY_MELDUNGEN = 'fm_meldungen'

const DEFAULT_PROFILE = { vlName: 'Pusch', nl: 'Ganderkesee' }

const DEFAULT_FILIALEN_NUMMERN = [
  '2233', '2239', '2255', '2497', '2562', '7071', '7160', '2056', '2400', '2460',
]

const DEFAULT_ARTIKEL = [
  { nummer: '1302', name: 'Milka Noisette' },
  { nummer: '411787', name: 'Kinder Riegel' },
  { nummer: '411794', name: 'Duplo' },
  { nummer: '406729', name: 'Nutella' },
  { nummer: '444146', name: 'funny frisch' },
  { nummer: '428137', name: 'Kinder Cards' },
  { nummer: '441734', name: 'Kinder Duo' },
  { nummer: '431708', name: 'Hanuta Riegel' },
  { nummer: '411799', name: 'Hanuta 10er' },
  { nummer: '405402', name: 'Toffifee' },
  { nummer: '441365', name: 'KitKat/Lion/Smarties' },
  { nummer: '421236', name: 'Milka Großtafel' },
  { nummer: '418442', name: 'Ritter Sport sort.' },
  { nummer: '17806', name: 'Kinder Bueno' },
  { nummer: '19255 / 408717', name: 'Ü-Eier / Ü-Eier Mädchen' },
]

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id_' + Date.now() + '_' + Math.random().toString(16).slice(2)
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// --- Seeding ---

export function seedIfEmpty() {
  if (!localStorage.getItem(KEY_PROFILE)) {
    writeJson(KEY_PROFILE, DEFAULT_PROFILE)
  }
  if (!localStorage.getItem(KEY_FILIALEN)) {
    writeJson(
      KEY_FILIALEN,
      DEFAULT_FILIALEN_NUMMERN.map((nummer) => ({ id: makeId(), nummer }))
    )
  }
  if (!localStorage.getItem(KEY_ARTIKEL)) {
    writeJson(
      KEY_ARTIKEL,
      DEFAULT_ARTIKEL.map((a) => ({ id: makeId(), nummer: a.nummer, name: a.name }))
    )
  }
  if (!localStorage.getItem(KEY_MELDUNGEN)) {
    writeJson(KEY_MELDUNGEN, [])
  }
}

// --- Profil ---

export function getProfile() {
  return readJson(KEY_PROFILE, DEFAULT_PROFILE)
}

export function saveProfile(profile) {
  writeJson(KEY_PROFILE, profile)
}

// --- Filialen ---

export function getFilialen() {
  return readJson(KEY_FILIALEN, [])
}

export function saveFilialen(filialen) {
  writeJson(KEY_FILIALEN, filialen)
}

// --- Artikel ---

export function getArtikel() {
  return readJson(KEY_ARTIKEL, [])
}

export function saveArtikel(artikel) {
  writeJson(KEY_ARTIKEL, artikel)
}

export function resetArtikelToDefault() {
  const artikel = DEFAULT_ARTIKEL.map((a) => ({ id: makeId(), nummer: a.nummer, name: a.name }))
  writeJson(KEY_ARTIKEL, artikel)
  return artikel
}

// --- Meldungen ---

export function getMeldungen() {
  return readJson(KEY_MELDUNGEN, [])
}

export function getMeldung(id) {
  return getMeldungen().find((m) => m.id === id) || null
}

export function saveMeldung(meldung) {
  const all = getMeldungen()
  const idx = all.findIndex((m) => m.id === meldung.id)
  if (idx >= 0) all[idx] = meldung
  else all.push(meldung)
  writeJson(KEY_MELDUNGEN, all)
  return meldung
}

export function deleteMeldung(id) {
  const all = getMeldungen().filter((m) => m.id !== id)
  writeJson(KEY_MELDUNGEN, all)
}

export function createMeldung(monat) {
  const meldung = {
    id: makeId(),
    monat,
    erstelltAm: new Date().toISOString(),
    eintraege: {},
    status: 'offen',
  }
  saveMeldung(meldung)
  return meldung
}

// Vormonat als Vorlage: liefert MHD-Werte des Vormonats (gleicher Monat-1), Mengen bleiben 0
export function getVormonatVorlage(monat) {
  const [jahr, monatNr] = monat.split('-').map(Number)
  let vJahr = jahr
  let vMonat = monatNr - 1
  if (vMonat < 1) {
    vMonat = 12
    vJahr -= 1
  }
  const vormonatStr = `${vJahr}-${String(vMonat).padStart(2, '0')}`
  const alle = getMeldungen()
  const vormonat = alle
    .filter((m) => m.monat === vormonatStr)
    .sort((a, b) => new Date(b.erstelltAm) - new Date(a.erstelltAm))[0]
  if (!vormonat) return null

  const eintraege = {}
  Object.entries(vormonat.eintraege || {}).forEach(([filialeId, artikelMap]) => {
    eintraege[filialeId] = {}
    Object.entries(artikelMap || {}).forEach(([artikelId, val]) => {
      eintraege[filialeId][artikelId] = { mhd: val?.mhd || '', menge: 0 }
    })
  })
  return eintraege
}

export { makeId }
