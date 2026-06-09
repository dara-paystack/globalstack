import { useAccount } from '../../context/AccountContext'

// DemoStatusSwitcher — a prototype-only control for flipping the account between
// its three states (approved / pending / rejected) live during a demo, without
// re-running the whole signup flow or editing localStorage by hand.
//
// WHY FLOATING (not in the Sidebar like the Test/Live pill):
// the rejected state removes the entire dashboard shell — AppShell early-returns
// the full-page RejectedState before the Sidebar ever renders. A sidebar-only
// switcher could flip you INTO rejected but then vanish, with no way back. A
// fixed-position overlay rendered by AppShell in both branches stays reachable
// in every state.
//
// It's deliberately labelled "Demo" — in a real product the account status comes
// from Sumsub's verdict, not a manual toggle, so this control wouldn't exist.
//
// Flipping status needs no navigation: AppShell re-renders for the current
// /dashboard route, and the data hooks re-fetch (they depend on isReadOnly), so
// the dashboard repopulates or empties automatically.

// Each status carries its own semantic color set. These are full, literal class
// strings (not template-built) so Tailwind's scanner keeps them — dynamically
// composed class names like `bg-feedback-${x}-light` get purged from the build.
//   approved → success (green) · pending → information (blue) · rejected → danger (red)
const STATUSES = [
  { value: 'approved', label: 'Approved', dot: 'bg-feedback-success-main', activeBg: 'bg-feedback-success-light', activeText: 'text-feedback-success-dark' },
  { value: 'pending', label: 'Pending', dot: 'bg-feedback-information-main', activeBg: 'bg-feedback-information-light', activeText: 'text-feedback-information-main' },
  { value: 'rejected', label: 'Rejected', dot: 'bg-feedback-danger-main', activeBg: 'bg-feedback-danger-light', activeText: 'text-feedback-danger-main' },
]

export function DemoStatusSwitcher() {
  const { status, setStatus } = useAccount()

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 rounded-2xl border border-border-primary-light bg-surface-primary/95 backdrop-blur-sm p-2.5 shadow-lg">
      {/* Header — a muted "Demo" tag makes clear this isn't a real product control. */}
      <div className="flex items-center gap-1.5 px-0.5">
        <span className="inline-flex items-center rounded-md bg-surface-tertiary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-content-tertiary">
          Demo
        </span>
        <span className="text-[11px] font-medium text-content-tertiary">Account status</span>
      </div>

      {/* Segmented control — a muted track holds three segments. The active one
          lifts with its semantic tint + colored dot; inactive ones stay quiet. */}
      <div className="flex items-center gap-1 rounded-xl bg-surface-secondary p-1">
        {STATUSES.map((s) => {
          const active = status === s.value
          return (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              aria-pressed={active}
              className={[
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer',
                active
                  ? `${s.activeBg} ${s.activeText} shadow-sm`
                  : 'text-content-tertiary hover:text-content-secondary',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? s.dot : 'bg-content-quaternary'}`}
                aria-hidden="true"
              />
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
