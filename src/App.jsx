import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ModeProvider } from './context/ModeContext'
import { PanelProvider } from './context/PanelContext'
import { AppShell } from './components/layout/AppShell'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Recipients from './pages/Recipients'
import Customers from './pages/Customers'
import ApiKey from './pages/ApiKey'
import Webhooks from './pages/Webhooks'
import AuditLog from './pages/AuditLog'

// createBrowserRouter defines the full route tree.
// AppShell is a layout route (no path) — it renders the sidebar/topbar and
// an <Outlet /> that shows whichever child route is active.
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Overview /> },
      { path: '/transactions', element: <Transactions /> },
      { path: '/accounts', element: <Accounts /> },
      { path: '/recipients', element: <Recipients /> },
      { path: '/customers', element: <Customers /> },
      { path: '/settings/api-key', element: <ApiKey /> },
      { path: '/settings/webhooks', element: <Webhooks /> },
      { path: '/settings/audit-log', element: <AuditLog /> },
    ],
  },
])

export default function App() {
  return (
    // PanelProvider wraps ModeProvider so both are accessible in all routes.
    // PanelContext must be above the Router so AppShell (inside the router)
    // and page components can both read from the same context instance.
    <PanelProvider>
      <ModeProvider>
        <RouterProvider router={router} />
      </ModeProvider>
    </PanelProvider>
  )
}
