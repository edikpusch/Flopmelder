import { useNav } from '../NavContext.jsx'
import { createMeldung, getMeldungen } from '../store.js'

function currentMonat() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function HomeScreen() {
  const { navigate } = useNav()

  function neueMeldung() {
    const monat = currentMonat()
    const alle = getMeldungen()
    const existierende = alle.find((m) => m.monat === monat)
    const meldung = existierende || createMeldung(monat)
    navigate('meldung', { meldungId: meldung.id })
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>FlopMelder</h1>
      </div>
      <button className="btn" onClick={neueMeldung}>
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
