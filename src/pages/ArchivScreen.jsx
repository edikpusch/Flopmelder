import { useState } from 'react'
import { useNav } from '../NavContext.jsx'
import {
  getMeldungen,
  deleteMeldung,
  getProfiles,
  getArtikel,
  getActiveProfileId,
  istMeldungVollstaendig,
  profilLabel,
} from '../store.js'
import { monatLabel } from './HomeScreen.jsx'
import { exportMeldung } from '../export.js'

export default function ArchivScreen() {
  const { navigate } = useNav()
  const [meldungen, setMeldungen] = useState(() => getMeldungen())
  const [nurAktiver, setNurAktiver] = useState(true)
  const profile = getProfiles()
  const artikelListe = getArtikel()
  const aktivId = getActiveProfileId()

  const sichtbar = meldungen
    .filter((m) => (nurAktiver ? m.profileId === aktivId : true))
    .sort((a, b) => b.monat.localeCompare(a.monat) || b.erstelltAm.localeCompare(a.erstelltAm))

  function profilVon(meldung) {
    return profile.find((p) => p.id === meldung.profileId) || null
  }

  async function schnellExport(e, meldung) {
    e.stopPropagation()
    const profil = profilVon(meldung)
    if (!profil) {
      alert('Das Profil zu dieser Meldung wurde gelöscht – Export nicht möglich.')
      return
    }
    await exportMeldung(meldung, profil.filialen || [], profil)
  }

  function loeschen(e, meldung) {
    e.stopPropagation()
    const profil = profilVon(meldung)
    const ok = confirm(
      `Meldung ${monatLabel(meldung.monat)}${profil ? ` (${profilLabel(profil)})` : ''} endgültig löschen?\n` +
        'Alle erfassten MHD- und Mengenwerte gehen dabei verloren.'
    )
    if (!ok) return
    deleteMeldung(meldung.id)
    setMeldungen(getMeldungen())
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={() => navigate('home')}>
          ← Zurück
        </button>
        <h1>Archiv</h1>
      </div>

      {profile.length > 1 && (
        <button className="btn secondary" onClick={() => setNurAktiver((v) => !v)}>
          {nurAktiver ? 'Alle Profile anzeigen' : 'Nur aktives Profil anzeigen'}
        </button>
      )}

      {sichtbar.length === 0 && <p className="muted">Noch keine Meldungen vorhanden.</p>}

      {sichtbar.map((m) => {
        const profil = profilVon(m)
        const filialen = profil?.filialen || []
        const vollstaendig = istMeldungVollstaendig(m, filialen, artikelListe)
        return (
          <div
            className="card"
            key={m.id}
            onClick={() => navigate('meldung', { meldungId: m.id })}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-row">
              <div>
                <div style={{ fontWeight: 600 }}>{monatLabel(m.monat)}</div>
                <div className="muted">
                  {profil ? profilLabel(profil) : 'Profil gelöscht'} · erstellt{' '}
                  {new Date(m.erstelltAm).toLocaleDateString('de-DE')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${vollstaendig ? 'fertig' : 'teilweise'}`}>
                  {vollstaendig ? 'vollständig' : 'unvollständig'}
                </span>
                <button
                  className="icon-btn"
                  onClick={(e) => schnellExport(e, m)}
                  title="Erneut exportieren"
                >
                  ⭳
                </button>
                <button className="icon-btn" onClick={(e) => loeschen(e, m)} title="Löschen">
                  🗑
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
