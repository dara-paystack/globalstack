You are building the GlobalStack Merchant Dashboard — a frontend prototype for a
stablecoin treasury infrastructure product similar to Column.com.

═══════════════════════════════════════════════════════════
TEACHING MODE — ALWAYS ON
═══════════════════════════════════════════════════════════

Throughout this entire build, teach as you go. Before writing any significant
block of code, briefly explain:
- What you're about to build and why it's structured that way
- What design or architectural decision you're making and the tradeoff involved
- Why you chose this approach over the obvious alternative

After writing code, call out anything non-obvious:
- Patterns that might be unfamiliar (Context, compound components, render props)
- Where Pax is doing the heavy lifting and why that matters
- What you'd do differently in a production codebase vs. this prototype

Be specific. "I'm using useContext here because Test/Live mode needs to be
accessible from every page — passing it as a prop through 4 component layers
would be messy and brittle" is useful. "This is a React pattern" is not.

═══════════════════════════════════════════════════════════
CURRENT STATUS — Updated Jun 10, 2026
═══════════════════════════════════════════════════════════

All pages are built and functional. Latest work (feat/signup-flow branch):
self-service onboarding — Signup → Check email → Sumsub handoff, plus three
account states (approved / pending / rejected), plus a passwordless magic-link
login for returning users. See SELF-SERVICE ONBOARDING section below. Not yet
merged to main.

PAGES BUILT (all dashboard pages are under /dashboard — paths below omit the prefix):
  BUSINESS section:
    Overview      /                    Balance card + sparkline + Needs Attention + quick actions
    Transactions  /transactions        Filter bar + table + push panel + pagination
    Accounts      /accounts            Banner + table + push panel with recent activity
    Recipients    /recipients          Table + push panel; "Add recipient" is Coming Soon
    Customers     /customers           Table + push panel with KYC tab

  DEVELOPER section:
    Webhooks      /developer/webhooks  Endpoint list + delivery log in panel
    Request Log   /developer/request-log  Stats strip + filter bar + table + push panel

  ADMIN section:
    API Key       /settings/api-key    Masked key + usage chart + permissions
    Audit Log     /settings/audit-log  Compliance table (read-only, absolute timestamps)
    Team          /settings/team       Member table + collapsible permissions matrix

  MARKETING: LandingPage at / (src/landing/) — see STACK + ARCHITECTURE notes below.

  Redirect: /dashboard/settings/webhooks → /dashboard/developer/webhooks (Navigate replace)

  LANDING PAGE (marketing) at /  — src/landing/, isolated from dashboard:
    Standalone React + framer-motion + three.js (GlobeCanvas, lazy-loaded) marketing
    site. Uses plain <a>/inline styles + standard Tailwind utilities (no Pax, no custom
    config). "Sign in" CTAs (Navbar + Hero) link to /dashboard. Waitlist removed.

GLOBAL FEATURES:
  - cmd+k global search (client-side, grouped results, session-only recent history)
  - Needs Attention card on Overview (4 categories, derived from fixtures)
  - Send Funds modal (4-step: source → recipient → amount → confirm)
  - Push panel system (GlobalPanel.jsx at AppShell level, 420px, width animation)
  - Test/Live mode toggle (pill in Sidebar wordmark row)
  - Fully responsive: mobile (360px+), tablet (768px+), desktop (1280px+)
  - Self-service onboarding + account-status gating (see dedicated section below)

═══════════════════════════════════════════════════════════
SELF-SERVICE ONBOARDING (feat/signup-flow)
═══════════════════════════════════════════════════════════

Self-service signup layered onto the existing dashboard. Standalone screens
(no AppShell chrome), then the dashboard gates on account status.

