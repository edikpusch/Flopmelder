import { createContext, useContext, useState, useCallback } from 'react'

const NavContext = createContext(null)

export function NavProvider({ children }) {
  const [route, setRoute] = useState({ screen: 'home', params: {} })

  const navigate = useCallback((screen, params = {}) => {
    setRoute({ screen, params })
  }, [])

  return (
    <NavContext.Provider value={{ route, navigate }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav muss innerhalb von NavProvider verwendet werden')
  return ctx
}
