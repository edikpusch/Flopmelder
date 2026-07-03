import { useState } from 'react'
import { useNav } from '../NavContext.jsx'
import {
  getProfile,
  saveProfile,
  getFilialen,
  saveFilialen,
  getArtikel,
  saveArtikel,
  resetArtikelToDefault,
  makeId,
} from '../store.js'

function moveItem(list, index, dir) {
  const newIndex = index + dir
  if (newIndex < 0 || newIndex >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(index, 1)
  copy.splice(newIndex, 0, item)
  return copy
}

export default function EinstellungenScreen() {
  const { navigate } = useNav()
  const [profile, setProfile] = useState(getProfile())
  const [filialen, setFilialen] = useState(getFilialen())
  const [artikel, setArtikel] = useState(getArtikel())
  const [neueFilialeNr, setNeueFilialeNr] = useState('')
  const [neuerArtikelNr, setNeuerArtikelNr] = useState('')
  const [neuerArtikelName, setNeuerArtikelName] = useState('')

  function updateProfile(field, value) {
    const updated = { ...profile, [field]: value }
    setProfile(updated)
    saveProfile(updated)
  }

  function updateFilialen(newList) {
    setFilialen(newList)
    saveFilialen(newList)
  }

  function updateArtikel(newList) {
    setArtikel(newList)
    saveArtikel(newList)
  }

  function addFiliale() {
    if (!neueFilialeNr.trim()) return
    updateFilialen([...filialen, { id: makeId(), nummer: neueFilialeNr.trim() }])
    setNeueFilialeNr('')
  }

  function removeFiliale(id) {
    updateFilialen(filialen.filter((f) => f.id !== id))
  }

  function editFilialeNr(id, nummer) {
    updateFilialen(filialen.map((f) => (f.id === id ? { ...f, nummer } : f)))
  }

  function addArtikel() {
    if (!neuerArtikelNr.trim() || !neuerArtikelName.trim()) return
    updateArtikel([
      ...artikel,
      { id: makeId(), nummer: neuerArtikelNr.trim(), name: neuerArtikelName.trim() },
    ])
    setNeuerArtikelNr('')
    setNeuerArtikelName('')
  }

  function removeArtikel(id) {
    updateArtikel(artikel.filter((a) => a.id !== id))
  }

  function editArtikel(id, field, value) {
    updateArtikel(artikel.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  function resetArtikel() {
    if (!confirm('Flop-15-Liste wirklich auf Standard zurücksetzen?')) return
    const reset = resetArtikelToDefault()
    setArtikel(reset)
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="btn ghost" onClick={() => navigate('home')}>
          ← Zurück
        </button>
        <h1>Einstellungen</h1>
      </div>

      <div className="card">
        <div className="field">
          <label>VL-Name</label>
          <input
            type="text"
            value={profile.vlName}
            onChange={(e) => updateProfile('vlName', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Niederlassung</label>
          <input
            type="text"
            value={profile.nl}
            onChange={(e) => updateProfile('nl', e.target.value)}
          />
        </div>
      </div>

      <h2>Filialen</h2>
      {filialen.map((f, i) => (
        <div className="list-item" key={f.id}>
          <input
            type="text"
            value={f.nummer}
            onChange={(e) => editFilialeNr(f.id, e.target.value)}
            style={{ flex: 1, marginRight: 8, padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
          />
          <div className="actions">
            <button className="icon-btn" onClick={() => updateFilialen(moveItem(filialen, i, -1))}>
              ↑
            </button>
            <button className="icon-btn" onClick={() => updateFilialen(moveItem(filialen, i, 1))}>
              ↓
            </button>
            <button className="icon-btn" onClick={() => removeFiliale(f.id)}>
              🗑
            </button>
          </div>
        </div>
      ))}
      <div className="card-row" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Neue Filial-Nr."
          value={neueFilialeNr}
          onChange={(e) => setNeueFilialeNr(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button className="btn small secondary" style={{ width: 'auto', margin: 0 }} onClick={addFiliale}>
          + Filiale
        </button>
      </div>

      <h2>Flop-15-Artikel</h2>
      {artikel.map((a, i) => (
        <div className="list-item" key={a.id}>
          <div style={{ flex: 1, display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={a.nummer}
              onChange={(e) => editArtikel(a.id, 'nummer', e.target.value)}
              style={{ width: 90, padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
            />
            <input
              type="text"
              value={a.name}
              onChange={(e) => editArtikel(a.id, 'name', e.target.value)}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
            />
          </div>
          <div className="actions">
            <button className="icon-btn" onClick={() => updateArtikel(moveItem(artikel, i, -1))}>
              ↑
            </button>
            <button className="icon-btn" onClick={() => updateArtikel(moveItem(artikel, i, 1))}>
              ↓
            </button>
            <button className="icon-btn" onClick={() => removeArtikel(a.id)}>
              🗑
            </button>
          </div>
        </div>
      ))}
      <div className="card-row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <input
          type="text"
          placeholder="ArtikelNr"
          value={neuerArtikelNr}
          onChange={(e) => setNeuerArtikelNr(e.target.value)}
          style={{ width: 100, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <input
          type="text"
          placeholder="Artikelname"
          value={neuerArtikelName}
          onChange={(e) => setNeuerArtikelName(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button className="btn small secondary" style={{ width: 'auto', margin: 0 }} onClick={addArtikel}>
          + Artikel
        </button>
      </div>
      <button className="btn secondary" onClick={resetArtikel}>
        Auf Standard-Flop-15 zurücksetzen
      </button>
    </div>
  )
}
