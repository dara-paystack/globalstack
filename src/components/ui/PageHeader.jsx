// PageHeader — universal page header for all dashboard pages.
//
// STRUCTURE:
//   Row 1: [title]  [Filter ▾?]  [secondary action?]  [primary action?]
//   Row 2: [subtitle] (optional)
//   Row 3: [active filter pills] (only when filters are applied)
//
// FILTER PANEL:
//   A single "Filter" button opens a 260px dropdown panel listing all filters
//   for the page. Selections inside the panel are deferred — the table only
//   updates when the operator clicks "Apply". This prevents the table from
//   rerendering on every individual selection change when the operator is
//   building a multi-filter query (e.g. Status: Failed + Type: Conversion).
//   Live filtering would fire N requests for N selections; deferred fires one.
//
//   Live filtering is preferable only for text search (cmd+k style), where
//   each keystroke IS a meaningful refinement. For categorical selects that
//   operators typically combine, deferred is better UX.
//
// ACTIVE FILTER COUNT:
//   Derived at render time from filters where value !== defaultValue.
//   No extra state needed — it's a pure computation from props.
//
// ACTIVE FILTER PILLS:
//   Rendered from applied values (not pending panel state). Each pill's ×
//   calls onChange immediately with the defaultValue — single precise removals
//   are unambiguous and don't need the Apply step.
//
// CLICK-OUTSIDE:
//   The panel closes on mousedown outside its container. We skip Radix portals
//   (SelectContent portals to document.body) by checking for the
//   [data-radix-popper-content-wrapper] attribute — without this, clicking a
//   Select option inside the panel would close the panel before the value commits.

import { useState, useRef, useEffect } from 'react'
import { Filter, X } from 'lucide-react'
import {
  Button, Chip,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Tooltip, TooltipTrigger, TooltipContent,
} from '@paystack/pax'
import { useAccount } from '../../context/AccountContext'

// Wraps an action button in a Pax tooltip when it's disabled (read-only mode).
// A disabled <button> is inert and never fires hover, so the TooltipTrigger must
// wrap a <span> around it (the span receives the hover and drives the tooltip).
// When enabled we render the bare button so the flex layout is untouched.
function ActionButton({ action, variant, color, disabled, disabledTitle }) {
  const button = (
    <Button
      variant={variant}
      color={color}
      size="sm"
      onClick={action.onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 cursor-pointer"
    >
      {action.icon}
      {action.label}
    </Button>
  )
  if (!disabled) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{disabledTitle}</TooltipContent>
    </Tooltip>
  )
}

