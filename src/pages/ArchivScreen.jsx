import { useNav } from '../NavContext.jsx'
import { getMeldungen, getFilialen } from '../store.js'
import { exportMeldung } from '../export.js'

export default function ArchivScreen() {
  const { navigate } = useNav()
  const meldungen = [...getMeldungen()].sort((a, b) => b.monat.localeCompare(a.monat))
  const filialen = getFilialen()

  function gesamtStatus(meldung) {
    const alleFertig = filialen.every((f) => meldung.filialeStatus?.[f.id] === 'fertig')
    return alleFertig && filialen.length > 0 ? 'fertig' : 'offen'
  }

  async function schnellExport(e, meldung) {
    e.stopPropagation()
    await exportMeldung(meldung, filialen)
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={() => navigate('home')}>
          ← Zurück
        </button>
        <h1>Archiv</h1>
      </div>

      {meldungen.length === 0 && <p className="muted">Noch keine Meldungen vorhanden.</p>}

      {meldungen.map((m) => {
        const status = gesamtStatus(m)
        return (
          <div
            className="card"
            key={m.id}
            onClick={() => navigate('meldung', { meldungId: m.id })}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-row">
              <div>
                <div style={{ fontWeight: 600 }}>{m.monat}</div>
                <div className="muted">
                  Erstellt am {new Date(m.erstelltAm).toLocaleDateString('de-DE')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${status}`}>{status}</span>
                <button
                  className="icon-btn"
                  onClick={(e) => schnellExport(e, m)}
                  title="Erneut exportieren"
                >
                  ⭳ xlsx
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
