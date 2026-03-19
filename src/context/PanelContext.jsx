// PanelContext — global panel state for the push-layout detail panel.
//
// Why context instead of page-level state:
// The panel renders in AppShell, outside <Outlet />. Page components can't
// pass state "up through" the router's Outlet. Context lets any page call
// openPanel(type, id), and AppShell reads panelState to render the right content.
//
// API:
//   openPanel('transaction' | 'account' | 'customer', id)
//   closePanel()
//   panelState: { type: null | string, id: null | string }
//
// Toggling the same record closes the panel — pages don't need to track
// "is this row selected?" separately; they compare panelState.id.

import { createContext, useContext, useState } from 'react'

const PanelContext = createContext(null)

export function PanelProvider({ children }) {
  const [panelState, setPanelState] = useState({ type: null, id: null })

  function openPanel(type, id) {
    // Clicking the same record again closes the panel
    if (panelState.type === type && panelState.id === id) {
      setPanelState({ type: null, id: null })
    } else {
      setPanelState({ type, id })
    }
  }

  function closePanel() {
    setPanelState({ type: null, id: null })
  }

  return (
    <PanelContext.Provider value={{ panelState, openPanel, closePanel }}>
      {children}
    </PanelContext.Provider>
  )
}

export function usePanelContext() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('usePanelContext must be used within PanelProvider')
  return ctx
}
