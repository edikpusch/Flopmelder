import { useState } from 'react'
import { useNav } from '../NavContext.jsx'
import {
  createMeldung,
  findMeldung,
  getProfiles,
  getActiveProfile,
  setActiveProfileId,
  profilLabel,
} from '../store.js'

function currentMonat() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function monatLabel(monat) {
  const [jahr, m] = String(monat || '').split('-').map(Number)
  if (!jahr || !m) return monat || ''
  const namen = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ]
  return `${namen[m - 1]} ${jahr}`
}

export default function HomeScreen() {
  const { navigate } = useNav()
  const [profile, setProfile] = useState(() => getProfiles())
  const [aktiv, setAktiv] = useState(() => getActiveProfile())

  const monat = currentMonat()
  const laufende = aktiv ? findMeldung(aktiv.id, monat) : null

  function wechsle(id) {
    setActiveProfileId(id)
    setAktiv(getActiveProfile())
    setProfile(getProfiles())
  }

  // Jeder Monat ist eine eigene Meldung. Existiert die des laufenden Monats
  // schon, wird sie fortgesetzt statt eine zweite anzulegen.
  function neueMeldung() {
    if (!aktiv) return
    const meldung = laufende || createMeldung(monat, aktiv.id)
    navigate('meldung', { meldungId: meldung.id })
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>FlopMelder</h1>
      </div>

      {!aktiv && (
        <div className="warning-box">
          Noch kein Profil angelegt. Lege in den Einstellungen ein Profil mit VL-Name
          und Filialnummern an.
        </div>
      )}

      {aktiv && (
        <div className="card">
          <div className="muted" style={{ marginBottom: 6 }}>Aktives Profil</div>
          {profile.length > 1 ? (
            <select
              value={aktiv.id}
              onChange={(e) => wechsle(e.target.value)}
              style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 10, border: '1px solid #ccc' }}
            >
              {profile.map((p) => (
                <option key={p.id} value={p.id}>
                  {profilLabel(p)} · {p.filialen?.length || 0} Filialen
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontWeight: 600, fontSize: 17 }}>{profilLabel(aktiv)}</div>
          )}
          <div className="muted" style={{ marginTop: 8 }}>
            {aktiv.filialen?.length || 0} Filialen
          </div>
        </div>
      )}

      <button className="btn" onClick={neueMeldung} disabled={!aktiv}>
        {laufende ? `Meldung ${monatLabel(monat)} fortsetzen` : `Meldung ${monatLabel(monat)} starten`}
      </button>
      <button className="btn secondary" onClick={() => navigate('archiv')}>
        Archiv
      </button>
      <button className="btn secondary" onClick={() => navigate('einstellungen')}>
        Einstellungen
      </button>
    </div>
  )
}
