import { useRef, useState } from 'react'
import { useNav } from '../NavContext.jsx'
import {
  getMeldung,
  saveMeldung,
  getArtikel,
  getProfiles,
  getVormonatVorlage,
  findMeldung,
  countErledigt,
  getFilialeStatus,
} from '../store.js'
import { exportMeldung } from '../export.js'

export default function MeldungScreen({ meldungId }) {
  const { navigate } = useNav()
  const [meldung, setMeldung] = useState(() => getMeldung(meldungId))
  const meldungRef = useRef(meldung)
  const artikelListe = getArtikel()

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

  // Die Meldung gehört zu genau einem Bezirk - Filialen kommen aus diesem Bezirk,
  // nicht aus dem gerade aktiven. Sonst zeigt eine Archiv-Meldung fremde Filialen.
  const profil = getProfiles().find((p) => p.id === meldung.profileId) || null
  const filialen = profil?.filialen || []

  function mutateMeldung(mutator) {
    const next = mutator(meldungRef.current)
    meldungRef.current = next
    setMeldung(next)
    saveMeldung(next)
    return next
  }

  const fertigCount = filialen.filter(
    (f) => getFilialeStatus(meldung, f.id, artikelListe) === 'fertig'
  ).length

  function updateMonat(monat) {
    if (!monat) return
    const kollision = findMeldung(meldung.profileId, monat)
    if (kollision && kollision.id !== meldung.id) {
      alert(
        `Für ${monat} gibt es in diesem Bezirk bereits eine Meldung. ` +
          'Öffne sie über das Archiv, statt eine zweite anzulegen.'
      )
      return
    }
    mutateMeldung((m) => ({ ...m, monat }))
  }

  function vormonatLaden() {
    const vorlage = getVormonatVorlage(meldung.monat, meldung.profileId)
    if (!vorlage) {
      alert('Keine Meldung aus dem Vormonat für diesen Bezirk gefunden.')
      return
    }

    // Nur leere MHD-Felder befüllen. Bereits erfasste Daten und alle Mengen
    // bleiben unangetastet.
    let gefuellt = 0
    mutateMeldung((m) => {
      const eintraege = { ...(m.eintraege || {}) }
      Object.entries(vorlage.mhdWerte).forEach(([filialeId, proFiliale]) => {
        const bisher = { ...(eintraege[filialeId] || {}) }
        Object.entries(proFiliale).forEach(([artikelId, mhd]) => {
          const eintrag = bisher[artikelId]
          if (eintrag?.mhd) return // nichts überschreiben
          bisher[artikelId] = { menge: 0, ...(eintrag || {}), mhd }
          gefuellt++
        })
        eintraege[filialeId] = bisher
      })
      return { ...m, eintraege }
    })

    alert(
      gefuellt > 0
        ? `${gefuellt} MHD-Vorschläge aus ${vorlage.monat} übernommen (nur leere Felder, Mengen unverändert).`
        : `Aus ${vorlage.monat} gab es nichts zu übernehmen – alle Felder sind bereits gefüllt.`
    )
  }

  async function handleExport() {
    if (!filialen.length) {
      alert('Dieser Bezirk hat keine Filialen. Lege sie in den Einstellungen an.')
      return
    }
    if (!profil?.vlName || !profil?.nl) {
      alert(
        'Für diesen Bezirk fehlt der VL-Name oder die Niederlassung.\n' +
          'Beides steht im Dateinamen und in Spalte A – bitte in den Einstellungen ergänzen.'
      )
      return
    }
    if (fertigCount < filialen.length) {
      const offen = filialen.length - fertigCount
      const weiter = confirm(
        `${offen} von ${filialen.length} Filialen sind noch nicht vollständig ` +
          `(alle ${artikelListe.length} Artikel erfasst). Trotzdem exportieren?`
      )
      if (!weiter) return
    }
    await exportMeldung(meldung, filialen, profil)
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={() => navigate('home')}>
          ← Zurück
        </button>
        <h1>Meldung</h1>
      </div>

      <div className="muted" style={{ marginBottom: 12 }}>
        Bezirk: {profil ? `${profil.name} · VL ${profil.vlName || '–'}` : 'unbekannt (gelöscht)'}
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
        {fertigCount} / {filialen.length} Filialen vollständig
      </div>

      <button className="btn secondary" onClick={vormonatLaden}>
        Vormonat als MHD-Vorlage laden
      </button>

      {filialen.length === 0 && (
        <div className="warning-box">
          Dieser Bezirk hat noch keine Filialen. Lege sie in den Einstellungen an.
        </div>
      )}

      {filialen.map((f) => {
        const status = getFilialeStatus(meldung, f.id, artikelListe)
        const erledigt = countErledigt(meldung, f.id, artikelListe)
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
                <div className="muted">
                  {erledigt} / {artikelListe.length} Artikel erfasst
                </div>
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