export function PageHeader({
  title,
  subtitle,
  filters = [],
  primaryAction,
  secondaryAction,
}) {
  // Read-only (pending) accounts can browse but not create — every page's
  // primary/secondary action is gated here in one place rather than per page.
  const { isReadOnly } = useAccount()
  const actionsDisabled = isReadOnly
  const disabledTitle = isReadOnly ? 'Available once your account is verified' : undefined
  const [panelOpen, setPanelOpen] = useState(false)
  // pendingValues holds the in-panel selections before Apply is clicked.
  // Keyed by filter id so the panel can be generic across all pages.
  const [pendingValues, setPendingValues] = useState({})
  const containerRef = useRef(null)

  const hasFilters = filters.length > 0

  // Active count — how many filters are non-default. Used for the count badge
  // on the Filter button and to decide whether to render the pills row.
  const activePills = filters.filter((f) => f.value !== (f.defaultValue ?? 'all'))
  const activeCount = activePills.length

  function openPanel() {
    // Sync pending state from current applied values so the panel reflects
    // whatever filters the operator already has active.
    const init = {}
    for (const f of filters) init[f.id] = f.value
    setPendingValues(init)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
  }

  // Apply commits pending selections and closes the panel.
  // React 18 automatic batching ensures all onChange calls trigger one re-render.
  function handleApply() {
    for (const f of filters) {
      f.onChange(pendingValues[f.id] ?? f.defaultValue ?? 'all')
    }
    closePanel()
  }

  // Clear all resets pending values to defaults — the operator still needs to
  // click Apply to commit. This avoids a surprise instant table clear.
  function handleClearAll() {
    const cleared = {}
    for (const f of filters) cleared[f.id] = f.defaultValue ?? 'all'
    setPendingValues(cleared)
  }

  // Click-outside closes the panel. We skip Radix portal elements so that
  // selecting an option inside a Select inside the panel doesn't close it.
  useEffect(() => {
    if (!panelOpen) return
    function handleMouseDown(e) {
      if (!containerRef.current) return
      if (containerRef.current.contains(e.target)) return
      if (e.target.closest('[data-radix-popper-content-wrapper]')) return
      closePanel()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [panelOpen])

  return (
    <div>
      {/* Row 1 — title + controls */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-content-primary leading-snug">{title}</h1>

        <div className="flex items-center gap-2 shrink-0">
          {/* Filter button — only rendered when the page has filterable fields */}
          {hasFilters && (
            <div className="relative" ref={containerRef}>
              <button
                onClick={panelOpen ? closePanel : openPanel}
                aria-haspopup="true"
                aria-expanded={panelOpen}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer border-border-primary-main bg-surface-primary text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
              >
                <Filter width={14} height={14} strokeWidth={2} />
                Filter
                {activeCount > 0 && (
                  // Count badge — appears inside the button when filters are active.
                  // min-w keeps it circular for single digits; px-1 handles double digits.
                  <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-action-primary-main text-content-inverse text-xs font-semibold px-1 leading-none">
                    {activeCount}
                  </span>
                )}
              </button>

              {/* ── Filter dropdown panel ──────────────────────────────── */}
              {panelOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-[260px] bg-surface-primary border border-border-primary-light rounded-xl z-50"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
                >
                  {/* Panel header */}
                  <div className="px-4 py-3 border-b border-border-primary-light">
                    <span className="text-sm font-medium text-content-primary">Filters</span>
                  </div>

                  {/* Filter groups — one per filter in the filters array */}
                  <div className="px-4 py-3 space-y-3">
                    {filters.map((f) => (
                      <div key={f.id}>
                        <label className="block text-xs font-medium text-content-tertiary mb-1.5">
                          {f.label}
                        </label>
                        <Select
                          value={pendingValues[f.id] ?? f.defaultValue ?? 'all'}
                          onValueChange={(val) =>
                            setPendingValues((prev) => ({ ...prev, [f.id]: val }))
                          }
                        >
                          <SelectTrigger className="w-full text-sm cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {f.options.map((opt) =>
                              opt.group === 'separator' ? (
                                // Non-selectable group label — styled as muted uppercase text.
                                // Radix doesn't support disabled SelectGroup headers natively,
                                // so we render a custom div, same pattern as Customers.jsx.
                                <div
                                  key={opt.value}
                                  className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-content-tertiary select-none"
                                >
                                  {typeof opt.label === 'string'
                                    ? opt.label.replace(/─/g, '').trim()
                                    : opt.label}
                                </div>
                              ) : (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  {/* Footer — clear (left) + apply (right) */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary-light">
                    <button
                      onClick={handleClearAll}
                      className="text-sm text-action-primary-main hover:text-action-primary-dark font-medium cursor-pointer"
                    >
                      Clear all
                    </button>
                    <Button
                      variant="default"
                      color="primary"
                      size="sm"
                      onClick={handleApply}
                      className="cursor-pointer"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Secondary action — outline button, appears to the left of primary */}
          {secondaryAction && (
            <ActionButton
              action={secondaryAction}
              variant="outline"
              color="secondary"
              disabled={actionsDisabled}
              disabledTitle={disabledTitle}
            />
          )}

          {/* Primary action — solid primary button, always far right */}
          {primaryAction && (
            <ActionButton
              action={primaryAction}
              variant="default"
              color="primary"
              disabled={actionsDisabled}
              disabledTitle={disabledTitle}
            />
          )}
        </div>
      </div>

      {/* Row 2 — subtitle (optional) */}
      {subtitle && (
        <p className="text-sm text-content-tertiary mt-1">{subtitle}</p>
      )}

      {/* Active filter pills — rendered from applied values, not pending panel state.
          Each pill's × removes just that filter immediately (no Apply needed).
          Single precise removals are unambiguous; the deferred step is only needed
          when building a multi-filter query where intermediate states are noisy. */}
      {activePills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          {activePills.map((f) => {
            // Find the human-readable label for the active value.
            // Skip separator options (they have group: 'separator').
            const selectedOpt = f.options?.find(
              (o) => o.value === f.value && o.group !== 'separator'
            )
            const displayLabel = selectedOpt?.label ?? f.value

            return (
              <Chip key={f.id} variant="input" asChild>
                <div className="flex items-center gap-1 cursor-default">
                  <span>{f.label}: {displayLabel}</span>
                  <button
                    onClick={() => f.onChange(f.defaultValue ?? 'all')}
                    className="cursor-pointer leading-none text-content-tertiary hover:text-content-primary"
                    aria-label={`Remove ${f.label} filter`}
                  >
                    <X width={11} height={11} strokeWidth={2.5} />
                  </button>
                </div>
              </Chip>
            )
          })}
        </div>
      )}
    </div>
  )
}
