import { useEffect, useRef, useState } from 'react'
import { useNav } from '../NavContext.jsx'
import {
  getMeldung,
  saveMeldung,
  getProfiles,
  getArtikel,
  istArtikelErledigt,
  getVormonatMhd,
} from '../store.js'

const MENGE_PRESETS = [0, 0.5, 1, 1.5, 2, 2.5]

function parseGermanNumber(str) {
  const n = Number(String(str).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function formatMenge(n) {
  return String(n).replace('.', ',')
}

// Konvertiert Date-Picker-Wert (YYYY-MM-DD) in TT.MM.JJJJ
function dateInputToDE(value) {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  return `${d}.${m}.${y}`
}

// Ziffern-Gruppierung je MHD-Modus: 'tag' = TT.MM.JJJJ, 'monat' = MM.JJJJ
const MHD_GROUPS = { tag: [2, 2, 4], monat: [2, 4] }
const MHD_MAX_DIGITS = { tag: 8, monat: 6 }

function digitsOnly(str) {
  return (str || '').replace(/\D/g, '')
}

// Setzt beim Tippen automatisch Punkte, sobald ein Ziffernblock voll ist
// (z.B. "15062026" -> "15.06.2026", "0826" -> "08.26")
function formatMhdDigits(digits, modus) {
  const groups = MHD_GROUPS[modus]
  const teile = []
  let idx = 0
  for (const size of groups) {
    const chunk = digits.slice(idx, idx + size)
    if (!chunk) break
    teile.push(chunk)
    idx += size
    if (idx >= digits.length) break
  }
  return teile.join('.')
}

function mhdModusAusWert(mhd) {
  const punkte = (mhd.match(/\./g) || []).length
  return punkte === 1 ? 'monat' : 'tag'
}

export default function FilialeErfassungScreen({ meldungId, filialeId }) {
  const { navigate } = useNav()
  const [meldung, setMeldung] = useState(() => getMeldung(meldungId))
  const meldungRef = useRef(meldung)
  const artikelListe = getArtikel()

  // Setzt beim erneuten Öffnen genau dort fort, wo zuletzt aufgehört wurde
  // (nicht "erster Artikel ohne Menge", da 0 auch bewusst gewählt sein kann)
  const [currentIndex, setCurrentIndex] = useState(() => {
    const letzte = meldung?.filialeLastIndex?.[filialeId]
    if (Number.isInteger(letzte) && letzte >= 0 && letzte < artikelListe.length) {
      return letzte
    }
    const idx = artikelListe.findIndex(
      (a) => !istArtikelErledigt(meldung?.eintraege?.[filialeId]?.[a.id])
    )
    return idx === -1 ? 0 : idx
  })

  const [customValue, setCustomValue] = useState('')
  const [mhdModus, setMhdModus] = useState(() => {
    const initial = {}
    artikelListe.forEach((a) => {
      const mhd = meldung?.eintraege?.[filialeId]?.[a.id]?.mhd || ''
      initial[a.id] = mhdModusAusWert(mhd)
    })
    return initial
  })

  const mhdInputRef = useRef(null)

  // Beim Betreten eines Artikels direkt ins MHD-Feld springen (Datum zuerst eintippen,
  // danach Menge wählen - das schließt die Tastatur automatisch beim Weiterspringen)
  useEffect(() => {
    const el = mhdInputRef.current
    if (el) {
      el.focus()
      el.select()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex])

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

  // Filialen kommen aus dem Bezirk DIESER Meldung, nicht aus dem aktiven Bezirk
  const profil = getProfiles().find((p) => p.id === meldung.profileId) || null
  const filialen = profil?.filialen || []
  const filiale = filialen.find((f) => f.id === filialeId)
  const artikel = artikelListe[currentIndex]
  const anzahlGesamt = artikelListe.length

  if (!artikel) {
    return (
      <div className="screen">
        <p>Keine Artikel vorhanden. Lege sie in den Einstellungen an.</p>
        <button className="btn" onClick={() => navigate('meldung', { meldungId })}>
          Zurück
        </button>
      </div>
    )
  }

  // ALLE Schreibzugriffe laufen hierüber. Der Ref hält immer den neuesten Stand,
  // damit mehrere Änderungen im selben Event-Handler aufeinander aufbauen. Ohne das
  // überschreibt z.B. goTo() die gerade in updateEintrag() gesetzte Menge, weil der
  // React-State innerhalb eines Handlers noch der alte ist.
  function mutateMeldung(mutator) {
    const next = mutator(meldungRef.current)
    meldungRef.current = next
    setMeldung(next)
    saveMeldung(next)
    return next
  }

  function getEintrag(artikelId) {
    return meldung.eintraege?.[filialeId]?.[artikelId] || { mhd: '', menge: 0 }
  }

  function updateEintrag(artikelId, patch) {
    mutateMeldung((m) => {
      const eintraege = { ...(m.eintraege || {}) }
      const filialeEintraege = { ...(eintraege[filialeId] || {}) }
      const bisher = filialeEintraege[artikelId] || { mhd: '', menge: 0 }
      filialeEintraege[artikelId] = { ...bisher, ...patch }
      eintraege[filialeId] = filialeEintraege
      return { ...m, eintraege }
    })
  }

  function setMhd(artikelId, mhd) {
    updateEintrag(artikelId, { mhd })
  }

  function getMhdModus(artikelId) {
    return mhdModus[artikelId] || 'tag'
  }

  function handleMhdChange(artikelId, rawValue) {
    const modus = getMhdModus(artikelId)
    const digits = digitsOnly(rawValue).slice(0, MHD_MAX_DIGITS[modus])
    setMhd(artikelId, formatMhdDigits(digits, modus))
  }

  function handleMhdKeyDown(artikelId, e) {
    if (e.key !== 'Backspace') return
    e.preventDefault()
    const modus = getMhdModus(artikelId)
    const digits = digitsOnly(getEintrag(artikelId).mhd).slice(0, -1)
    setMhd(artikelId, formatMhdDigits(digits, modus))
  }

  function toggleMhdModus(artikelId) {
    const next = getMhdModus(artikelId) === 'tag' ? 'monat' : 'tag'
    const digits = digitsOnly(getEintrag(artikelId).mhd).slice(0, MHD_MAX_DIGITS[next])
    setMhd(artikelId, formatMhdDigits(digits, next))
    setMhdModus((prev) => ({ ...prev, [artikelId]: next }))
  }

  function goTo(index) {
    const clamped = Math.max(0, Math.min(index, anzahlGesamt - 1))
    setCustomValue('')
    setCurrentIndex(clamped)
    mutateMeldung((m) => ({
      ...m,
      filialeLastIndex: { ...(m.filialeLastIndex || {}), [filialeId]: clamped },
    }))
  }

  function goNext() {
    goTo(currentIndex + 1)
  }

  function goPrev() {
    goTo(currentIndex - 1)
  }

  // Menge ist der letzte Schritt für einen Artikel (Datum kommt zuerst) -> danach
  // automatisch weiter. Das Tippen auf einen Button schließt die Tastatur von selbst,
  // da der Fokus vom MHD-Textfeld weg auf den Button wandert.
  // erfasst=true markiert den Artikel als bewusst entschieden - auch bei Menge 0.
  function chooseMenge(value) {
    updateEintrag(artikel.id, { menge: value, erfasst: true })
    setCustomValue('')
    if (currentIndex < anzahlGesamt - 1) {
      goNext()
    }
  }

  // "OK"/Enter im freien Feld verhält sich wie ein Preset-Tap
  function submitCustom() {
    if (!customValue.trim()) return
    chooseMenge(parseGermanNumber(customValue))
  }

  // Übernimmt das MHD des Vormonats; die Menge bleibt bewusst unangetastet,
  // der Artikel gilt dadurch NICHT als erfasst.
  function vormonatUebernehmen() {
    if (!vormonat) return
    setMhd(artikel.id, vormonat.mhd)
    setMhdModus((prev) => ({ ...prev, [artikel.id]: mhdModusAusWert(vormonat.mhd) }))
  }

  function zurueckZurUebersicht() {
    navigate('meldung', { meldungId: meldung.id })
  }

  function naechsteFiliale() {
    const idx = filialen.findIndex((f) => f.id === filialeId)
    const naechste = filialen[idx + 1]
    if (naechste) {
      navigate('filiale', { meldungId: meldung.id, filialeId: naechste.id })
    } else {
      navigate('meldung', { meldungId: meldung.id })
    }
  }

  const eintrag = getEintrag(artikel.id)
  const menge = Number(eintrag.menge) || 0
  // Ohne bewusste Wahl darf keine Menge markiert sein - sonst sieht ein unberührter
  // Artikel so aus, als wäre die 0 bereits gewählt worden.
  const istErfasst = istArtikelErledigt(eintrag)
  const isPreset = MENGE_PRESETS.includes(menge)
  const istLetzterArtikel = currentIndex === anzahlGesamt - 1
  const erledigteArtikel = artikelListe.filter((a) => istArtikelErledigt(getEintrag(a.id)))
  const vormonat = getVormonatMhd(meldung.monat, meldung.profileId, filialeId, artikel.id)
  // Freies Feld zeigt den Wert nur, wenn er kein Preset ist (z.B. 4,5)
  const customAnzeige =
    customValue || (istErfasst && !isPreset && menge > 0 ? formatMenge(menge) : '')

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={zurueckZurUebersicht}>
          ← Zurück
        </button>
        <h1>Filiale {filiale ? filiale.nummer : ''}</h1>
        <span className="header-meta">
          {currentIndex + 1}/{anzahlGesamt} · {erledigteArtikel.length} erfasst
        </span>
      </div>

      <div className="artikel-chips">
        {artikelListe.map((a, i) => {
          const erledigt = istArtikelErledigt(getEintrag(a.id))
          return (
            <button
              key={a.id}
              type="button"
              className={`artikel-chip ${i === currentIndex ? 'current' : ''} ${erledigt ? 'erfasst' : ''}`}
              onClick={() => goTo(i)}
              title={a.name}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      <div className="artikel-card">
        <div className="artikel-name-big">{artikel.name}</div>
        <div className="artikel-nr">{artikel.nummer}</div>

        <div className="mhd-row">
          <input
            ref={mhdInputRef}
            type="text"
            inputMode="numeric"
            placeholder={getMhdModus(artikel.id) === 'monat' ? 'MM.JJJJ' : 'TT.MM.JJJJ'}
            value={eintrag.mhd}
            onChange={(e) => handleMhdChange(artikel.id, e.target.value)}
            onKeyDown={(e) => handleMhdKeyDown(artikel.id, e)}
          />
          <button
            type="button"
            className="mhd-modus-btn"
            onClick={() => toggleMhdModus(artikel.id)}
            title="Zwischen Tag+Monat+Jahr und nur Monat+Jahr wechseln"
          >
            {getMhdModus(artikel.id) === 'monat' ? 'Monat' : 'Tag'}
          </button>
          <input
            type="date"
            onChange={(e) => {
              setMhd(artikel.id, dateInputToDE(e.target.value))
              setMhdModus((prev) => ({ ...prev, [artikel.id]: 'tag' }))
            }}
            aria-label="Datepicker"
          />
        </div>

        {vormonat && (
          <button type="button" className="vormonat-btn" onClick={vormonatUebernehmen}>
            ↩ Vormonat übernehmen: {vormonat.mhd}
          </button>
        )}

        <div className="menge-buttons">
          {MENGE_PRESETS.map((preset) => (
            <button
              key={preset}
              className={`menge-btn ${istErfasst && menge === preset ? 'active' : ''}`}
              onClick={() => chooseMenge(preset)}
            >
              {formatMenge(preset)}
            </button>
          ))}
        </div>

        <div className={`custom-menge-row ${istErfasst && !isPreset ? 'active' : ''}`}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="andere Menge"
            value={customAnzeige}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCustom()
            }}
          />
          <button className="custom-ok-btn" onClick={submitCustom}>
            OK
          </button>
        </div>

        {!istErfasst && (
          <div className="muted" style={{ marginTop: 10 }}>
            Noch nicht erfasst – wähle eine Menge (auch 0 zählt).
          </div>
        )}
      </div>

      <div className="footer-actions">
        {!istLetzterArtikel && (
          <div className="wizard-nav">
            <button className="btn secondary" onClick={goPrev} disabled={currentIndex === 0}>
              ‹ Zurück
            </button>
            <button className="btn" onClick={goNext}>
              Weiter ›
            </button>
          </div>
        )}
        {istLetzterArtikel && (
          <div className="wizard-nav">
            <button className="btn secondary" onClick={goPrev} disabled={currentIndex === 0}>
              ‹ Zurück
            </button>
            <button className="btn" onClick={naechsteFiliale}>
              Nächste Filiale ›
            </button>
          </div>
        )}
        <button className="finish-link" onClick={zurueckZurUebersicht}>
          Zur Filialübersicht
        </button>
      </div>
    </div>
  )
}
