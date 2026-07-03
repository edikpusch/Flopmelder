import { useState } from 'react'
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

export default function FilialeErfassungScreen({ meldungId, filialeId }) {
  const { navigate } = useNav()
  const [meldung, setMeldung] = useState(() => getMeldung(meldungId))
  const filialen = getFilialen()
  const artikelListe = getArtikel()
  const [customEditId, setCustomEditId] = useState(null)
  const [customValue, setCustomValue] = useState('')
  const [mhdModus, setMhdModus] = useState(() => {
    const initial = {}
    artikelListe.forEach((a) => {
      const mhd = meldung?.eintraege?.[filialeId]?.[a.id]?.mhd || ''
      initial[a.id] = mhdModusAusWert(mhd)
    })
    return initial
  })

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

  function getEintrag(artikelId) {
    return meldung.eintraege?.[filialeId]?.[artikelId] || { mhd: '', menge: 0 }
  }

  function updateEintrag(artikelId, patch) {
    const eintraege = { ...(meldung.eintraege || {}) }
    const filialeEintraege = { ...(eintraege[filialeId] || {}) }
    const bisher = filialeEintraege[artikelId] || { mhd: '', menge: 0 }
    filialeEintraege[artikelId] = { ...bisher, ...patch }
    eintraege[filialeId] = filialeEintraege
    const updated = { ...meldung, eintraege }
    setMeldung(updated)
    saveMeldung(updated)
  }

  function setMenge(artikelId, menge) {
    updateEintrag(artikelId, { menge })
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

  function openCustom(artikelId) {
    const aktuelleMenge = getEintrag(artikelId).menge
    setCustomValue(aktuelleMenge ? formatMenge(aktuelleMenge) : '')
    setCustomEditId(artikelId)
  }

  function submitCustom(artikelId) {
    const n = parseGermanNumber(customValue)
    setMenge(artikelId, n)
    setCustomEditId(null)
  }

  function markFertigUndZurueck() {
    const filialeStatus = { ...(meldung.filialeStatus || {}), [filialeId]: 'fertig' }
    const updated = { ...meldung, filialeStatus }
    saveMeldung(updated)
    navigate('meldung', { meldungId: meldung.id })
  }

  function markFertigUndNaechste() {
    const filialeStatus = { ...(meldung.filialeStatus || {}), [filialeId]: 'fertig' }
    const updated = { ...meldung, filialeStatus }
    saveMeldung(updated)
    const idx = filialen.findIndex((f) => f.id === filialeId)
    const naechste = filialen[idx + 1]
    if (naechste) {
      navigate('filiale', { meldungId: meldung.id, filialeId: naechste.id })
    } else {
      navigate('meldung', { meldungId: meldung.id })
    }
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={() => navigate('meldung', { meldungId: meldung.id })}>
          ← Zurück
        </button>
        <h1>Filiale {filiale ? filiale.nummer : ''}</h1>
      </div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Monat: {meldung.monat}
      </div>

      {artikelListe.map((a) => {
        const eintrag = getEintrag(a.id)
        const menge = Number(eintrag.menge) || 0
        const isPreset = MENGE_PRESETS.includes(menge)
        const mengeSichtbar = menge > 0

        return (
          <div className="artikel-row" key={a.id}>
            <div className="artikel-name">{a.name}</div>
            <div className="artikel-nr">{a.nummer}</div>
            <div className="menge-buttons">
              {MENGE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`menge-btn ${menge === preset ? 'active' : ''}`}
                  onClick={() => setMenge(a.id, preset)}
                >
                  {formatMenge(preset)}
                </button>
              ))}
              <button
                className={`menge-btn ${!isPreset ? 'active' : ''}`}
                onClick={() => openCustom(a.id)}
              >
                {!isPreset && menge > 0 ? formatMenge(menge) : '+'}
              </button>
            </div>

            {customEditId === a.id && (
              <div className="mhd-row" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="z.B. 2,5"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  autoFocus
                />
                <button className="btn small" style={{ width: 'auto', margin: 0 }} onClick={() => submitCustom(a.id)}>
                  OK
                </button>
              </div>
            )}

            {mengeSichtbar && (
              <div className="mhd-row">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={getMhdModus(a.id) === 'monat' ? 'MM.JJJJ' : 'TT.MM.JJJJ'}
                  value={eintrag.mhd}
                  onChange={(e) => handleMhdChange(a.id, e.target.value)}
                  onKeyDown={(e) => handleMhdKeyDown(a.id, e)}
                />
                <button
                  type="button"
                  className="mhd-modus-btn"
                  onClick={() => toggleMhdModus(a.id)}
                  title="Zwischen Tag+Monat+Jahr und nur Monat+Jahr wechseln"
                >
                  {getMhdModus(a.id) === 'monat' ? 'Monat' : 'Tag'}
                </button>
                <input
                  type="date"
                  onChange={(e) => {
                    setMhd(a.id, dateInputToDE(e.target.value))
                    setMhdModus((prev) => ({ ...prev, [a.id]: 'tag' }))
                  }}
                  aria-label="Datepicker"
                />
              </div>
            )}
          </div>
        )
      })}

      <div className="footer-actions">
        <button className="btn secondary" onClick={markFertigUndZurueck}>
          Speichern &amp; zurück
        </button>
        <button className="btn" onClick={markFertigUndNaechste}>
          Speichern &amp; nächste Filiale
        </button>
      </div>
    </div>
  )
}
