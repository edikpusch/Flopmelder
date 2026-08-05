// localStorage-Zugriff für FlopMelder
// Keys: fm_profiles, fm_active_profile, fm_artikel, fm_meldungen
//
// Ein Profil = VL-Name + Niederlassung + eigene Filialliste. Identifiziert wird es
// über den VL-Namen, ein zusätzliches Bezeichnungsfeld gibt es bewusst nicht.
// Die Flop-15-Artikelliste ist GLOBAL (in allen Filialen dieselbe Reihenfolge) und
// liegt deshalb nicht im Profil.

const KEY_PROFILES = 'fm_profiles'
const KEY_ACTIVE_PROFILE = 'fm_active_profile'
const KEY_ARTIKEL = 'fm_artikel'
const KEY_MELDUNGEN = 'fm_meldungen'

// Altlasten aus der Ein-Profil-Version, werden einmalig migriert
const LEGACY_KEY_PROFILE = 'fm_profile'
const LEGACY_KEY_FILIALEN = 'fm_filialen'

const DEFAULT_VL = 'Pusch'
const DEFAULT_NL = 'Ganderkesee'

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

function defaultFilialen() {
  return DEFAULT_FILIALEN_NUMMERN.map((nummer) => ({ id: makeId(), nummer }))
}

function defaultArtikel() {
  return DEFAULT_ARTIKEL.map((a) => ({ id: makeId(), nummer: a.nummer, name: a.name }))
}

// --- Seeding & Migration ---

export function seedIfEmpty() {
  if (!localStorage.getItem(KEY_ARTIKEL)) {
    writeJson(KEY_ARTIKEL, defaultArtikel())
  }
  if (!localStorage.getItem(KEY_MELDUNGEN)) {
    writeJson(KEY_MELDUNGEN, [])
  }

  if (!localStorage.getItem(KEY_PROFILES)) {
    // Migration aus der Ein-Profil-Version: vorhandene Stammdaten übernehmen,
    // damit bestehende Meldungen weiter passen (IDs der Filialen bleiben!)
    const legacyProfile = readJson(LEGACY_KEY_PROFILE, null)
    const legacyFilialen = readJson(LEGACY_KEY_FILIALEN, null)

    const profil = {
      id: makeId(),
      vlName: legacyProfile?.vlName || DEFAULT_VL,
      nl: legacyProfile?.nl || DEFAULT_NL,
      filialen: Array.isArray(legacyFilialen) && legacyFilialen.length
        ? legacyFilialen
        : defaultFilialen(),
    }
    writeJson(KEY_PROFILES, [profil])
    writeJson(KEY_ACTIVE_PROFILE, profil.id)

    // Bestehende Meldungen dem migrierten Profil zuordnen
    const meldungen = readJson(KEY_MELDUNGEN, [])
    if (meldungen.some((m) => !m.profileId)) {
      writeJson(
        KEY_MELDUNGEN,
        meldungen.map((m) => (m.profileId ? m : { ...m, profileId: profil.id }))
      )
    }
  }

  // Profile aus einer Zwischenversion hatten ein separates 'name'-Feld.
  // Wenn dabei kein VL-Name gesetzt wurde, dient der alte Name als VL-Name.
  const profile = getProfiles()
  if (profile.some((p) => !p.vlName && p.name)) {
    saveProfiles(profile.map((p) => (p.vlName || !p.name ? p : { ...p, vlName: p.name })))
  }

  // Aktives Profil absichern (z.B. wenn es gelöscht wurde)
  const aktuelle = getProfiles()
  const aktiv = readJson(KEY_ACTIVE_PROFILE, null)
  if (aktuelle.length && !aktuelle.some((p) => p.id === aktiv)) {
    writeJson(KEY_ACTIVE_PROFILE, aktuelle[0].id)
  }
}

// Anzeigename eines Profils - es gibt kein eigenes Bezeichnungsfeld mehr
export function profilLabel(profil) {
  if (!profil) return ''
  const teile = [profil.vlName || 'ohne VL-Name']
  if (profil.nl) teile.push(profil.nl)
  return teile.join(' · ')
}

// --- Profile (Bezirke) ---

export function getProfiles() {
  return readJson(KEY_PROFILES, [])
}

export function saveProfiles(profile) {
  writeJson(KEY_PROFILES, profile)
}

export function getActiveProfileId() {
  return readJson(KEY_ACTIVE_PROFILE, null)
}

export function setActiveProfileId(id) {
  writeJson(KEY_ACTIVE_PROFILE, id)
}

export function getActiveProfile() {
  const alle = getProfiles()
  const id = getActiveProfileId()
  return alle.find((p) => p.id === id) || alle[0] || null
}

export function saveProfile(profil) {
  const alle = getProfiles()
  const idx = alle.findIndex((p) => p.id === profil.id)
  if (idx >= 0) alle[idx] = profil
  else alle.push(profil)
  saveProfiles(alle)
  return profil
}

export function createProfile({ vlName, nl, mitStandardFilialen = false } = {}) {
  const profil = {
    id: makeId(),
    vlName: vlName || '',
    nl: nl || '',
    filialen: mitStandardFilialen ? defaultFilialen() : [],
  }
  saveProfile(profil)
  return profil
}

