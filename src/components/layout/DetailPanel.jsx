// DetailPanel.jsx — compound components for panel content layout.
//
// The panel shell (open/close, width animation, scroll) is now in GlobalPanel.jsx.
// PanelSection and PanelRow remain here as the presentational building blocks
// used inside each detail view (TransactionDetail, AccountDetail, CustomerDetail).

// PanelSection — a labeled group of fields
export function PanelSection({ title, children }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-3">
        {title}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

// PanelRow — label + value pair with fixed label width for alignment
export function PanelRow({ label, children }) {
  return (
    <div className="flex items-start gap-4">
      <dt className="text-sm text-content-tertiary w-32 shrink-0">{label}</dt>
      <dd className="text-sm text-content-primary font-medium flex-1 min-w-0">{children}</dd>
    </div>
  )
}