FLOW (signup):
  /signup            Signup.jsx — collects company name + work email only (no
                     password; login is a separate magic-link feature). POSTs
                     /api/signup, calls register(), routes to check-email.
  /signup/check-email  CheckEmail.jsx — "check your email" + two equivalent
                     paths forward: "Continue verification" (in-app) and
                     "Preview welcome email" (WelcomeEmailPreview.jsx modal).
  /onboarding/verify VerifyIdentity.jsx — Sumsub handoff. Embeds the sandbox
                     WebSDK in an iframe + unconditional "open in new tab"
                     fallback (cross-origin frames can refuse to embed and the
                     parent can't detect it). "I've finished" → setStatus('pending').

FLOW (login — returning users, passwordless magic link):
  /login             Login.jsx — collects work email only. POSTs /api/login,
                     routes to check-email. ROUTING-ONLY: does NOT touch
                     AccountContext, so the persisted status drives what the
                     dashboard shows. Shares Signup's frame + globe backdrop.
  /login/check-email LoginCheckEmail.jsx — mirrors signup CheckEmail. No real
                     mail/auth, so "Continue to dashboard" simulates clicking
                     the magic link → navigate('/dashboard'). AppShell then
                     renders whatever status is persisted (approved/pending/
                     rejected). "Sign in" CTAs (Signup footer, landing Navbar +
                     Hero) all point here.

ACCOUNT STATE — context/AccountContext.jsx, useAccount():
  status: 'approved' | 'pending' | 'rejected'  (localStorage, key globalstack.account)
  DEFAULT is 'approved' — anyone arriving via the existing /dashboard "Sign in"
  CTA sees the dashboard exactly as before. Only going through /signup +
  finishing verification moves you to 'pending'.
  API: register({company,email}) (captures identity, does NOT flip status),
       setStatus(status), reset() (→ defaults, used by log out).
  Derived: isReadOnly (status==='pending'), isRejected (status==='rejected').
  WHY localStorage (unlike in-memory ModeContext): survives the round-trip out
  to Sumsub and back, and a stakeholder demo shouldn't reset on refresh.
  Provider is OUTERMOST in App.jsx so status is readable from landing CTAs,
  standalone signup routes, AppShell gating, Sidebar, and every data hook.

THREE DASHBOARD STATES (gated in AppShell.jsx):
  approved — full dashboard (existing experience).
  pending  — read-only: information banner at top of <main> ("under review"),
             and every data hook short-circuits to empty when isReadOnly (no
             API round-trip) so pages render their existing empty states.
             All six list hooks honor isReadOnly (useTransactions, useAccounts,
             useCustomers, useRecipients, useRequestLog, useTransfers).
  rejected — AppShell early-returns the full-page RejectedState.jsx (no
             sidebar/nav at all). One action: "Contact support" (mailto) +
             "Log out".

DEMO-ONLY (would not ship — flagged in code):
  DemoStatusSwitcher.jsx — fixed bottom-right overlay to flip approved/pending/
    rejected live without re-running signup. Mounted by AppShell in BOTH branches
    (normal + rejected early-return) so it stays reachable even in rejected,
    which removes the sidebar. In production status comes from Sumsub's verdict.
  "Preview welcome email" CTA on CheckEmail — inspect the designed email artifact.

LOG OUT (no real auth): reset() wipes the persisted account → defaults, then
  navigate('/'). Lives in Sidebar (approved/pending) and RejectedState (the
  only escape hatch when the shell is gone).

SHARED FRAME — components/layout/OnboardingShell.jsx:
  Cardless centered column (logo pinned top → optional icon → title → subtitle →
  children centered in the remaining space). Reference: Linear/ChatGPT/Cursor
  login. Header is center-aligned; children slot is left untouched so form labels
  stay left-aligned. Props: icon, title, subtitle, backdrop (Signup's globe),
  maxWidth (max-w-sm default; verify uses max-w-2xl for the iframe), align
  ('center' default / 'top' for the tall Sumsub iframe). Spacing is on the Pax
  scale (title→content gap mt-10/40px). Verified responsive at mobile (375) +
  tablet (768) — all onboarding surfaces (signup + login) share this frame so
  the layout rhythm is identical across breakpoints.

  GLOBE BACKDROP (Signup + Login): a STATIC PNG (public/signup-globe.png, 760×760),
  NOT the landing page's live GlobeCanvas — deliberately avoids pulling three.js
  + the topojson CDN fetch into the onboarding bundle. Desktop-only: gated on
  !useIsMobile(1024) so it never renders below 1024px. Anchored bottom-center,
  pushed mostly out of frame (translate-y) so only the top cap rises into view.

MSW: POST /api/signup → validates {company,email}, returns fake applicantId +
  sumsubLink. POST /api/login → validates {email}, returns fake magicLinkToken
  (no "account exists" check — that's an enumeration leak). No status endpoint —
  status is client-side in AccountContext.

═══════════════════════════════════════════════════════════
DATA MODELS — KEY FACTS
═══════════════════════════════════════════════════════════

TRANSACTIONS
  Types:    DEPOSIT | WITHDRAWAL | CONVERSION (no on-ramp/off-ramp)
  Statuses: pending | completed | reversed | failed | canceled
  Key fields: id (tx_xxxabc format), corridor ("NGN → USDC"), sourceAccountId (outflows),
              destinationAccount (inflows), merchant_reference, onChainTxHash

ACCOUNTS
  owner field: 'merchant' | 'customer' — NEVER sum these together in the UI
  Merchant accounts: acc_01 (USDC on Base), acc_02 (USD fiat)
  Fiat account fields: bankName, accountName, accountNumber, routingNumber, status (open|deactivated|closed)
  On-chain fields: address, chain (base|solana|ethereum), asOf (balance freshness timestamp)
  - acc_c01 = John Adeyemi primary, acc_c08 = Wanjiku Holdings primary

CUSTOMERS
  IDs use cus_ prefix (not cust_)
  KYC states (9): not_started, incomplete, awaiting_questionnaire, awaiting_ubo,
    under_review, active, rejected, paused, offboarded
  'active' KYC displays as "Approved" (via KYC_LABELS in Badge.jsx)
  Each customer has: tosStatus (bool), tosLink, kycLink, kycLinkExpiresAt, country (nullable)

RECIPIENTS
  Fiat fields: accountOwnerName, accountNumber, accountNumberMasked, routingNumber,
               bankName, accountType, rail (ach|wire|ach_same_day)
  Crypto fields: walletAddress, chain, rail (matches chain)

BADGE.JSX — context prop
  KYC label mapping is opt-in via context="kyc". Without it, 'active' → "Active".
  KYC call sites: <Badge variant="status" value={customer.kycStatus} context="kyc" />
  Non-KYC (recipients, API key): <Badge variant="status" value={status} /> — no override needed

REQUEST LOG (src/mocks/fixtures/requestLog.js)
  61 entries, 2026-03-13 to 2026-03-19. REQUEST_LOG_ANCHOR = '2026-03-19'.
  Summary stats computed at module level from fixture (not from API response).
  Not mode-separated — API calls are always real regardless of dashboard mode.
  Linked transactions: 4 conversion responses reference real tx IDs.

NEEDS ATTENTION (lib/alerts.js — buildAlertItems())
  4 categories in priority order:
    1. failed transactions (red)
    2. webhook failures within 24h of fixture anchor (amber)
    3. api_error — from request log, statusCode >= 400 on REQUEST_LOG_ANCHOR (amber)
    4. KYC blocked customers: rejected, paused, offboarded, awaiting_ubo, awaiting_questionnaire
    5. stalled transactions — pending + createdAt > 1hr ago (neutral)
  Max 8 items shown; overflow row "and N more →" links to relevant page.
  All derived from fixture imports — no API call.

AUDIT LOG LIVE MUTATION
  When API key is copied, ApiKey.jsx calls auditLog.unshift() directly on the imported
  fixture array. MSW serves this same array, so the entry appears on next fetch.

═══════════════════════════════════════════════════════════
ACCOUNT OWNERSHIP MODEL
═══════════════════════════════════════════════════════════

Two financial layers — NEVER combine:
  MERCHANT (owner: 'merchant') — Acme Corp's own treasury ("house money")
  CUSTOMER (owner: 'customer') — funds held in custody for end-users

Where each appears:
  Overview:         "Your balance" (merchant) + "Customer funds" (customer) breakdown
  Accounts page:    Two sections — "Your accounts" then "Customer accounts"
  Transactions:     All transactions across both layers (operators monitor everything)
  MSW filter:       ?owner=merchant or ?owner=customer; omit for all accounts

═══════════════════════════════════════════════════════════
STACK
═══════════════════════════════════════════════════════════

- React 18 + Vite 5 (JSX, no TypeScript)
- React Router v7 (SPA, client-side routing, createBrowserRouter)
- @paystack/pax 2.0.0 — ONLY design system (Tailwind v4 via @tailwindcss/vite)
- Mock Service Worker (msw) v2 — API simulation
- Recharts v3 — charts/sparklines
- lucide-react — ALL icons. Never write inline SVG.
  Usage: import { X, Check, ChevronDown } from 'lucide-react'
  Sizing: width/height props, strokeWidth for weight.
- framer-motion + three — LANDING PAGE ONLY (src/landing/). Not used by the dashboard.

Do NOT add: styled-components, Emotion, second Tailwind install, raw Shadcn, Bootstrap.

═══════════════════════════════════════════════════════════
PAX SETUP GOTCHA
═══════════════════════════════════════════════════════════

@paystack/pax/dist/theme.css cannot be imported as:
  @import "@paystack/pax/dist/theme.css"  ← FAILS (missing "style" export condition)

Must be imported as:
  @import "../node_modules/@paystack/pax/dist/theme.css"  ← WORKS

This is in src/index.css. Do not change without verifying Pax package.json exports.

═══════════════════════════════════════════════════════════
PAX COMPONENTS USED
═══════════════════════════════════════════════════════════

- Skeleton — loading shimmer in every data-fetching view
- Select, SelectTrigger, SelectValue, SelectContent, SelectItem — filter bars
  (imported from '@paystack/pax')
- Chip — used for method badges in RequestLog, filter pills, mode toggle

Pax tokens (via Tailwind classes):
- text-content-primary/secondary/tertiary/quaternary (quaternary = disabled/absent only)
- text-feedback-success/warning/danger-main, text-feedback-warning-dark
- bg-surface-primary/secondary, border-border-default
- Colors: navy-*, cerulean-*, stack-green-*, gray-*, red-*, amber-*, purple-*

═══════════════════════════════════════════════════════════
ARCHITECTURE
═══════════════════════════════════════════════════════════

src/
  components/
    layout/
      Sidebar.jsx       ← Responsive: 280px mobile drawer, 56px tablet icon-rail, 224px desktop
      TopBar.jsx        ← Preserved but NOT mounted (unused)
      MobileTopBar.jsx  ← md:hidden top bar: hamburger + wordmark + search icon
      AppShell.jsx      ← Layout: Sidebar + <main> + <GlobalPanel> as flex siblings.
                          Test mode amber + pending "under review" info banners at top
                          of <main>. Gates on isRejected (early-returns RejectedState).
      OnboardingShell.jsx ← Cardless centered frame for all pre-dashboard screens
      DemoStatusSwitcher.jsx ← Prototype-only: flip approved/pending/rejected (fixed overlay)
      DetailPanel.jsx   ← Exports PanelSection + PanelRow compound components only
      GlobalPanel.jsx   ← Push panel: w-screen (mobile full-screen), 380px tablet, 420px desktop
    ui/
      Badge.jsx         ← Semantic color mapping for status/type values
      CopyButton.jsx    ← Copy-to-clipboard; optional onCopy callback for toasts
      EmptyState.jsx    ← Empty filter results + clear action
      ErrorState.jsx    ← Fetch error + retry button
      PageHeader.jsx    ← Universal page header: title, subtitle, Filter button + panel,
                           active pills, primary/secondary action buttons
      Sparkline.jsx     ← Recharts AreaChart wrapper
      StatCard.jsx      ← Balance/metric cards
      Timeline.jsx      ← Vertical stepper for transaction timeline
      GlobalSearch.jsx  ← cmd+k overlay + floating pill trigger
      SendFundsModal.jsx ← 4-step modal; ReadOnlyCard sub-component defined inline
  pages/
    Overview.jsx        Transactions.jsx    Accounts.jsx      Recipients.jsx
    Customers.jsx       RequestLog.jsx      Webhooks.jsx      ApiKey.jsx
    AuditLog.jsx        Team.jsx
    signup/   ← self-service onboarding + login (standalone, no AppShell)
      Signup.jsx  CheckEmail.jsx  VerifyIdentity.jsx  RejectedState.jsx
      WelcomeEmailPreview.jsx (email artifact modal, opened from CheckEmail)
      Login.jsx  LoginCheckEmail.jsx (returning-user magic-link sign-in)
  context/
    AccountContext.jsx  ← { status, isReadOnly, isRejected, register, setStatus, reset } —
                          useAccount(); localStorage-backed onboarding status
    ModeContext.jsx     ← { mode, setMode, isTestMode } — useMode()
    SearchContext.jsx   ← { isOpen, openSearch, closeSearch, recentItems, addRecentItem }
    SidebarContext.jsx  ← { isMobileOpen, isTabletExpanded, open/close/toggleTabletExpanded }
  hooks/
    useTransactions.js  useAccounts.js      useCustomers.js   useRecipients.js
    useWebhooks.js      useRequestLog.js    useTransfers.js
  mocks/
    fixtures/
      transactions.js     accounts.js         customers.js      webhooks.js
      webhookDeliveries.js recipients.js       transfers.js      auditLog.js
      apiKey.js           requestLog.js        team.js           testFixtures.js
    handlers.js           browser.js
  lib/
    format.js   ← formatUSDC, formatAmount, formatDatetime, formatDate, formatRelative
    alerts.js   ← buildAlertItems() — Needs Attention data derivation
  landing/      ← marketing site at / (self-contained; framer-motion + three.js)
    LandingPage.jsx  ← page root (was the landing repo's App.jsx)
    components/  ← Navbar, Hero, HowItWorks, FloatingCodeBlock, DeveloperSection,
                   StatsSection, Footer, GlobeCanvas (lazy)
    hooks/ constants/ data/  ← landing-only scroll/copy helpers
  App.jsx       ← createBrowserRouter; / = LandingPage, /signup* + /login* +
                  /onboarding/verify = standalone onboarding, /dashboard/* = AppShell tree
                  provider order: AccountProvider > SidebarProvider > PanelProvider
                  > ModeProvider > SearchProvider > RouterProvider
                  (AccountProvider outermost: status read by landing, signup, AppShell, hooks)
  main.jsx      ← MSW bootstrap → createRoot

ROUTES:
  /                                   LandingPage (marketing, standalone — no AppShell)
  /dashboard                          Overview
  /dashboard/transactions             Transactions
  /dashboard/accounts                 Accounts
  /dashboard/recipients               Recipients
  /dashboard/customers                Customers
  /dashboard/developer/webhooks       Webhooks
  /dashboard/developer/request-log    RequestLog
  /dashboard/settings/api-key         ApiKey
  /dashboard/settings/audit-log       AuditLog
  /dashboard/settings/team            Team
  /dashboard/settings/webhooks        → redirect to /dashboard/developer/webhooks
  /signup                             Signup (standalone onboarding — no AppShell)
  /signup/check-email                 CheckEmail
  /onboarding/verify                  VerifyIdentity (Sumsub handoff)
  /login                              Login (returning-user magic-link sign-in)
  /login/check-email                  LoginCheckEmail
  (Dashboard pages live under /dashboard; all internal nav/deep-links are prefixed.
   "Sign in" CTAs (landing Navbar + Hero, Signup footer) link to /login.)

MSW API SURFACE:
  GET  /api/transactions        ?page&limit&status&type&accountId&mode
  GET  /api/transactions/:id
  GET  /api/accounts            ?owner&mode
  GET  /api/accounts/:id
  GET  /api/customers           ?kycStatus&mode
  GET  /api/customers/:id
  GET  /api/recipients          ?customerId&type&status&page&limit
  GET  /api/recipients/:id
  GET  /api/webhooks            (includes deliverySummary per endpoint)
  GET  /api/webhooks/:id
  GET  /api/webhooks/:id/deliveries  ?page&limit
  POST /api/webhooks            → 201
  DELETE /api/webhooks/:id      → 204
  GET  /api/request-log         ?method&statusGroup&endpoint&dateRange&page&limit
  GET  /api/request-log/:id
  GET  /api/transfers
  GET  /api/transfers/:id
  POST /api/transfers           → 201, mutates fixture array
  GET  /api/audit-log           ?page&limit&action&actor&dateRange
  GET  /api/team
  GET  /api/api-key
  POST /api/signup              → validates {company,email}, returns applicantId + sumsubLink
  POST /api/login               → validates {email}, returns magicLinkToken (200)

Pagination shape: { data: [...], meta: { total, page, limit, totalPages } }
Mode-separated: transactions, accounts, customers only.
Not mode-separated: webhooks, recipients, transfers, audit-log, team, request-log, api-key.
Pending (read-only) accounts: list hooks short-circuit to empty before any fetch.

═══════════════════════════════════════════════════════════
HOW TEST/LIVE MODE WORKS
═══════════════════════════════════════════════════════════

1. ModeContext stores { mode: 'live' | 'test' }
2. Pill in Sidebar wordmark row calls setMode() on click
3. Hooks (useTransactions, useAccounts, useCustomers) append ?mode= to every fetch
4. MSW returns live fixtures or testFixtures.js (sparse data, test IDs)
5. Test mode: amber banner at top of <main> + amber pill styling
6. No component other than hooks needs to know about mode

═══════════════════════════════════════════════════════════
PUSH PANEL SYSTEM
═══════════════════════════════════════════════════════════

Panel renders at AppShell level — flex sibling of <main>, pushes the full content area.

State: PanelContext { type, id } — types: transaction|account|customer|recipient|
       requestLog|webhook. Pages call openPanel(type, id) via usePanelContext().
AppShell closes panel on route change (useEffect on location.pathname).

Animation: width 0 → 420px (not translateX — translateX doesn't remove flex space).

Column hiding when panel open:
  Transactions: Source column hidden
  Customers: Created column hidden
  Recipients: Customer column hidden

Deep-link panel opening (router state on mount):
  Transactions:  location.state?.openTransactionId
  Customers:     location.state?.openCustomerId
  Accounts:      location.state?.openAccountId
  Recipients:    location.state?.openRecipientId
  Webhooks:      location.state?.openWebhookId
  Transactions also reads: location.state?.filterAccountId (account activity deep-link)

ACCOUNT PANEL — RECENT ACTIVITY ROWS
  Two-column layout: [icon + description/timestamp] [amount]
  Directional icon (16×16, strokeWidth 2.5):
    ↓ ArrowDown — inflows  (depositAccount === account.id) — text-feedback-success-main
    ↑ ArrowUp   — outflows (sourceAccountId === account.id) — text-feedback-danger-main
  Icon color matches amount color. Icon aligns to description line via items-start on inner flex.
  Description (13px, font-medium, primary): derived by activityDescription(txn) in GlobalPanel.jsx
    Conversion:  txn.corridor ("NGN → USDC", "USDC → KES")
    Deposit:     "From [sourceAddressShort]" — explicit short wallet address on fixture
    Withdrawal:  "To [destination]" — destination already carries short address or bank name
  Timestamp (12px, text-content-tertiary): formatRelative(txn.createdAt)
  Amount (13px, font-medium, tabular-nums): signed + or − prefix, success/danger color
  Rows separated by border-b border-border-default; last row has no border.
  "View all →" lives in the section header row (not below the list) — established pattern
  for overflow sections in panels. Section header rendered manually (not PanelSection) to
  support the flex justify-between header layout.

═══════════════════════════════════════════════════════════
GLOBAL SEARCH (cmd+k)
═══════════════════════════════════════════════════════════

Client-side search against fixture imports. Min 2 chars. Max 12 results (3/group).
Groups: Transactions, Customers, Accounts, Recipients.
Ranking: exact (3) → starts-with (2) → substring (1).
Recent items: session-only React state in SearchContext (not localStorage).
Pages call addRecentItem(type, id) when opening a panel.

On select: navigate to page + router state to open panel (see deep-link list above).

Files: SearchContext.jsx, GlobalSearch.jsx. Mounted in AppShell above the flex row.

═══════════════════════════════════════════════════════════
REQUEST LOG PAGE — KEY PATTERNS
═══════════════════════════════════════════════════════════

Summary strip stats: computed at module level from fixture (independent of filters).

Method badges (inline in RequestLog.jsx, not Badge.jsx):
  GET  → secondary (neutral)
  POST → information (blue)

Status code badges:
  2xx → success, 4xx → warning, 401 → error (urgent), 5xx → error

Latency coloring (color on number, not a badge):
  < 300ms  → text-content-tertiary
  300–600ms → text-feedback-warning-dark
  > 600ms  → text-feedback-danger-main

JsonBlock (inline in GlobalPanel.jsx):
  Regex syntax highlighter. Uses inline styles (not Tailwind) to survive prod builds.
  escapeHtml() runs BEFORE syntaxHighlight() to prevent HTML injection.
  Truncates to maxLines=15 with "Show full (N lines)" toggle.

═══════════════════════════════════════════════════════════
UNIVERSAL PAGE HEADER — PageHeader.jsx
═══════════════════════════════════════════════════════════

All pages (except Overview and Accounts) use the PageHeader component.

COMPONENT API:
  <PageHeader
    title="Recipients"
    subtitle="Saved payout destinations."         ← optional
    filters={[                                    ← omit for no Filter button
      { id: 'status', label: 'Status',
        options: [...], value, defaultValue: 'all', onChange },
    ]}
    primaryAction={{ label: '+ Add recipient', icon?, onClick }}  ← optional
    secondaryAction={{ label: 'Role permissions', icon?, onClick }} ← optional (Team only)
  />

STRUCTURE:
  ROW 1: [title]  [Filter ▾?]  [secondary action?]  [primary action?]
  ROW 2: [subtitle] (optional)
  ROW 3: [active filter pills] (only when filters are applied)

FILTER BUTTON STATES:
  Default (no filters active):  [⌄ Filter]
  Active (N filters applied):   [⌄ Filter  2]  ← count badge inside button
  Active state styling: border-action-primary-main + bg-action-primary-light

FILTER PANEL (260px, right-aligned, shadow):
  - Opens below Filter button; closes on click-outside
  - Each filter = label (12px, tertiary) + full-width Pax Select
  - Footer: "Clear all" text link (left) + "Apply" primary button (right)
  - Radix click-outside fix: skips [data-radix-popper-content-wrapper] to prevent
    closing the panel when the user clicks a Select option inside it

DEFERRED vs LIVE FILTERING:
  Panel selections are deferred — only committed when "Apply" is clicked.
  Why: prevents intermediate table states (partial filter combinations) when the
  operator is building a multi-filter query. Live filtering fires N fetches for N
  selections; deferred fires exactly one with the full intended state.
  Live filtering is appropriate only for text search (cmd+k) where each keystroke
  is a meaningful refinement.

ACTIVE FILTER PILLS:
  Rendered from applied values (not pending panel state). Each pill's × calls
  onChange(defaultValue) immediately — single precise removals are unambiguous
  and don't need the Apply step.

ACTIVE COUNT BADGE:
  Computed at render time: count of filters where value !== defaultValue.
  No extra state needed — pure computation from the filters array prop.

PAGES EXEMPT FROM THIS SYSTEM:
  Overview — unique dashboard layout, no filter concept
  Accounts — page-level header has no filters; Customer Accounts section keeps
             its existing pill toggles (All / On-chain / Fiat) — section-level,
             not page-level

PAGES WITH NO FILTER BUTTON:
  Webhooks — no filters, only "+ Add endpoint" primary action
  Team     — no filters; secondary "Role permissions" + primary "Invite member"
  ApiKey   — no filters, no action button (title + subtitle only via existing layout)

ACCOUNT CONTEXT PILL (Transactions only):
  The accountId deep-link filter is NOT part of PageHeader — it's set by router
  state, has no dropdown options, and is rendered as a standalone pill below
  PageHeader in Transactions.jsx.

═══════════════════════════════════════════════════════════
SEND FUNDS MODAL — KEY PATTERNS
═══════════════════════════════════════════════════════════

4 steps: Select source → Select recipient → Enter amount → Confirm
State: useState(step) + flat useState(formData). No reducer.
preselectedAccountId prop skips step 1 (used from account panel).
Step 2 filters recipients by rail compatibility (USDC→crypto only, USD→fiat only).

ReadOnlyCard sub-component: label + primary + secondary + trailing. Defined inline
in SendFundsModal.jsx (not yet extracted to shared ui/).

Multi-step modal footer pattern:
  Back button → bottom-left, text-only
  Cancel + Continue/Confirm → bottom-right, side by side

POST /api/transfers mutates fixture array so subsequent GETs reflect the new record.

═══════════════════════════════════════════════════════════
VISUAL DIRECTION + DENSITY
═══════════════════════════════════════════════════════════

Target: Column.com meets Stripe Dashboard meets Mercury. Refined fintech.
- Light sidebar (NOT dark), white content area, subtle 1px borders, minimal shadows
- Status badges: small pills, semantically colored, not loud
- Design references in /references/ — extract spacing/density only, never copy branding

Spacing rhythm:
  Between major sections: 24px (space-y-6)
  Card internal padding: 16px (p-4)
  Table header: px-4 py-2.5 | Table body: px-4 py-3

Typography:
  Page headings: text-2xl font-medium | Balance/hero: text-2xl font-semibold tabular-nums
  Section labels: text-xs font-medium uppercase tracking-wide
  Table primary: text-sm | secondary: text-xs
  NEVER use arbitrary px values like text-[13px] — always use Pax type scale

Badge colors:
  completed/active → feedback-success (green)
  pending → feedback-information (blue)
  failed/rejected/401 → feedback-danger (red)
  canceled/reversed → secondary (gray)
  invited → information | suspended → secondary

═══════════════════════════════════════════════════════════
DO NOT
═══════════════════════════════════════════════════════════

- Do not write inline SVG — always use lucide-react
- Do not use a dark sidebar
- Do not use modals for row detail — use the push panel
- Do not install Tailwind separately or raw Shadcn
- Do not make real API calls to any external service
- Do not build auth, login flows, or user management
- Do not add features not listed above — keep scope clean
- Do not leave CLAUDE.md stale — update after every major piece of work
- Do not use text-content-quaternary except for disabled/absent/placeholder states
- Do not add Co-Authored-By trailers or any Claude/AI attribution to git commits or PRs

═══════════════════════════════════════════════════════════
RESPONSIVE SYSTEM
═══════════════════════════════════════════════════════════

BREAKPOINTS (Tailwind md/lg via @tailwindcss/vite):
  Mobile  360px+  — default (no prefix)
  Tablet  768px+  — md:
  Desktop 1280px+ — lg: (existing behavior preserved)

SIDEBAR PER BREAKPOINT:
  Mobile:  hidden by default (translate-x-full), opens as 280px push drawer via isMobileOpen
           MobileTopBar (md:hidden) shows hamburger + wordmark + search icon
  Tablet:  always visible, 56px icon-rail; expand button (ChevronRight) toggles to 224px overlay
  Desktop: always visible, 224px fixed (lg:w-56) — no toggle
  Mutual exclusion: opening panel → closeMobileSidebar(); opening sidebar → closePanel()
  Context: SidebarContext.jsx — isMobileOpen, isTabletExpanded + open/close helpers

PANEL PER BREAKPOINT:
  Mobile:  w-screen full-screen; PanelHeader shows ← back arrow (md:hidden)
  Tablet:  380px push (md:w-[380px]); PanelHeader shows × close (hidden md:flex)
  Desktop: 420px push (lg:w-[420px])

COLUMN HIDING (hidden md:table-cell pattern):
  Transactions  Hidden: Reference, Source, Destination, Date
  Accounts      Hidden: Type, Currency (both Your and Customer sections)
  Customers     Hidden: Type, Country, Created
  Recipients    Hidden: Customer, Rail, Status, Created
  Webhooks      Hidden: Events, Deliveries
  Team          Hidden: Status, Last active, Joined
  AuditLog      Hidden: Actor, Target, IP — expandable inline row on mobile
  RequestLog    Hidden: Method, Latency, IP — expandable inline row on mobile (flex layout, not grid)

EXPANDABLE ROW PATTERN (AuditLog + RequestLog):
  expandedRows: useState(new Set()) — O(1) has/add/delete
  Chevron button: sibling of main row (not nested) to avoid invalid HTML
  Expansion div: md:hidden; shows hidden columns as <dl> key-value pairs
  RequestLog uses flex (not CSS grid) — grid display:none breaks column positions

GLOBAL SEARCH (mobile):
  Floating ⌘K pill: hidden md:flex — not shown on mobile
  Search overlay: full-width w-full px-4 md:px-0 md:w-[600px]

OVERVIEW GRID REORDER:
  Needs Attention: order-1 md:order-2 (appears first on mobile)
  Transactions:    order-2 md:order-1

═══════════════════════════════════════════════════════════
KNOWN LIMITATIONS
═══════════════════════════════════════════════════════════

- RBAC not enforced — Team page documents intended roles but all pages are accessible
- CURRENT_USER_NAME = 'Tolu Adeyinka' is hardcoded (no auth context)
- Webhook retry button and "View full payload →" link are UI-only stubs
- "Add recipient" / "+ New recipient" show Coming Soon toast
- "Add funds" and "New customer" on Overview are non-functional stubs
- Account filter chip shows raw ID (acc_c01) not label
- Fiat virtual accounts always show "No activity yet" in recent activity
- formatRelative() uses Date.now() — relative times drift from fixture anchor (2026-03-19)
- kycLinkExpiresAt dates are static — "Expires in X days" drifts over time
- Latency thresholds (300ms, 600ms) are hardcoded — should be configurable in production
- Audit Log entry count grows as transfers are added (entries computed from auditLog.length)
- TRANSACTION_TOTAL hardcoded at 847 (simulates large dataset)
- Bundle ~713KB unminified — in prod: code-split with React.lazy()
- Onboarding: DemoStatusSwitcher + "Preview welcome email" CTA are demo-only (wouldn't ship)
- No real verdict — VerifyIdentity always lands on 'pending' (no Sumsub webhook backend)
- Login is routing-only: the magic link is simulated by "Continue to dashboard" (no real
  mail/auth/token verification); whatever status is in localStorage drives the dashboard
- CheckEmail "resend" (signup + login) is a UI-only stub (no real mail sends)
- Account status persists in localStorage (globalstack.account) — clear it or use Demo switcher to reset

═══════════════════════════════════════════════════════════
WHAT TO TACKLE NEXT
═══════════════════════════════════════════════════════════

Onboarding roadmap (from team update, Jun 2026 — see project memory):
- Updated welcome email design
- Rework pending state: replace the read-only empty dashboard with a dedicated
  "under review" status page — set expectations (what's happening, rough timeline)
  + give them things to do while they wait (explore docs, grab sandbox API keys,
  invite teammates). Dashboard only appears once approved. (Rationale: a dashboard
  full of zeros earns nothing; there's no test mode at launch to fill it.)
- Open question: rejected state — resubmit/appeal path, or terminal? (currently
  terminal: "Contact support" mailto only)

Other:
- Consider: "dismissed alerts" pattern — localStorage keyed by item ID+status so
  acknowledged issues don't re-surface on every page load

═══════════════════════════════════════════════════════════
DOCUMENTATION — ALWAYS MAINTAINED
═══════════════════════════════════════════════════════════

After completing each major piece of work, update CLAUDE.md and relevant docs in /docs.
Also maintain: /docs/ARCHITECTURE.md, /docs/DATA.md, /docs/PAX.md

Update existing entries in place — don't append. If it grows past ~350 lines, trim first.
- Add new pages, routes, fixtures, and gotchas to their existing sections (1–3 lines each)
- Remove completed TODOs from WHAT TO TACKLE NEXT
- No build history, no per-feature limitations blocks, no decision rationale
