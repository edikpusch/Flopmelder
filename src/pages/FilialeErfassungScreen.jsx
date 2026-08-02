import { useEffect, useRef, useState } from 'react'
import { useNav } from '../NavContext.jsx'
import { getMeldung, saveMeldung, getFilialen, getArtikel } from '../store.js'

const MENGE_PRESETS = [0, 0.5, 1, 1.5, 2]

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

function istErfasst(eintrag) {
  return Number(eintrag?.menge) > 0
}

export default function FilialeErfassungScreen({ meldungId, filialeId }) {
  const { navigate } = useNav()
  const [meldung, setMeldung] = useState(() => getMeldung(meldungId))
  const meldungRef = useRef(meldung)
  const filialen = getFilialen()
  const artikelListe = getArtikel()

  // Setzt beim erneuten Öffnen genau dort fort, wo zuletzt aufgehört wurde
  // (nicht "erster Artikel mit Menge 0", da 0 auch bewusst gewählt sein kann)
  const [currentIndex, setCurrentIndex] = useState(() => {
    const letzte = meldung?.filialeLastIndex?.[filialeId]
    if (Number.isInteger(letzte) && letzte >= 0 && letzte < artikelListe.length) {
      return letzte
    }
    const idx = artikelListe.findIndex(
      (a) => !istErfasst(meldung?.eintraege?.[filialeId]?.[a.id])
    )
    return idx === -1 ? 0 : idx
  })

  const [customOpen, setCustomOpen] = useState(false)
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

  const filiale = filialen.find((f) => f.id === filialeId)
  const artikel = artikelListe[currentIndex]
  const anzahlGesamt = artikelListe.length
  const anzahlErfasst = artikelListe.filter((a) =>
    istErfasst(meldung.eintraege?.[filialeId]?.[a.id])
  ).length

  function getEintrag(artikelId) {
    return meldung.eintraege?.[filialeId]?.[artikelId] || { mhd: '', menge: 0 }
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
    setCustomOpen(false)
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
  function chooseMenge(value) {
    updateEintrag(artikel.id, { menge: value })
    setCustomOpen(false)
    if (currentIndex < anzahlGesamt - 1) {
      goNext()
    }
  }

  function openCustom() {
    const aktuelleMenge = getEintrag(artikel.id).menge
    setCustomValue(aktuelleMenge ? formatMenge(aktuelleMenge) : '')
    setCustomOpen(true)
  }

  function submitCustom() {
    chooseMenge(parseGermanNumber(customValue))
  }

  function markFertig() {
    mutateMeldung((m) => ({
      ...m,
      filialeStatus: { ...(m.filialeStatus || {}), [filialeId]: 'fertig' },
    }))
  }

  function markFertigUndZurueck() {
    markFertig()
    navigate('meldung', { meldungId: meldung.id })
  }

  function markFertigUndNaechste() {
    markFertig()
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
  const isPreset = MENGE_PRESETS.includes(menge)
  const istLetzterArtikel = currentIndex === anzahlGesamt - 1

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={() => navigate('meldung', { meldungId: meldung.id })}>
          ← Zurück
        </button>
        <h1>Filiale {filiale ? filiale.nummer : ''}</h1>
      </div>

      <div className="progress">
        Artikel {currentIndex + 1} / {anzahlGesamt} · {anzahlErfasst} mit Menge erfasst
      </div>

      <div className="artikel-chips">
        {artikelListe.map((a, i) => {
          const erfasst = istErfasst(getEintrag(a.id))
          return (
            <button
              key={a.id}
              type="button"
              className={`artikel-chip ${i === currentIndex ? 'current' : ''} ${erfasst ? 'erfasst' : ''}`}
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

        <div className="menge-buttons">
          {MENGE_PRESETS.map((preset) => (
            <button
              key={preset}
              className={`menge-btn ${menge === preset ? 'active' : ''}`}
              onClick={() => chooseMenge(preset)}
            >
              {formatMenge(preset)}
            </button>
          ))}
          <button className={`menge-btn ${!isPreset ? 'active' : ''}`} onClick={openCustom}>
            {!isPreset && menge > 0 ? formatMenge(menge) : '+'}
          </button>
        </div>

        {customOpen && (
          <div className="mhd-row" style={{ marginBottom: 0 }}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="z.B. 2,5"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              autoFocus
            />
            <button className="btn small" style={{ width: 'auto', margin: 0 }} onClick={submitCustom}>
              OK
            </button>
          </div>
        )}
      </div>

      <div className="footer-actions">
        {!istLetzterArtikel && (
          <>
            <div className="wizard-nav">
              <button className="btn secondary" onClick={goPrev} disabled={currentIndex === 0}>
                ‹ Zurück
              </button>
              <button className="btn" onClick={goNext}>
                Weiter ›
              </button>
            </div>
            <button className="finish-link" onClick={markFertigUndZurueck}>
              ✓ Filiale als fertig markieren &amp; zurück
            </button>
          </>
        )}
        {istLetzterArtikel && (
          <>
            <button className="btn secondary" onClick={markFertigUndZurueck}>
              Speichern &amp; zurück
            </button>
            <button className="btn" onClick={markFertigUndNaechste}>
              Speichern &amp; nächste Filiale
            </button>
          </>
        )}
      </div>
    </div>
  )
}
