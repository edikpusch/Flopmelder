import { useState } from 'react'
import { useNav } from '../NavContext.jsx'
import {
  getMeldung,
  saveMeldung,
  getFilialen,
  getVormonatVorlage,
} from '../store.js'
import { exportMeldung } from '../export.js'

function filialeStatus(meldung, filialeId) {
  if (meldung.filialeStatus?.[filialeId] === 'fertig') return 'fertig'
  const eintraege = meldung.eintraege?.[filialeId] || {}
  const anzahlMitMenge = Object.values(eintraege).filter((e) => Number(e?.menge) > 0).length
  if (anzahlMitMenge > 0) return 'teilweise'
  return 'offen'
}

function anzahlMitMenge(meldung, filialeId) {
  const eintraege = meldung.eintraege?.[filialeId] || {}
  return Object.values(eintraege).filter((e) => Number(e?.menge) > 0).length
}

export default function MeldungScreen({ meldungId }) {
  const { navigate } = useNav()
  const [meldung, setMeldung] = useState(() => getMeldung(meldungId))
  const filialen = getFilialen()

  if (!meldung) {
    return (
      <div className="screen">
        <p>Meldung nicht gefunden.</p>
        <button className="btn" onClick={() => navigate('home')}>
          Zurück
        </button>
      </div>
    )
  }

  const fertigCount = filialen.filter((f) => filialeStatus(meldung, f.id) === 'fertig').length

  function updateMonat(monat) {
    const updated = { ...meldung, monat }
    setMeldung(updated)
    saveMeldung(updated)
  }

  function vormonatLaden() {
    const vorlage = getVormonatVorlage(meldung.monat)
    if (!vorlage) {
      alert('Keine Meldung für den Vormonat gefunden.')
      return
    }
    const updated = { ...meldung, eintraege: vorlage }
    setMeldung(updated)
    saveMeldung(updated)
  }

  async function handleExport() {
    if (fertigCount < filialen.length) {
      const weiter = confirm(
        `Nur ${fertigCount} / ${filialen.length} Filialen erfasst. Trotzdem exportieren?`
      )
      if (!weiter) return
    }
    await exportMeldung(meldung, filialen)
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={() => navigate('home')}>
          ← Zurück
        </button>
        <h1>Meldung</h1>
      </div>

      <div className="field">
        <label>Monat</label>
        <input
          type="month"
          value={meldung.monat}
          onChange={(e) => updateMonat(e.target.value)}
        />
      </div>

      <div className="progress">
        {fertigCount} / {filialen.length} Filialen erfasst
      </div>

      <button className="btn secondary" onClick={vormonatLaden}>
        Vormonat als Vorlage laden
      </button>

      {filialen.map((f) => {
        const status = filialeStatus(meldung, f.id)
        const count = anzahlMitMenge(meldung, f.id)
        return (
          <div
            className="card"
            key={f.id}
            onClick={() => navigate('filiale', { meldungId: meldung.id, filialeId: f.id })}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-row">
              <div>
                <div style={{ fontWeight: 600 }}>Filiale {f.nummer}</div>
                <div className="muted">{count} Artikel mit Menge</div>
              </div>
              <span className={`badge ${status}`}>{status}</span>
            </div>
          </div>
        )
      })}

      <div className="footer-actions">
        <button className="btn" onClick={handleExport}>
          Export .xlsx
        </button>
      </div>
    </div>
  )
}
