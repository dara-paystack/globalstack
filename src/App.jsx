import { createBrowserRouter, RouterProvider, Navigate, useRouteError, useNavigate } from 'react-router-dom'
import { ModeProvider } from './context/ModeContext'
import { PanelProvider } from './context/PanelContext'
import { SearchProvider } from './context/SearchContext'
import { SidebarProvider } from './context/SidebarContext'
import { AppShell } from './components/layout/AppShell'

// Rendered by React Router when any page throws during render or data loading.
// useRouteError() gives us the thrown value — could be an Error, a Response, or a string.
// Keeping this inside App.jsx (not a separate file) since it's app-wiring, not a reusable component.
function PageError() {
  const error = useRouteError()
  const navigate = useNavigate()
  const message = error instanceof Error ? error.message : String(error?.statusText ?? error ?? 'Unknown error')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-8">
      <div className="w-10 h-10 rounded-full bg-feedback-danger-subtle flex items-center justify-center">
        <span className="text-feedback-danger-main text-lg font-semibold">!</span>
      </div>
      <div>
        <p className="text-sm font-medium text-content-primary mb-1">Something went wrong</p>
        <p className="text-xs text-content-tertiary font-mono max-w-md break-all">{message}</p>
      </div>
      <button
        onClick={() => navigate('/')}
        className="text-xs text-content-secondary underline underline-offset-2 cursor-pointer"
      >
        Go to Overview
      </button>
    </div>
  )
}
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Recipients from './pages/Recipients'
import Customers from './pages/Customers'
import ApiKey from './pages/ApiKey'
import Webhooks from './pages/Webhooks'
import AuditLog from './pages/AuditLog'
import Team from './pages/Team'
import RequestLog from './pages/RequestLog'

// createBrowserRouter defines the full route tree.
// AppShell is a layout route (no path) — it renders the sidebar/topbar and
// an <Outlet /> that shows whichever child route is active.
const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <PageError />,
    children: [
      { path: '/', element: <Overview /> },
      { path: '/transactions', element: <Transactions /> },
      { path: '/accounts', element: <Accounts /> },
      { path: '/recipients', element: <Recipients /> },
      { path: '/customers', element: <Customers /> },
      { path: '/settings/api-key', element: <ApiKey /> },
      { path: '/settings/audit-log', element: <AuditLog /> },
      { path: '/settings/team', element: <Team /> },
      // DEVELOPER section routes
      { path: '/developer/webhooks', element: <Webhooks /> },
      { path: '/developer/request-log', element: <RequestLog /> },
      // Redirect old Webhooks route so existing bookmarks and deep-links still work.
      // `replace` prevents the old path from cluttering browser history.
      { path: '/settings/webhooks', element: <Navigate to="/developer/webhooks" replace /> },
    ],
  },
])

export default function App() {
  return (
    // PanelProvider wraps ModeProvider so both are accessible in all routes.
    // PanelContext must be above the Router so AppShell (inside the router)
    // and page components can both read from the same context instance.
    // SidebarProvider wraps everything so Sidebar, MobileTopBar, and AppShell
    // can all read sidebar open/closed state from the same context instance.
    <SidebarProvider>
      <PanelProvider>
        <ModeProvider>
          <SearchProvider>
            <RouterProvider router={router} />
          </SearchProvider>
        </ModeProvider>
      </PanelProvider>
    </SidebarProvider>
  )
}
