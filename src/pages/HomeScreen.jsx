import { useState } from 'react'
import { useNav } from '../NavContext.jsx'
import {
  createMeldung,
  findMeldung,
  getProfiles,
  getActiveProfile,
  setActiveProfileId,
} from '../store.js'

function currentMonat() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function HomeScreen() {
  const { navigate } = useNav()
  const [profile, setProfile] = useState(() => getProfiles())
  const [aktiv, setAktiv] = useState(() => getActiveProfile())

  function wechsle(id) {
    setActiveProfileId(id)
    setAktiv(getActiveProfile())
    setProfile(getProfiles())
  }

  function neueMeldung() {
    if (!aktiv) return
    const monat = currentMonat()
    const vorhandene = findMeldung(aktiv.id, monat)
    const meldung = vorhandene || createMeldung(monat, aktiv.id)
    navigate('meldung', { meldungId: meldung.id })
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>FlopMelder</h1>
      </div>

      {!aktiv && (
        <div className="warning-box">
          Noch kein Bezirk angelegt. Lege in den Einstellungen einen Bezirk mit Filialen an.
        </div>
      )}

      {aktiv && (
        <div className="card">
          <div className="muted" style={{ marginBottom: 6 }}>Aktiver Bezirk</div>
          {profile.length > 1 ? (
            <select
              value={aktiv.id}
              onChange={(e) => wechsle(e.target.value)}
              style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 10, border: '1px solid #ccc' }}
            >
              {profile.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.vlName} · {p.filialen?.length || 0} Filialen
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontWeight: 600, fontSize: 17 }}>{aktiv.name}</div>
          )}
          <div className="muted" style={{ marginTop: 8 }}>
            VL {aktiv.vlName || '–'} · NL {aktiv.nl || '–'} · {aktiv.filialen?.length || 0} Filialen
          </div>
        </div>
      )}

      <button className="btn" onClick={neueMeldung} disabled={!aktiv}>
        Neue Meldung
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
