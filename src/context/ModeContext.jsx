import { createContext, useContext, useState } from 'react'

// The context holds the current mode and the setter.
// Default value only applies to components rendered outside the Provider —
// in practice that shouldn't happen, but it prevents crashes if it does.
const ModeContext = createContext({
  mode: 'live',
  setMode: () => {},
  isTestMode: false,
})

export function ModeProvider({ children }) {
  const [mode, setMode] = useState('live')

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        isTestMode: mode === 'test',
      }}
    >
      {children}
    </ModeContext.Provider>
  )
}

// Custom hook so consumers import one thing instead of two
export function useMode() {
  return useContext(ModeContext)
}
