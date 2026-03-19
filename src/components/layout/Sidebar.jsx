import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Wallet, Users, KeyRound, Webhook, ClipboardList, Contact } from 'lucide-react'

const NAV_MAIN = [
  { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/recipients', label: 'Recipients', icon: Contact },
  { to: '/customers', label: 'Customers', icon: Users },
]

const NAV_ADMIN = [
  { to: '/settings/api-key', label: 'API Key', icon: KeyRound },
  { to: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
  { to: '/settings/audit-log', label: 'Audit Log', icon: ClipboardList },
]

function NavItem({ to, label, end, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-surface-tertiary text-content-primary'
            : 'text-content-tertiary hover:bg-surface-secondary hover:text-content-primary',
        ].join(' ')
      }
    >
      {Icon && <Icon size={15} strokeWidth={1.75} className="shrink-0" />}
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-[var(--midnight-100)] border-r border-border-primary-light flex flex-col z-10">
      {/* Wordmark */}
      <div className="px-5 pt-6 pb-8">
        <img
          src="/globalstack-logo.svg"
          alt="GlobalStack"
          className="h-5 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="mb-4">
          <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-content-tertiary">
            BUSINESS
          </div>
          <ul className="space-y-0.5">
            {NAV_MAIN.map((item) => (
              <li key={item.to}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-content-tertiary">
            Admin
          </div>
          <ul className="space-y-0.5">
            {NAV_ADMIN.map((item) => (
              <li key={item.to}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Merchant identity — bottom of sidebar */}
      <div className="px-5 py-4 border-t border-border-primary-light">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-action-primary-main flex items-center justify-center text-content-inverse text-xs font-semibold shrink-0">
            AC
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-content-primary truncate">
              Acme Corp
            </div>
            <div className="text-xs text-content-tertiary truncate">
              treasury@acme.com
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
