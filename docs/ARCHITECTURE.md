# Architecture

## Component Structure

```
src/
  App.jsx               Router + PanelProvider + ModeProvider + SearchProvider root
  main.jsx              MSW bootstrap → createRoot
  index.css             Tailwind v4 + Pax theme import

  components/
    layout/
      AppShell.jsx      Layout route: Sidebar + TopBar + flex row (main + GlobalPanel)
      Sidebar.jsx       Fixed left nav with NavLink active states
      TopBar.jsx        Test/Live toggle, amber banner
      GlobalPanel.jsx   Page-level push panel (reads PanelContext, fetches by ID)
      DetailPanel.jsx   PanelSection + PanelRow compound components (used by GlobalPanel)
    ui/
      Badge.jsx         Semantic status/type pill badges
      CopyButton.jsx    Clipboard with tick confirmation
      EmptyState.jsx    No-results state with optional clear action
      ErrorState.jsx    Fetch failure state with retry
      GlobalSearch.jsx  cmd+k overlay + floating pill (z-[60], above GlobalPanel)
      PageHeader.jsx    Universal page header: title, subtitle, Filter button + panel,
                        active filter pills, primary/secondary action buttons
      Sparkline.jsx     Recharts AreaChart wrapper
      StatCard.jsx      Overview balance cards with skeleton
      Timeline.jsx      Transaction detail vertical stepper

  pages/
    Overview.jsx        Balance + sparkline + actions + recent txns + accounts; "Send funds" → SendFundsModal
    Transactions.jsx    Full table, filters, pagination; calls openPanel('transaction', id)
    Accounts.jsx        Table, summary banner; calls openPanel('account', id)
    Recipients.jsx      Table (name/customer/destination/rail/status/created); calls openPanel('recipient', id)
    Customers.jsx       Table; calls openPanel('customer', id)
    ApiKey.jsx          Masked key display
    Webhooks.jsx        Endpoint list + inline add form  ← now at /developer/webhooks
    AuditLog.jsx        Compliance record of dashboard actions
    Team.jsx            Team members + permissions reference
    RequestLog.jsx      API request log — developer debugging surface

  components/ui/
    SendFundsModal.jsx  4-step transfer initiation modal (see below)

  context/
    ModeContext.jsx     Global Test/Live state; useMode() hook
    SearchContext.jsx   Global search open/close + recent items (session-only); useSearch() hook
    PanelContext.jsx    Global panel state; usePanelContext() → { panelState, openPanel, closePanel }

  hooks/
    useTransactions.js  useTransactions (list) + useTransaction(id) (single record)
    useAccounts.js      useAccounts (list) + useAccount(id) (single record)
    useCustomers.js     useCustomers (list) + useCustomer(id) (single record)
    useRecipients.js    useRecipients({ customerId, type, status, page, limit }) + useRecipient(id)
    useTransfers.js     useTransfers({ customerId, status, page, limit }) + useTransfer(id)
    useRequestLog.js    useRequestLog({ page, limit, method, statusGroup, endpoint, dateRange })
                        + useRequestLogEntry(id)

  lib/
    format.js           All formatting (currency, dates, relative time)
    alerts.js           buildAlertItems(navigate) + groupAlertItems(items) — shared between
                        Overview card and NeedsAttentionPanel in GlobalPanel

  mocks/
    fixtures/           Raw data arrays
    handlers.js         MSW route handlers
    browser.js          MSW worker setup
```

## Routing

Uses `createBrowserRouter` (HTML5 History API). AppShell is a layout route
(no path) that renders the shell and an `<Outlet />` for the active child.

```
BUSINESS
/                     → Overview
/transactions         → Transactions
/accounts             → Accounts
/recipients           → Recipients
/customers            → Customers

DEVELOPER
/developer/webhooks   → Webhooks
/developer/request-log → RequestLog

ADMIN
/settings/api-key     → ApiKey
/settings/audit-log   → AuditLog
/settings/team        → Team

REDIRECTS (backwards-compatibility)
/settings/webhooks    → Navigate replace → /developer/webhooks
```

## Data Flow

1. Component mounts → calls custom hook (e.g. `useTransactions`)
2. Hook reads `mode` from `useMode()` (ModeContext)
3. Hook builds URL: `/api/transactions?page=1&mode=live`
4. MSW Service Worker intercepts the fetch
5. Handler reads fixture data, applies filters, returns paginated JSON
6. Hook sets `{ data, loading, error }` state
7. Component renders based on state

## State Management

- **Global:** ModeContext (Test/Live mode), PanelContext (open panel + selected ID)
- **Page-level:** useState for filters, pagination only (selectedId moved to PanelContext)
- **Server state:** Custom hooks (no React Query — overkill for a prototype)