// Löscht das Profil samt seiner Meldungen (sonst blieben verwaiste Meldungen liegen)
export function deleteProfile(id) {
  const rest = getProfiles().filter((p) => p.id !== id)
  saveProfiles(rest)
  writeJson(
    KEY_MELDUNGEN,
    getMeldungen().filter((m) => m.profileId !== id)
  )
  if (getActiveProfileId() === id) {
    setActiveProfileId(rest[0]?.id ?? null)
  }
  return rest
}

export function countMeldungenForProfile(profileId) {
  return getMeldungen().filter((m) => m.profileId === profileId).length
}

// --- Filialen (immer die des aktiven Bezirks) ---

export function getFilialen() {
  return getActiveProfile()?.filialen || []
}

export function saveFilialen(filialen) {
  const profil = getActiveProfile()
  if (!profil) return
  saveProfile({ ...profil, filialen })
}

// --- Artikel (global) ---

export function getArtikel() {
  return readJson(KEY_ARTIKEL, [])
}

export function saveArtikel(artikel) {
  writeJson(KEY_ARTIKEL, artikel)
}

// Setzt auf die Standardliste zurück, behält aber die IDs bereits bekannter
// ArtikelNummern bei. Sonst würden alle vorhandenen Meldungen ihre Einträge
// verlieren (sie referenzieren die Artikel-ID).
export function resetArtikelToDefault() {
  const bisher = getArtikel()
  const artikel = DEFAULT_ARTIKEL.map((a) => {
    const treffer = bisher.find((b) => b.nummer === a.nummer)
    return { id: treffer ? treffer.id : makeId(), nummer: a.nummer, name: a.name }
  })
  writeJson(KEY_ARTIKEL, artikel)
  return artikel
}

// Wie viele erfasste Einträge hängen an einem Artikel / einer Filiale?
// Basis für die Warnung vor dem Löschen.
export function countEintraegeFuerArtikel(artikelId) {
  let n = 0
  getMeldungen().forEach((m) => {
    Object.values(m.eintraege || {}).forEach((proFiliale) => {
      if (proFiliale?.[artikelId]) n++
    })
  })
  return n
}

export function countEintraegeFuerFiliale(filialeId) {
  let n = 0
  getMeldungen().forEach((m) => {
    const proFiliale = m.eintraege?.[filialeId]
    if (proFiliale) n += Object.keys(proFiliale).length
  })
  return n
}

// --- Meldungen ---

export function getMeldungen() {
  return readJson(KEY_MELDUNGEN, [])
}

export function getMeldungenForProfile(profileId) {
  return getMeldungen().filter((m) => m.profileId === profileId)
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
  writeJson(
    KEY_MELDUNGEN,
    getMeldungen().filter((m) => m.id !== id)
  )
}

export function findMeldung(profileId, monat) {
  return getMeldungen().find((m) => m.profileId === profileId && m.monat === monat) || null
}

export function createMeldung(monat, profileId) {
  const meldung = {
    id: makeId(),
    profileId,
    monat,
    erstelltAm: new Date().toISOString(),
    eintraege: {},
    filialeLastIndex: {},
  }
  saveMeldung(meldung)
  return meldung
}

// "2026-01" -> "2025-12"
export function vorherigerMonat(monat) {
  const [jahr, monatNr] = String(monat || '').split('-').map(Number)
  if (!jahr || !monatNr) return null
  const vJahr = monatNr === 1 ? jahr - 1 : jahr
  const vMonat = monatNr === 1 ? 12 : monatNr - 1
  return `${vJahr}-${String(vMonat).padStart(2, '0')}`
}

// MHD desselben Artikels in derselben Filiale aus dem Vormonat.
// Bewusst STRIKT der Vormonat: fehlt er, gibt es nichts zu übernehmen (auch wenn
// zwei Monate vorher Werte lägen). Mengen werden nie übernommen.
export function getVormonatMhd(monat, profileId, filialeId, artikelId) {
  const vormonatStr = vorherigerMonat(monat)
  if (!vormonatStr) return null
  const vormonat = getMeldungen()
    .filter((m) => m.monat === vormonatStr && m.profileId === profileId)
    .sort((a, b) => new Date(b.erstelltAm) - new Date(a.erstelltAm))[0]
  const mhd = vormonat?.eintraege?.[filialeId]?.[artikelId]?.mhd
  return mhd ? { monat: vormonatStr, mhd } : null
}

// --- Abgeleiteter Status (nicht gespeichert, immer berechnet) ---
//
// Ein Artikel gilt als erledigt, sobald bewusst eine Menge gewählt wurde -
// auch die 0 ("kein Bestand"). Reines Weiterblättern zählt NICHT.
export function istArtikelErledigt(eintrag) {
  return eintrag?.erfasst === true || Number(eintrag?.menge) > 0
}

export function countErledigt(meldung, filialeId, artikelListe) {
  const eintraege = meldung?.eintraege?.[filialeId] || {}
  return artikelListe.filter((a) => istArtikelErledigt(eintraege[a.id])).length
}

export function getFilialeStatus(meldung, filialeId, artikelListe) {
  if (!artikelListe.length) return 'offen'
  const erledigt = countErledigt(meldung, filialeId, artikelListe)
  if (erledigt >= artikelListe.length) return 'fertig'
  if (erledigt > 0) return 'teilweise'
  return 'offen'
}

export function istMeldungVollstaendig(meldung, filialen, artikelListe) {
  if (!filialen.length || !artikelListe.length) return false
  return filialen.every((f) => getFilialeStatus(meldung, f.id, artikelListe) === 'fertig')
}

export { makeId }
