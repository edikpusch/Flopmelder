import { useState } from 'react'
import { useNav } from '../NavContext.jsx'
import {
  getProfiles,
  getActiveProfile,
  getActiveProfileId,
  setActiveProfileId,
  saveProfile,
  createProfile,
  deleteProfile,
  countMeldungenForProfile,
  getFilialen,
  saveFilialen,
  getArtikel,
  saveArtikel,
  resetArtikelToDefault,
  countEintraegeFuerArtikel,
  countEintraegeFuerFiliale,
  profilLabel,
  makeId,
} from '../store.js'

function moveItem(list, index, dir) {
  const newIndex = index + dir
  if (newIndex < 0 || newIndex >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(index, 1)
  copy.splice(newIndex, 0, item)
  return copy
}

const inputStyle = { padding: 8, borderRadius: 8, border: '1px solid #ccc' }

export default function EinstellungenScreen() {
  const { navigate } = useNav()
  const [profile, setProfile] = useState(() => getProfiles())
  const [aktivId, setAktivId] = useState(() => getActiveProfileId())
  const [artikel, setArtikel] = useState(() => getArtikel())
  const [neueFilialeNr, setNeueFilialeNr] = useState('')
  const [neuerArtikelNr, setNeuerArtikelNr] = useState('')
  const [neuerArtikelName, setNeuerArtikelName] = useState('')

  const aktiv = profile.find((p) => p.id === aktivId) || profile[0] || null
  const filialen = aktiv?.filialen || []

  function refreshProfile() {
    setProfile(getProfiles())
    setAktivId(getActiveProfileId())
  }

  // --- Bezirke ---

  function wechsle(id) {
    setActiveProfileId(id)
    refreshProfile()
  }

  function updateAktiv(field, value) {
    if (!aktiv) return
    saveProfile({ ...aktiv, [field]: value })
    refreshProfile()
  }

  function profilAnlegen() {
    const vlName = prompt('VL-Name für das neue Profil?')
    if (!vlName?.trim()) return
    const mitStandard = confirm(
      'Standard-Filialliste (2233, 2239, …) in das neue Profil übernehmen?\n' +
        'Abbrechen = ohne Filialen starten.'
    )
    const neu = createProfile({ vlName: vlName.trim(), mitStandardFilialen: mitStandard })
    setActiveProfileId(neu.id)
    refreshProfile()
  }

  function profilLoeschen(p) {
    const anzahl = countMeldungenForProfile(p.id)
    const ok = confirm(
      `Profil "${profilLabel(p)}" löschen?` +
        (anzahl > 0
          ? `\n\nAchtung: ${anzahl} Meldung(en) dieses Profils werden mitgelöscht.`
          : '')
    )
    if (!ok) return
    deleteProfile(p.id)
    refreshProfile()
  }

  // --- Filialen (des aktiven Bezirks) ---

  function updateFilialen(newList) {
    saveFilialen(newList)
    refreshProfile()
  }

  function addFiliale() {
    if (!neueFilialeNr.trim()) return
    updateFilialen([...filialen, { id: makeId(), nummer: neueFilialeNr.trim() }])
    setNeueFilialeNr('')
  }

  function removeFiliale(f) {
    const anzahl = countEintraegeFuerFiliale(f.id)
    if (anzahl > 0) {
      const ok = confirm(
        `An Filiale ${f.nummer} hängen ${anzahl} erfasste Werte in bestehenden Meldungen.\n` +
          'Beim Löschen verschwindet die Filiale aus allen Meldungen und Exporten. Fortfahren?'
      )
      if (!ok) return
    }
    updateFilialen(filialen.filter((x) => x.id !== f.id))
  }

  function editFilialeNr(id, nummer) {
    updateFilialen(filialen.map((f) => (f.id === id ? { ...f, nummer } : f)))
  }

  // --- Artikel (global) ---

  function updateArtikel(newList) {
    setArtikel(newList)
    saveArtikel(newList)
  }

  function addArtikel() {
    if (!neuerArtikelNr.trim() || !neuerArtikelName.trim()) return
    updateArtikel([
      ...artikel,
      { id: makeId(), nummer: neuerArtikelNr.trim(), name: neuerArtikelName.trim() },
    ])
    setNeuerArtikelNr('')
    setNeuerArtikelName('')
  }

  function removeArtikel(a) {
    const anzahl = countEintraegeFuerArtikel(a.id)
    if (anzahl > 0) {
      const ok = confirm(
        `An "${a.name}" hängen ${anzahl} erfasste Werte in bestehenden Meldungen.\n` +
          'Beim Löschen verschwindet die Spalte aus allen Meldungen und Exporten. Fortfahren?'
      )
      if (!ok) return
    }
    updateArtikel(artikel.filter((x) => x.id !== a.id))
  }

  function editArtikel(id, field, value) {
    updateArtikel(artikel.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  function resetArtikel() {
    if (
      !confirm(
        'Flop-15-Liste auf den Standard zurücksetzen?\n' +
          'Bereits erfasste Werte bleiben erhalten, solange die ArtikelNr gleich bleibt.'
      )
    )
      return
    setArtikel(resetArtikelToDefault())
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={() => navigate('home')}>
          ← Zurück
        </button>
        <h1>Einstellungen</h1>
      </div>

      <h2>Profile</h2>
      {profile.map((p) => (
        <div className="list-item" key={p.id}>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="radio"
              name="aktivesProfil"
              checked={p.id === aktiv?.id}
              onChange={() => wechsle(p.id)}
            />
            <span>
              <span style={{ fontWeight: 600 }}>{profilLabel(p)}</span>
              <span className="muted" style={{ display: 'block' }}>
                {p.filialen?.length || 0} Filialen
              </span>
            </span>
          </label>
          <div className="actions">
            <button
              className="icon-btn"
              onClick={() => profilLoeschen(p)}
              disabled={profile.length <= 1}
              title={profile.length <= 1 ? 'Das letzte Profil kann nicht gelöscht werden' : 'Profil löschen'}
            >
              🗑
            </button>
          </div>
        </div>
      ))}
      <button className="btn secondary" onClick={profilAnlegen}>
        + Neues Profil
      </button>

      {aktiv && (
        <>
          <h2>Profil „{profilLabel(aktiv)}"</h2>
          <div className="card">
            <div className="field">
              <label>VL-Name</label>
              <input
                type="text"
                value={aktiv.vlName}
                onChange={(e) => updateAktiv('vlName', e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Niederlassung</label>
              <input
                type="text"
                value={aktiv.nl}
                onChange={(e) => updateAktiv('nl', e.target.value)}
              />
            </div>
          </div>

          <h3>Filialen</h3>
          <div className="muted" style={{ marginBottom: 8 }}>
            Reihenfolge = Zeilenreihenfolge im Export
          </div>
          {filialen.map((f, i) => (
            <div className="list-item" key={f.id}>
              <input
                type="text"
                value={f.nummer}
                onChange={(e) => editFilialeNr(f.id, e.target.value)}
                style={{ ...inputStyle, flex: 1, marginRight: 8 }}
              />
              <div className="actions">
                <button className="icon-btn" onClick={() => updateFilialen(moveItem(filialen, i, -1))}>
                  ↑
                </button>
                <button className="icon-btn" onClick={() => updateFilialen(moveItem(filialen, i, 1))}>
                  ↓
                </button>
                <button className="icon-btn" onClick={() => removeFiliale(f)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
          <div className="card-row" style={{ marginBottom: 16 }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Neue Filial-Nr."
              value={neueFilialeNr}
              onChange={(e) => setNeueFilialeNr(e.target.value)}
              style={{ ...inputStyle, flex: 1, padding: 10 }}
            />
            <button className="btn small secondary" style={{ width: 'auto', margin: 0 }} onClick={addFiliale}>
              + Filiale
            </button>
          </div>
        </>
      )}

      <h2>Flop-15-Artikel</h2>
      <div className="muted" style={{ marginBottom: 8 }}>
        Gilt für alle Profile und Filialen · Reihenfolge = Spaltenreihenfolge im Export
      </div>
      {artikel.map((a, i) => (
        <div className="list-item" key={a.id}>
          <div style={{ flex: 1, display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={a.nummer}
              onChange={(e) => editArtikel(a.id, 'nummer', e.target.value)}
              style={{ ...inputStyle, width: 90 }}
            />
            <input
              type="text"
              value={a.name}
              onChange={(e) => editArtikel(a.id, 'name', e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <div className="actions">
            <button className="icon-btn" onClick={() => updateArtikel(moveItem(artikel, i, -1))}>
              ↑
            </button>
            <button className="icon-btn" onClick={() => updateArtikel(moveItem(artikel, i, 1))}>
              ↓
            </button>
            <button className="icon-btn" onClick={() => removeArtikel(a)}>
              🗑
            </button>
          </div>
        </div>
      ))}
      <div className="card-row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <input
          type="text"
          placeholder="ArtikelNr"
          value={neuerArtikelNr}
          onChange={(e) => setNeuerArtikelNr(e.target.value)}
          style={{ ...inputStyle, width: 100, padding: 10 }}
        />
        <input
          type="text"
          placeholder="Artikelname"
          value={neuerArtikelName}
          onChange={(e) => setNeuerArtikelName(e.target.value)}
          style={{ ...inputStyle, flex: 1, padding: 10 }}
        />
        <button className="btn small secondary" style={{ width: 'auto', margin: 0 }} onClick={addArtikel}>
          + Artikel
        </button>
      </div>
      <button className="btn secondary" onClick={resetArtikel}>
        Auf Standard-Flop-15 zurücksetzen
      </button>
    </div>
  )
}