## PageHeader

`src/components/ui/PageHeader.jsx` — universal page header used on all pages except Overview and Accounts.

**Props:** `title`, `subtitle?`, `filters?`, `primaryAction?`, `secondaryAction?`

**FilterPanel sub-component** (inline in PageHeader.jsx):
- Absolutely positioned 260px dropdown, right-aligned below the Filter button
- Deferred application: selections are held in local `pendingValues` state and only committed on "Apply". This prevents intermediate table states when building multi-filter queries.
- Click-outside closes the panel. Skips `[data-radix-popper-content-wrapper]` to handle Radix Select portals correctly — without this, selecting an option inside the panel would close it before the value committed.
- Active count badge computed at render time: `filters.filter(f => f.value !== f.defaultValue).length`

**Active filter pills** (below subtitle, above table):
- Rendered from applied values, not pending state
- Each pill's × removes that filter immediately (no Apply needed — single removals are unambiguous)
- Styled with `bg-action-primary-light` + `text-action-primary-main`

**Pages exempt:** Overview (unique layout), Accounts (section-level toggles, not page-level)
**Pages with no Filter button:** Webhooks, Team, ApiKey (pass no `filters` prop)

## SendFundsModal

`src/components/ui/SendFundsModal.jsx` — 4-step transfer initiation flow.

**Why modal, not push panel:** The panel is a viewer (non-blocking, informational).
Send Funds is a state-changing sequential flow — the modal blocks intentionally and
returns the user to where they were after completion.

**Step state pattern:** `useState` for `step` (integer 1–4) + flat `formData` object.
No reducer: transitions are linear (step ± 1), formData is shallow. State is
co-located and resets automatically when the modal unmounts on close.

**Steps:**
1. Select source account (merchant accounts with balance > 0)
2. Select recipient (filter by customer, then pick from active recipients list)
3. Enter amount (currency label, conversion note if cross-type, optional merchant ref)
4. Confirm summary → POST /api/transfers → success state with transfer ID

**preselectedAccountId prop:**
When provided (from AccountDetail panel), formData initializes to that account
and the modal starts at step 2. Parent uses `key={preselectedAccountId ?? 'generic'}`
to force a fresh component instance.

**Triggered from:**
- Overview "Send funds" quick action button (no preselection — starts at step 1)
- AccountDetail panel "Send funds" button (preselectedAccountId — starts at step 2)

**Known limitations:**
- "Add recipient" / "+ New recipient" links show "Coming soon" toast (bank resolution
  flow not yet implemented)
- Rail is read-only — pre-populated from recipient; override UI not built (one rail
  per recipient in current data model)

## Push Panel Layout

The panel is rendered at the AppShell level, not inside individual pages.
This makes it a flex sibling of `<main>`, so when it opens the content area
physically reflows narrower — no overlay, no backdrop.

```
AppShell
  <Sidebar />                       ← fixed 224px left column
  <div ml-56 flex flex-col>
    <TopBar />
    <div flex flex-1 overflow-hidden>   ← the push row
      <main flex-1 overflow-y-auto>     ← content area: reflows when panel opens
        <Outlet />
      </main>
      <GlobalPanel />                   ← width: 0 → 420px, animates in
    </div>
  </div>
```

Width animation (not translateX) is intentional: translateX would still
reserve 420px of space in the flex row, so the content area wouldn't reflow.

### PanelContext API

```js
const { panelState, openPanel, closePanel } = usePanelContext()

// panelState: { type: null | 'transaction' | 'account' | 'customer', id: null | string }
// openPanel: calling with the same type+id toggles closed (deselects)
// closePanel: always closes
```

Pages call `openPanel(type, id)` on row click. AppShell closes the panel on
route change via `useEffect` on `location.pathname`.

### GlobalPanel fetching

GlobalPanel uses individual-record hooks (`useTransaction(id)`, `useAccount(id)`,
`useCustomer(id)`) to fetch detail data. MSW intercepts with 150–300ms latency.
A `PanelSkeleton` covers the loading state.

### Column hiding when panel is open

When the panel opens and the table narrows by 420px, specific low-priority
columns are hidden rather than allowing horizontal scroll:

- **Transactions:** Source column hidden (recoverable in panel Conversion/Transfer section)
- **Accounts:** No columns hidden (all columns are short and survive the narrowing)
- **Customers:** Created column hidden (recoverable in panel Profile section)

Horizontal scroll was rejected because it creates two competing scroll axes
(table scrolls right, panel scrolls down, page scrolls up) — spatially confusing
and breaks the mental model of a single coherent view.
