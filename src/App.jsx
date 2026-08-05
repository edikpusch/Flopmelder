import { useEffect, useState } from 'react'
import { seedIfEmpty } from './store.js'
import { NavProvider, useNav } from './NavContext.jsx'
import HomeScreen from './pages/HomeScreen.jsx'
import EinstellungenScreen from './pages/EinstellungenScreen.jsx'
import MeldungScreen from './pages/MeldungScreen.jsx'
import FilialeErfassungScreen from './pages/FilialeErfassungScreen.jsx'
import ArchivScreen from './pages/ArchivScreen.jsx'

function Screens() {
  const { route } = useNav()

  switch (route.screen) {
    case 'einstellungen':
      return <EinstellungenScreen />
    case 'meldung':
      return <MeldungScreen meldungId={route.params.meldungId} />
    case 'filiale':
      // key erzwingt einen frischen Mount je Filiale. Ohne ihn behält React beim
      // Wechsel über "Nächste Filiale" dieselbe Instanz - der Artikel-Index und der
      // Tag/Monat-Modus der vorherigen Filiale blieben dann stehen.
      return (
        <FilialeErfassungScreen
          key={route.params.filialeId}
          meldungId={route.params.meldungId}
          filialeId={route.params.filialeId}
          startIndex={route.params.startIndex}
        />
      )
    case 'archiv':
      return <ArchivScreen />
    case 'home':
    default:
      return <HomeScreen />
  }
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedIfEmpty()
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <NavProvider>
      <div className="app">
        <Screens />
      </div>
    </NavProvider>
  )
}
