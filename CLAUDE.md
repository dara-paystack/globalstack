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
CURRENT STATUS — Updated Mar 19, 2026
═══════════════════════════════════════════════════════════

✅ Step 27: TopBar removed — Live indicator moved to sidebar wordmark row (Mar 19, 2026)

  TopBar.jsx is no longer mounted. The component file is preserved but unused.

  Live/Test mode indicator: now in Sidebar.jsx, inline with the GlobalStack wordmark.
    - Wordmark row is a flex row: logo (left) + mode pill (right), both vertically centered.
    - Pill is slightly tighter than the old TopBar version: px-2 py-0.5 text-[11px] — fits
      comfortably in the 224px sidebar without competing with the wordmark.
    - Clicking the pill still calls setMode() via useMode() — toggle logic unchanged.
    - aria-label + aria-pressed preserved on the button element.
    - Green dot in live mode, amber dot + amber styling in test mode — same as before.

  Test mode amber banner: now renders at the top of <main> in AppShell.jsx, before
    the p-16 padding block. It spans the full content area width (not indented).
    This is the correct location — it's content-area context, not persistent chrome.

  AppShell layout change:
    - Removed the intermediate flex-col wrapper that stacked TopBar above the flex row.
    - <div className="ml-56 flex h-screen overflow-hidden"> now directly contains
      <main> and <GlobalPanel> as siblings. Simpler structure, fewer DOM nodes.

✅ Step 25: Team page — who has access and what they can do (Mar 19, 2026)

  Route: /settings/team (sidebar under ADMIN, below Audit Log)
  Icon: UsersRound (Lucide)

  Fixture: src/mocks/fixtures/team.js — 6 team members
    Tolu Adeyinka   Admin      Active      (current user — "You" badge)
    Amara Osei      Developer  Active
    Chisom Eze      Finance    Active
    Bola Fashola    Developer  Invited     (hasn't accepted yet)
    Ngozi Okafor    Finance    Active
    Kweku Mensah    Admin      Suspended

  Schema: id, name, email, role (admin|developer|finance), status (active|invited|suspended),
          avatarInitials, joinedAt (null if invited), invitedAt, lastActiveAt (null if invited)

  MSW handler: GET /api/team — returns all members sorted: active → invited → suspended.
    Within active, sorted by joinedAt ascending (longest-serving first).
    No mode separation — team membership is not test/live-mode data.

  Three roles and their access levels (informational only — NOT enforced in prototype):
    Admin:     Full access — all pages including API Key, Webhooks, Audit Log, Team.
               Typically the technical or business owner.
    Developer: Technical access — all pages except Audit Log and Team.
               Typically an engineer integrating the API.
    Finance:   Operational access — Overview, Transactions, Accounts, Recipients, Customers only.
               Cannot access API Key, Webhooks, Audit Log, or Team.
               Typically an ops or finance team member monitoring activity and balances.

  Page layout:
    - Header: "Team" + subtitle "People with access to this dashboard."
    - Top row: member count (left) + "+ Invite member" button (right)
    - "+ Invite member": UI only — shows inline InviteBanner: "Invitations are sent by your
      account manager. Contact support@globalstack.io to add team members." Auto-dismisses 5s.
    - Team table: Member (avatar + name + email) | Role | Status | Last active | Joined
    - Roles reference: collapsible permissions matrix, collapsed by default

  "You" badge: small secondary Chip rendered inline after Tolu Adeyinka's name.
    Matched by CURRENT_USER_NAME constant = 'Tolu Adeyinka'. In a real app this
    comes from an auth context; the name-match pattern avoids needing auth in the prototype.

  Suspended members (Kweku Mensah): name/email in muted color; lastActiveAt preserved
    (shows last known session date, not "Never"). Row is not alarming — suspension
    is a normal operational state. No action buttons (unsuspend, delete) — not self-service.

  Permissions matrix (Role permissions section):
    - Collapsed by default — reference documentation, not operational information
    - Simple chevron toggle (no Pax Accordion — availability not confirmed)
    - ✓ in success color (text-feedback-success-main) — access is a positive state
    - ✗ in quaternary muted — absence of access is neutral, not an error (not red)
    - Striped rows for scannability

  Badge.jsx: added `invited: 'information'` and `suspended: 'secondary'` to STATUS_COLOR.

KNOWN LIMITATIONS:
  - RBAC is NOT enforced — all logged-in users can see all pages regardless of role.
    The Team page documents the intended access model; it does not implement it.
  - Invite and suspension are not self-service. "+ Invite member" shows an informational
    banner directing operators to contact support. No form or API call is made.
  - CURRENT_USER_NAME is hardcoded as 'Tolu Adeyinka' — not derived from an auth context.
    The "You" badge relies on a name match between the sidebar identity and the fixture.
  - formatRelative() uses Date.now() — lastActiveAt timestamps will appear increasingly
    old as time passes from the fixture anchor date (2026-03-19).

✅ Step 26: Send Funds modal — redesigned to match Retry refund modal design language (Mar 19, 2026)

  Design reference: Paystack "Retry refund" modal (screenshot in /references/).
  Goal: extract the design language, not copy the content.

  LABELED NODE STEPPER (replaces pill dots + "Step X of 4"):
  - 4 nodes: Account → Recipient → Amount → Confirm
  - Completed steps: filled circle + checkmark SVG, muted label
  - Active step: filled circle (no checkmark — step not yet complete), primary-color label
  - Upcoming steps: dashed outlined circle, muted label, 50% opacity
  - Connector lines between nodes: fills with action-primary-main as steps complete
  - Built without keyed React.Fragment — elements array pattern avoids the import
  - Lives in the modal header (persistent chrome), separated from step content by a border

  PER-STEP TITLE + SUBTITLE:
  - STEP_HEADERS constant: 4 entries with { title, subtitle }
  - Title: text-lg font-semibold, renders as h2 with aria-labelledby — the dialog's
    accessible name changes meaningfully at each step
  - Subtitle: text-sm text-content-secondary — explains what the user is deciding now
  - Replaces the static "Send funds" header that never changed

  CARD ROWS FOR READ-ONLY DATA (ReadOnlyCard component):
  - New shared sub-component: label (top-left, text-xs muted), primary (text-sm font-medium),
    secondary (text-xs font-mono muted), trailingPrimary (text-sm font-semibold), trailingSecondary
  - Used in Step 3 for both "From" (source account + balance) and "To" (recipient + rail)
  - Previously only the "From" card existed; "To" was bare text in the parent
  - Visual separation between committed state and editable fields is the key UX benefit

  FORM FIELD LABELS:
  - Changed from: text-xs font-medium uppercase tracking-wide (bureaucratic, dense)
  - Changed to: text-sm font-medium text-content-primary (readable, sentence case)
  - Consistent with the reference's label style throughout

  INPUT SIZES:
  - h-9/h-10 → h-11 (more presence, matches generous internal padding)
  - rounded-lg → rounded-xl (softer, consistent with card corners)
  - px-3 → px-3.5 (slightly more internal padding for breathing room)

  RADIO-STYLE SELECTION INDICATORS:
  - Account cards (Step 1) and recipient cards (Step 2): radio-style circle selector
    (border-2 circle, filled with white dot when selected) replaces the checkmark-in-circle
  - More conventional form interaction pattern — feels less like an app action, more like a form

  BUTTONS:
  - "Continue →" → "Continue" (arrow removed from primary button)
  - "Confirm transfer →" → "Confirm transfer" (arrow removed)
  - "View in transactions →" kept in success state (it's a navigation link, not a primary action)
  - Footer layout unchanged: [← Back] left, [Cancel][Continue] right

  FOOTER PATTERN (established convention for this dashboard):
  - Back button: bottom-left, text-only, directional
  - Cancel + Continue/Confirm: bottom-right, side by side
  - Separates navigation (Back) from decisions (Cancel, Continue)
  - This is now the established pattern for any multi-step modal flow

KNOWN LIMITATIONS:
  - Step indicator does not animate between steps (no slide transition on the nodes)
  - ReadOnlyCard is defined inline in SendFundsModal.jsx — not yet extracted to shared ui/

✅ Step 24: Overview balance card — total balance with composition breakdown (Mar 19, 2026)

  Design decision: toggle approach was considered and rejected. A toggle frames two
  things as alternatives; a breakdown frames them as components. The operator's
  first question is "how much flows through my infrastructure?" — the total answers
  that. The breakdown answers the follow-up: "what's mine vs in custody?" These are
  hierarchical questions, not either/or — hence total-first with decomposition rows.

  Overview.jsx:
  - Replaced both the col-span-2 merchant card and col-span-1 customer card with a
    single full-width card showing total USDC balance across all accounts
  - Total balance = treasuryBalance + customerUsdcBalance (merchant + customer USDC)
  - Primary number: text-[38px] font-semibold — the largest number on the page
  - Trend: derived from totalSparkline (computed below), shown in green/red
  - Sparkline: totalSparkline — sum of merchant + customer sparkline at each data point.
    Both series share the same 7-day anchor, so they have identical day labels.
    Summing point-by-point gives aggregate infrastructure balance over time.
  - Breakdown section below the sparkline: two read-only rows (not interactive):
      Your balance    [amount]  [blue bar]   [pct%]
      Customer funds  [amount]  [green bar]  [pct%]
    - Bar colors: cerulean-600 (merchant, matches default sparkline blue),
      stack-green-600 (customer, distinct but harmonious)
    - Bar track: bg-surface-secondary, 6px tall, 120px wide, rounded-md
    - Percentage: (amount / total) * 100, shown to 1 decimal place
    - Breakdown rows are NOT interactive — no hover, no click, no cursor-pointer
  - Two-column layout below the card is unchanged
  - Merchant metadata: "{Account label} · {Chain} · USDC" (e.g. "Primary Wallet · Base · USDC")
  - Customer metadata: "{n} accounts · {m} customers"
  - Crossfade: 100ms opacity transition — content fades to 0, view updates, fades back.
    Implemented with `fading` boolean state + setTimeout(100ms). No bounce, no slide.
  - Toggle is cosmetic only — does NOT filter transactions, accounts, or any other content
  - The customer funds card is removed entirely; the space it occupied is now part of
    the single balance card (wider, more prominent number at text-3xl)
  - CHAIN_LABELS defined locally in Overview.jsx (small subset; avoids importing from
    GlobalPanel which is a component file — not a shared module)
  - Two-column layout below the balance card is unchanged

KNOWN LIMITATIONS ADDED:
  - Toggle state resets to "merchant" on page navigation (no persistence — intentional)
  - The metadata line for merchant state derives from the first USDC merchant account;
    if no such account exists, falls back to plain "USDC"

✅ Step 23: Pre-review polish pass — 8 data model + UX correctness fixes (Mar 19, 2026)

  1. Transaction IDs: renamed from txn_xxx to tx_xxxabc (3 extra alphanumeric chars appended).
     Panel header now shows ID as primary identity (font-mono) + datetime as subtitle.
     Corridor label removed from panel header — it was a type label, not an identifier.

  2. On-chain tx hash for conversions: added `onChainTxHash` to 9 completed fiat→USDC
     conversions in transactions.js. Hash consolidated into the "References" PanelSection
     (alongside transaction ID and merchant ref) — not a separate "On-chain" section.
     Removes one section from the panel, reduces scrolling.

  3. Virtual account status badge: `open: 'Active'` → `open: 'Open'` in Badge.jsx.
     "Active" was misleading — on-chain accounts use `active` (which displays "Active");
     fiat virtual accounts use `open` and should display "Open" to match the API state name.
     Account number copy: CopyButton got an optional `onCopy` callback prop. AccountDetail
     passes `handleAcctNumCopy` which sets a 2s toast: "Account number copied".

  4. Customer country field: kept (KYC-sourced, useful for compliance context). Added
     comment in customers.js. Emeka Okafor (not_started KYC) has `country: null` to
     demonstrate that pre-KYC customers may lack this field. Panel shows "—" when absent.

  5. KYC link expiry: added `kycLinkExpiresAt` to all 10 customers (30d from createdAt).
     KycTab shows "Expires in X days" below the link in amber (≤7 days) or red (expired).
     TOS Status section now always shown (not only when `tosStatus === false`):
     - `tosStatus === true`: green "Accepted" badge + explanatory note
     - `tosStatus === false`: existing amber warning block + TOS link to copy

  6. Recipient status badge: `<Badge variant="status" value={recipient.status} />` was
     showing "Approved" because `active` hits KYC_LABELS before ACCOUNT_STATUS_LABELS.
     Fix: pass children explicitly at both call sites (Recipients.jsx table + GlobalPanel
     RecipientDetail header): `'active' ? 'Active' : 'Archived'`.

  7. API key status badge: same root cause as Issue 6. Fix: `<Badge ...>Active</Badge>`
     with explicit children at the one call site in ApiKey.jsx.

  8. Send Funds modal — same-currency constraint: Step 2 now filters recipients by
     compatibility with the selected source account. USDC (on-chain) → crypto recipients
     only; USD (fiat) → fiat recipients only. Explanatory note shown above the list.
     Two empty states: "No active recipients" (none at all) vs "No compatible recipients"
     (have recipients on wrong rail). `selectedAccount` passed from modal to Step2.

  CopyButton: added optional `onCopy` callback — called after successful clipboard write.
  Lets parent components show context-specific toasts without duplicating clipboard logic.

KNOWN LIMITATIONS ADDED:
  - Badge "Approved" for KYC `active` is correct for customer KYC tabs; children override
    pattern is required for any OTHER use of `active` status (recipient, API key).
    Long-term fix: Badge should accept a variant that bypasses KYC_LABELS entirely.
  - `kycLinkExpiresAt` dates are static fixtures — the "Expires in X days" calculation
    is relative to `Date.now()`, so it will show increasing age as time passes from Mar 19.

═══════════════════════════════════════════════════════════

COMPLETED:
✅ Step 1: Vite + React scaffold (JSX, no TypeScript)
✅ Step 2: @paystack/pax installed and configured
✅ Step 3: React Router v6, MSW, Recharts installed
✅ Step 4: All fixture files written (transactions, accounts, customers, webhooks, testFixtures)
✅ Step 5: MSW handlers + browser.js + mockServiceWorker.js in public/
✅ Step 6: ModeContext (Test/Live) — useMode() hook
✅ Step 7: AppShell (Sidebar + TopBar with toggle + routing)
✅ Step 8: Shared UI components (Badge, DetailPanel, Timeline, Sparkline, StatCard, CopyButton, EmptyState, ErrorState)
✅ Step 9: All 6 pages built (Overview, Transactions, Accounts, Customers, ApiKey, Webhooks)
✅ Step 10: Loading states (Skeleton), empty states, error states throughout
✅ Step 11: CLAUDE.md updated

✅ Step 12: Two-layer account ownership model (merchant vs customer)
✅ Step 13: Semantic token migration + quaternary-only-for-disabled rule
✅ Step 14: Pax Chip component integration (Overview recent transactions)
✅ Step 15: Push panel layout — PanelContext, GlobalPanel in AppShell, column hiding
✅ Step 16: Customer accounts scaled to flat paginated table (35 accounts, 5 customers)
           - Grouped layout removed; flat table + search + type filter + balance sort
           - Customer name link → Customers page with panel pre-opened via router state
           - Banner updated: added "Largest account" concentration risk stat
           - useCustomerAccounts hook with server-side search/filter/sort/paginate
           - MSW handler upgraded: search, type, currency, sort, pagination for accounts

✅ Step 17: ApiKey page rebuilt — security posture + usage metadata
           - Fixture extended: id, created, lastUsed, lastIp, status, totalRequests,
             requestsToday, errorsToday, permissions[], requestVolume[] (7-day sparkline data)
           - New fixture file: src/mocks/fixtures/apiKey.js (was inline in handler)
           - MSW handler updated to serve the full fixture
           - Page now has 4 sections:
             1. Key card: status badge, masked key + copy, last used + IP, contact notice
             2. Usage card: 3 stat cells + 7-day Recharts AreaChart with XAxis
             3. Permissions card: granted (✓ green) / denied (✗ muted gray) two columns
             4. Security callout: left-bordered info block (not a card)
           - Copy button shows a fixed-position toast ("Copied to clipboard") — inline
             in ApiKey.jsx, not using shared <CopyButton> (which owns its own tick state
             and can't trigger page-level toast without coupling page logic into the atom)
           - Today's sparkline dot is amber (#F59E0B) to signal partial day count
           - Errors today stat: red if > 0, muted gray if 0 (color = status)
           - Denied permissions shown alongside granted — removes "is this everything?"
             ambiguity; reframes absence as intentional scope, not a system gap

✅ Step 18: Audit Log page — compliance record of all operator actions
           - Route: /settings/audit-log (sidebar under ADMIN)
           - Fixture: src/mocks/fixtures/auditLog.js — 47 entries, 3 actors, 30 days
           - Three actors: Tolu Adeyinka (Admin), Amara Osei (Developer), Chisom Eze (Finance)
           - Action types: customer.created, customer.kyc_approved, customer.kyc_rejected,
             webhook.created, webhook.deleted, webhook.updated, api_key.viewed,
             account.created, dashboard.login
           - MSW handler: GET /api/audit-log with ?page, ?limit, ?action (category),
             ?actor (name), ?dateRange (last_7|last_30|last_90) — no mode switching,
             audit logs are always real (not test-mode filtered)
           - Table: Timestamp (absolute) | Actor + role badge | Action + metadata context |
             Target + ID | IP (masked)
           - Rows intentionally NOT clickable — no hover state (read-only record)
           - Row height ~44px (denser than Transactions at ~52px — audit logs read carefully)
           - Timestamps always absolute ("Mar 10, 2026, 02:23 PM") — never relative
           - Actor role badge: neutral/secondary (type badge via Badge component)
           - No status badges, no type badges on actions — human-readable text only
           - Export CSV: UI-only — clicking shows an inline dismissible banner
             "Export started. You'll receive an email when it's ready." (auto-dismisses 5s)
             No actual file generation. Why: compliance exports may be large and must flow
             through an auditable channel, not a browser download.
           - Inline notification implemented as a React state banner (not Pax Toast) —
             avoids requiring a <Toaster> provider at app root for a single use case

✅ Step 19: Webhook delivery visibility — operators can see if webhooks are working
           - New fixture: src/mocks/fixtures/webhookDeliveries.js (36 records)
             - wh_01: 27 deliveries (1 pending, 2 failed in burst cluster, 24 delivered)
             - wh_02: 9 deliveries (all delivered, no failures — backup endpoint)
             - Each record: id, endpointId, eventType, eventId, status, attempts,
               statusCode (200|404|500|'timeout'|null), duration (ms), timestamp, payload
             - Failure cluster is realistic: 2 consecutive failures ~3.5 hrs ago,
               representing a transient downstream deploy issue
           - New hooks: src/hooks/useWebhooks.js
             - useWebhook(id) — fetches single endpoint (for panel header/summary)
             - useWebhookDeliveries(id, page) — paginated delivery log (limit=15)
           - MSW handler additions/changes:
             - GET /api/webhooks: now computes deliverySummary { total, failed, lastAt }
               per endpoint from the deliveries fixture and includes it in the list response.
               Server-side aggregation avoids N+1 fetches from the UI.
             - GET /api/webhooks/:id: new — single endpoint with deliverySummary
             - GET /api/webhooks/:id/deliveries: new — paginated, sorted newest-first
           - Webhooks page changes:
             - Delivery summary line per card: "27 deliveries • 2 failed • last delivery Xm ago"
               "2 failed" is red if > 0, gray if zero
             - Failure callout banner (amber/warning semantic): "⚠ 2 deliveries failed in
               the last 24 hours. View details →" — shown above card content when failures exist
             - Clicking anywhere on a card (outside Edit/Delete) opens the endpoint panel
               Edit/Delete use stopPropagation to avoid triggering the panel open
             - Selected card gets bg-surface-secondary to signal it's the active panel subject
           - GlobalPanel webhook panel:
             - Header: endpoint URL + "Endpoint" label + status badge
             - Endpoint section: URL, Status, Events, Created date
             - Delivery Summary: Total, Delivered (green), Failed (red if > 0), Success rate
             - Recent Deliveries: paginated log (15 per page) newest-first
               Each row: status dot (green/red/blue) + eventType + eventId + timestamp
                         + statusCode label + duration + Retry button (failed only)
               Clicking a row expands it inline to show payload JSON preview (~8 lines)
               "View full payload →" link is present but non-functional (prototype)
               Retry button is UI-only, no real action — stopPropagation from row expand

KNOWN LIMITATIONS ADDED:
- Retry button (webhook deliveries panel) is UI-only — clicking does nothing
- "View full payload →" link in expanded delivery row is non-functional
- Failure callout says "last 24 hours" but filters only by failed count, not time window
  (all failures in the fixture happen to be within 24 hours — close enough for prototype)
- Webhook mode separation: wh_01/wh_02 and their delivery history are not
  test/live-mode-separated. Deliveries always show regardless of mode toggle.

✅ Step 22: Recipients page + Send Funds modal (Mar 19, 2026)

  Recipients page (/recipients):
  - New fixture: src/mocks/fixtures/recipients.js — 13 recipients across 5 customers
    - 4 for John Adeyemi (2 fiat, 2 crypto)
    - 3 for Wanjiku Holdings (2 fiat, 1 crypto; rec_006 Equity Bank is ARCHIVED)
    - 2 for Cape Logistics (1 fiat, 1 crypto)
    - 2 for Kwame Asante (1 fiat, 1 crypto)
    - 2 for TechPay Solutions (1 fiat, 1 crypto)
  - Fiat fields: accountOwnerName, accountNumber (full, for copy), accountNumberMasked
    (display), routingNumber, bankName, accountType, rail (ach|wire|ach_same_day)
  - Crypto fields: walletAddress, chain, rail (matches chain)
  - MSW handler: GET /api/recipients?customerId=&type=&status=&page=&limit=15
    GET /api/recipients/:id
  - Hook: src/hooks/useRecipients.js — useRecipients + useRecipient(id)
    Not mode-separated (same reasoning as audit logs — operational data)
  - Page: filter bar (Customer / Type / Status) + table + openPanel('recipient', id)
  - "Add recipient" → Coming soon toast (bank resolution flow not yet implemented)
  - Customer column hidden when panel is open (column-hiding pattern)

  Transfers fixture:
  - New fixture: src/mocks/fixtures/transfers.js — 16 transfers across 5 customers
  - Covers all 4 statuses: COMPLETED (9), PENDING (4), FAILED (2), CANCELED (1)
  - MSW handler: GET /api/transfers, GET /api/transfers/:id
    POST /api/transfers → 201, new PENDING transfer; mutates fixture array so
    subsequent GETs include the new record (same pattern as audit log api_key.copied)
  - Hook: src/hooks/useTransfers.js — useTransfers + useTransfer(id)

  Send Funds modal (src/components/ui/SendFundsModal.jsx):
  - 4-step flow: Select source → Select recipient → Enter amount → Confirm
  - Why modal, not panel: sequential action that changes state; modal blocks
    intentionally and returns user to where they were. Panel is a viewer.
  - Step state: useState(step) + flat useState(formData). No reducer — linear.
  - preselectedAccountId prop: skips step 1, initializes to that account.
    Parent uses key={preselectedAccountId ?? 'generic'} for fresh instances.
  - Step 1: Merchant accounts; balance > 0 selectable; zero-balance shown disabled with "No funds"
  - Step 2: Customer dropdown + active recipients for that customer
    "+ New recipient" → Coming soon toast
  - Step 3: Amount input, cross-type conversion note, rail (read-only), optional merchant ref
  - Step 4: Summary → POST /api/transfers → success state with ID + PENDING badge
    "View in transactions →" navigates to /transactions

  Navigation:
  - Recipients added to BUSINESS section between Accounts and Customers (icon: Contact)
  - Route: /recipients → Recipients.jsx

  GlobalPanel additions:
  - panelState.type === 'recipient' → RecipientPanel → RecipientDetail
  - RecipientDetail (fiat): Profile section (owner name, bank, account# copy, routing, type, rail)
  - RecipientDetail (crypto): Account section (chain, address copy, rail)
  - Both: Customer link + last 3 transfers (reads allTransfers fixture directly — no extra fetch)
  - AccountDetail: "Send funds" button when account.balance > 0
    Opens SendFundsModal with preselectedAccountId — skips to step 2

  Overview:
  - "Send funds" quick action button now opens SendFundsModal (no preselection, step 1)
  - "Add funds" and "New customer" remain non-functional stubs

  Badge: archived → secondary

KNOWN LIMITATIONS (Step 22):
  - "Add recipient" and "+ New recipient" show Coming soon toast
  - Rail selector is read-only (one rail per recipient in current data model)
  - Recipients and transfers are not test/live-mode-separated
  - "View all →" in recipient panel links to /transactions (not filtered by recipient)
  - "Add funds" and "New customer" on Overview remain non-functional

✅ Step 20: 5-issue polish + data coherence pass (Mar 19, 2026)

  Issue 1 — Permissions marker alignment (ApiKey.jsx):
  - Granted ✓ and denied ✗ markers: w-3 → w-4 text-center so the symbols sit centered
    in a fixed column, not left-flush. Prevents horizontal drift between rows.
  - Permissions fixture corrected to 5 granted / 3 denied (realistic operator scope:
    full transaction + account access, customer read-only, no webhook management).

  Issue 2 — Webhook failure banner at page level (Webhooks.jsx):
  - Banner was inside each endpoint's card row — got hidden when Add Endpoint form opened.
  - Moved to page level above the card. Aggregates all failures into one banner with a
    "View details →" link to the first failing endpoint's panel.
  - `totalFailed` and `firstFailingWebhook` computed from the loaded `webhooks` array
    before the JSX, not inside the map. Removed hasFailed conditional from card row class.

  Issue 3 — api_key.viewed vs api_key.copied (auditLog.js + AuditLog.jsx + ApiKey.jsx):
  - aud_002 action changed from api_key.viewed → api_key.copied.
  - ACTION_LABEL updated: api_key.viewed → "Viewed API key page", api_key.copied → "Copied API key".
  - Viewing the page is passive; extracting the key to clipboard is active (higher security signal).
  - Copy button in ApiKey.jsx now calls auditLog.unshift() with a live api_key.copied entry.
    Direct mutation of the imported fixture array — MSW serves this array on subsequent
    /api/audit-log fetches, so the entry appears without a full reload.

  Issue 4 — Login event geographic context (AuditLog.jsx):
  - AuditRow now renders dashboard.login events differently:
    - Target column: actor.ip (font-mono) + "Session from {City, Country}" secondary line
    - IP column: "—" (quaternary text) — location already shown in Target, no duplication
  - IP_LOCATION map: 41.190.3.xxx → Lagos, 197.210.54.xxx → Nairobi, 105.112.22.xxx → Accra

  Issue 5 — Fixture coherence audit:
  - 5A: apiKey.lastUsed corrected to 2026-03-19T13:47:00Z (consistent with 143 reqs today)
  - 5B: Transactions fixture — 3 root causes of -66% merchant sparkline fixed:
    - All customer on-ramp destinationAccount 'acc_01' → 'acc_c01' (John's account, not merchant)
    - All Wanjiku on-ramp destinationAccount 'acc_02' → 'acc_c08' (Wanjiku's account)
    - All John off-ramp sourceMethod 'Primary Wallet (John)' → 'John Adeyemi — Primary Wallet'
      (breaks the includes() match in computeSparkline that was misidentifying customer debits
      as merchant debits — especially txn_h1lc11 at 200,000 USDC which caused the spike)
    - Added 3 merchant deposit transactions (txn_merch01/02/03: 1,100 + 1,200 + 740 = 3,040 USDC)
      crediting acc_01 on Mar 5/7/9 — produces +3.2% upward trend [95,160→98,200]
    - Note: txn_merch01/02/03 are the ONLY transactions where destinationAccount === 'acc_01'
  - 5C: Customer balance fields corrected to match sum of USDC accounts in accounts.js:
      John Adeyemi:     125,400 → 119,550 USDC
      Wanjiku Holdings: 312,000 → 300,080 USDC
      Cape Logistics:         0 →  13,850 USDC
      Kwame Asante:       8,750 →  46,350 USDC
      TechPay Solutions:      0 →   2,780 USDC

✅ Step 21: Data model alignment pass — backend spec conformance (Mar 19, 2026)

  Transaction types:
  - on-ramp and off-ramp removed as type values. Conversion direction is communicated
    by the `corridor` field (e.g. "NGN → USDC"), not a separate type. Types are now:
    DEPOSIT | WITHDRAWAL | CONVERSION only.
  - Transactions page TYPE_OPTIONS updated accordingly.
  - Panel title for conversions uses `txn.corridor`, not type.

  Transaction statuses:
  - `processing` removed (no such API state). Replaced with `pending` throughout.
  - Added `canceled` and `reversed` as terminal states.
  - Status filter dropdown now grouped: Active (pending) / Terminal (completed, reversed) /
    Problem (failed, canceled). Uses sentinel-value pattern (_g_active etc.) so group
    headers are non-selectable divs, not SelectItems.
  - Badge.jsx STATUS_COLOR updated: pending=information, canceled/reversed=secondary.

  KYC states — expanded from 3 to 9:
  - API has 9 distinct states: not_started, incomplete, awaiting_questionnaire,
    awaiting_ubo, under_review, active, rejected, paused, offboarded.
  - 'active' displays as "Approved" (via KYC_LABELS map in Badge.jsx).
  - Customers page KYC filter dropdown: grouped into Active / Incomplete / Blocked.
  - useCustomers() now accepts { kycStatus } param; MSW handler filters server-side.
  - customers.js expanded from 5 → 10 customers to cover all 9 states.
  - Customer panel KYC tab: 9-state KYC_STATUS_CONTENT map with title, body, and
    whether to show a copyable KYC link. TOS warning block when tosStatus === false.
  - Each customer now has: tosStatus (bool), tosLink, kycLink.

  Customer IDs: cust_ prefix → cus_ everywhere (fixtures + testFixtures).

  Virtual account fields (fiat accounts):
  - Added: bankName, accountName, accountNumber (full, for copy), routingNumber, status
  - status values: open | deactivated | closed (Badge maps to Active/Inactive/Closed)
  - addressShort remains the masked display value ("Lead Bank 412****8903")
  - Account panel shows banking details section for fiat accounts.

  Chains — Solana and Ethereum:
  - chain values are now lowercase: 'base', 'solana', 'ethereum' (was 'Base')
  - Added 3 new on-chain accounts: acc_c_sol01, acc_c_sol02 (Solana), acc_c_eth01 (Ethereum)
  - CHAIN_LABELS map in GlobalPanel: { base: 'Base', solana: 'Solana', ethereum: 'Ethereum' }
  - CHAIN_EXPLORER map: per-chain block explorer URL builders (basescan, solscan, etherscan)

  Transaction detail — new fields:
  - merchant_reference: operator-supplied reference for the transaction (nullable)
  - onChainTxHash: 64-char hex hash for on-chain transactions (deposits/withdrawals)
  - Panel shows "On-chain" section with hash + copy + "View on explorer ↗" link
  - Panel shows "References" section with transaction ID + merchant_reference

  Balance freshness — asOf:
  - All accounts now have `asOf: '<ISO timestamp>'` indicating when balance was last synced
  - Accounts page banner shows "As of [time] today" beneath merchant USDC balance (12px muted)
  - Account panel shows "As of [datetime]" beneath the account balance

  testFixtures.js updated to match all schema changes above.

IN PROGRESS / TODO:
- Dev server hasn't been run yet — verify all pages render correctly in browser
- Pax Select component integration (used in Transactions filter bar) — confirm it renders
- Test mode toggle — confirm data switches when toggled

═══════════════════════════════════════════════════════════
ACCOUNT OWNERSHIP MODEL
═══════════════════════════════════════════════════════════

GlobalStack has two distinct financial layers that must NEVER be combined:

MERCHANT ACCOUNTS (owner: 'merchant')
  Funds that belong to Acme Corp directly. Their operational treasury.
  These are "house money" — Acme Corp owns and controls these balances.

CUSTOMER ACCOUNTS (owner: 'customer')
  Funds held in custody for Acme Corp's end-users (Wanjiku Holdings,
  John Adeyemi, etc.). Acme Corp custodies but does not own these.

Implementation:
  - Every account record has an `owner` field: 'merchant' | 'customer'
  - MSW handler supports ?owner=merchant or ?owner=customer filter
  - Omitting the filter returns all accounts (needed for Overview totals)
  - The two balances are NEVER summed anywhere in the UI

Where each type appears:
  - Overview: "Your balance" (merchant only) + "Customer funds" (customer only)
  - Overview sidebar: "Your accounts" card shows merchant accounts only
  - Accounts page: Two sections — "Your accounts" then "Customer accounts" (flat paginated)
  - Accounts banner: Three figures — "Your balance", "Under management", "Largest account"
  - Transactions page: Shows all transactions across both layers (correct —
    operators need to monitor everything). Detail panel shows customer name
    when the destination account belongs to a customer.
  - Customers page: Unchanged — shows customer records, not accounts

Why owner field vs separate endpoint:
  Both account types share the same schema (address, balance, currency, type).
  A single collection with a discriminator keeps the API simple and lets the
  UI filter client-side or server-side as needed.

═══════════════════════════════════════════════════════════
DOCUMENTATION — ALWAYS MAINTAINED
═══════════════════════════════════════════════════════════

After completing each major piece of work (a page, a core component, a system
like routing or MSW), update CLAUDE.md and any relevant docs in /docs.

CLAUDE.md must always reflect:
- What has been built and what hasn't
- Key architectural decisions and why they were made
- Pax usage patterns established in this project
- Where mock data lives and how to extend it
- How the Test/Live mode system works
- Known limitations or shortcuts taken in the prototype
- What to tackle next

Think of CLAUDE.md as the living source of truth for any Claude session that
picks this project up. It should be good enough that a new session can read it
and immediately understand what exists, how it works, and how to extend it
without asking questions.

Also maintain:
- /docs/ARCHITECTURE.md — component structure, routing, data flow
- /docs/DATA.md — fixture structure, MSW handler map, how to add new mock data
- /docs/PAX.md — which Pax components and tokens are used where, any gotchas

═══════════════════════════════════════════════════════════
STACK
═══════════════════════════════════════════════════════════

- React 18 + Vite 5 (JSX, no TypeScript)
- React Router v7 (SPA, client-side routing, createBrowserRouter)
- @paystack/pax 2.0.0 — design system (Tailwind v4 via @tailwindcss/vite)
- Mock Service Worker (msw) v2 — API simulation
- Recharts v3 — charts/sparklines
- lucide-react — ALL icons. Never write inline SVG. Always import from lucide-react.
  Usage: import { X, Check, ChevronDown, ArrowLeft, Info } from 'lucide-react'
  Sizing: width/height props (e.g. width={16} height={16}), strokeWidth prop for weight.

Key: Pax uses Tailwind v4. No tailwind.config.js needed. Tokens are defined
in @paystack/pax/dist/theme.css, imported in src/index.css via relative path
(not package name — see PAX SETUP GOTCHA below).

═══════════════════════════════════════════════════════════
PAX SETUP GOTCHA
═══════════════════════════════════════════════════════════

@paystack/pax/dist/theme.css cannot be imported as:
  @import "@paystack/pax/dist/theme.css"  ← FAILS (missing "style" export condition)

Must be imported as:
  @import "../node_modules/@paystack/pax/dist/theme.css"  ← WORKS

This is in src/index.css. Do not change this without verifying the Pax
package.json exports field has been updated.

═══════════════════════════════════════════════════════════
PAX COMPONENTS USED
═══════════════════════════════════════════════════════════

- Skeleton — loading shimmer in every data-fetching view
- Select, SelectTrigger, SelectValue, SelectContent, SelectItem — Transactions filter bar
  (imported from '@paystack/pax' — exposes all components from the main index)

Pax tokens used throughout (via Tailwind classes):
- Colors: navy-*, cerulean-*, stack-green-*, gray-*, red-*, amber-*, purple-*
- All defined in theme.css, available as bg-navy-100, text-cerulean-700, etc.

═══════════════════════════════════════════════════════════
ARCHITECTURE
═══════════════════════════════════════════════════════════

src/
  components/
    layout/
      Sidebar.jsx       ← Fixed left nav, wordmark, merchant identity at bottom
      TopBar.jsx        ← Test/Live pill toggle, amber banner in test mode
      AppShell.jsx      ← Layout route: Sidebar + TopBar + <Outlet />
      DetailPanel.jsx   ← Reusable slide-in panel (width animation, table reflows)
    ui/
      Badge.jsx         ← Semantic color mapping for status/type values
      CopyButton.jsx    ← Copy-to-clipboard with tick confirmation
      EmptyState.jsx    ← Empty filter results + clear action
      ErrorState.jsx    ← Fetch error + retry button
      Sparkline.jsx     ← Recharts AreaChart wrapper (Overview only)
      StatCard.jsx      ← Balance/metric cards (Overview only)
      Timeline.jsx      ← Vertical stepper for transaction timeline
  pages/
    Overview.jsx        ← Balance card + sparkline + quick actions + recent txns + accounts
    Transactions.jsx    ← Filter bar + table + detail panel + pagination
    Accounts.jsx        ← Summary banner + table + detail panel with recent activity
    Customers.jsx       ← Table + detail panel
    ApiKey.jsx          ← Masked key card
    Webhooks.jsx        ← Endpoint list + inline add form
  mocks/
    fixtures/
      transactions.js   ← 30 live records (first 12 match spec exactly)
      accounts.js       ← 4 accounts (2 on-chain USDC, 2 fiat USD)
      customers.js      ← 5 customers (NG, KE, ZA, GH)
      webhooks.js       ← 2 endpoints
      testFixtures.js   ← Sparse test data (5 txns, 2 accounts, 2 customers)
    handlers.js         ← MSW route handlers (pagination, filtering, 150-300ms latency)
    browser.js          ← setupWorker(handlers)
  context/
    ModeContext.jsx     ← { mode, setMode, isTestMode } — useMode() hook
  hooks/
    useTransactions.js  ← useTransactions({ page, limit, status, type }) + useTransaction(id)
    useAccounts.js      ← useAccounts() + useAccount(id)
    useCustomers.js     ← useCustomers() + useCustomer(id)
  lib/
    format.js           ← formatUSDC, formatAmount, formatDatetime, formatDate, formatRelative
  App.jsx               ← createBrowserRouter + ModeProvider
  main.jsx              ← MSW bootstrap → createRoot

Routing:
  /                  → Overview
  /transactions      → Transactions
  /accounts          → Accounts
  /customers         → Customers
  /settings/api-key  → ApiKey
  /settings/webhooks → Webhooks

═══════════════════════════════════════════════════════════
HOW TEST/LIVE MODE WORKS
═══════════════════════════════════════════════════════════

1. ModeContext stores { mode: 'live' | 'test' }
2. TopBar toggle calls setMode()
3. Every custom hook (useTransactions, useAccounts, useCustomers) reads mode
   from useMode() and appends ?mode=test or ?mode=live to every fetch
4. MSW handlers read the ?mode= param and return either live fixtures or
   testFixtures (sparse data, test names/IDs)
5. Test mode shows amber banner + amber-styled toggle
6. No component other than hooks needs to know about mode switching

═══════════════════════════════════════════════════════════
DATA ARCHITECTURE
═══════════════════════════════════════════════════════════

Structure:
  src/mocks/
    fixtures/
      transactions.js   ← actual data arrays
      accounts.js
      customers.js
      webhooks.js
      testFixtures.js   ← sparse test data
    handlers.js         ← MSW route handlers
    browser.js          ← MSW service worker setup

MSW API surface:
  GET /api/transactions          ?page=1&limit=12&status=&type=&mode=live
  GET /api/transactions/:id      ?mode=live
  GET /api/accounts              ?mode=live
  GET /api/accounts/:id          ?mode=live
  GET /api/customers             ?mode=live
  GET /api/customers/:id         ?mode=live
  GET /api/api-key
  GET /api/webhooks
  POST /api/webhooks             (returns 201, no real logic)
  DELETE /api/webhooks/:id       (returns 204)

Pagination response shape:
  { data: [...], meta: { total, page, limit, totalPages } }

To add new mock data:
  1. Add records to the relevant fixture file
  2. Handlers already read from the fixture arrays — no handler changes needed
  3. For test mode: add corresponding records to testFixtures.js

═══════════════════════════════════════════════════════════
PUSH PANEL SYSTEM
═══════════════════════════════════════════════════════════

The panel renders at AppShell level — a flex sibling of <main>, not inside pages.
This means it pushes the entire content area, not just the table.

State:
- PanelContext stores { type: null|'transaction'|'account'|'customer', id: null|string }
- Pages call openPanel(type, id) via usePanelContext() — no selectedId in pages
- AppShell closes the panel on route change via useEffect on location.pathname

Components:
- GlobalPanel.jsx — the panel shell. Width: 0 → 420px animation. Reads PanelContext,
  fetches selected record by ID via useTransaction/useAccount/useCustomer hooks,
  renders TransactionDetail / AccountDetail / CustomerDetail based on type.
- DetailPanel.jsx — now only exports PanelSection and PanelRow (compound components
  for label/value layout inside panel content). Panel shell logic moved to GlobalPanel.

Column hiding when panel open:
- Transactions: Source column hidden (recoverable in panel)
- Accounts: no columns hidden
- Customers: Created column hidden (recoverable in panel Profile section)
  Horizontal scroll was rejected — creates competing vertical/horizontal scroll axes.

Animation: width 0 → 420px (not translateX). translateX doesn't remove flex space,
so the content area wouldn't reflow. Width is the correct mechanism for push layout.

═══════════════════════════════════════════════════════════
KNOWN LIMITATIONS / SHORTCUTS
═══════════════════════════════════════════════════════════

- Bundle is ~713KB unminified — normal for Pax (Radix UI) + Recharts.
  In prod: code-split per route with React.lazy()
- Accounts recent activity is derived from the live transactions fixture
  directly (not via API) to avoid a second fetch per panel open
- TRANSACTION_TOTAL is hardcoded at 847 (simulates large paginated dataset)
- Webhook Edit action is a visual stub — no form implemented
- Test mode webhook endpoint is the same as live (handlers.js doesn't
  filter webhooks by mode)
- formatRelative() uses Date.now() so relative times in fixtures appear old

═══════════════════════════════════════════════════════════
STACK (original spec preserved below)
═══════════════════════════════════════════════════════════

- React + Vite
- React Router v6 (SPA, client-side routing)
- @paystack/pax — the ONLY design system. Pax is built on Tailwind CSS and
  Shadcn/ui primitives. Use Pax's Tailwind config and its Shadcn-based
  components directly. Do NOT install a separate Tailwind instance or raw
  Shadcn on top of Pax. Pax owns all design decisions.
- Mock Service Worker (msw) — for realistic API simulation with loading states,
  working filters, and proper pagination behaviour
- Recharts — for charts and sparklines

Do NOT add: styled-components, Emotion, a second Tailwind install, raw Shadcn,
Bootstrap, or any other UI/styling system.

═══════════════════════════════════════════════════════════
VISUAL DIRECTION
═══════════════════════════════════════════════════════════

Target: Column.com meets Stripe Dashboard meets Mercury.
Refined, data-dense but breathable, high-trust fintech.

- Light sidebar (white/off-white, NOT dark)
- White content area, subtle 1px borders, minimal shadows
- Paystack brand colors via Pax tokens
- Status badges: small, pill-shaped, semantically colored, not loud
- Table rows: ~52px height, clear column hierarchy
- Muted secondary text beneath primary values in tables where useful
- Overall feeling: serious financial infrastructure for developers and
  treasury teams

═══════════════════════════════════════════════════════════
NAVIGATION
═══════════════════════════════════════════════════════════

Light sidebar, fixed left. Layout:

  [GlobalStack wordmark]
  [Merchant Dashboard label]

  MAIN
  ○ Overview
  ○ Transactions
  ○ Accounts
  ○ Customers

  ADMIN
  ○ API Key
  ○ Webhooks

  [bottom] AC  Acme Corp
               treasury@acme.com

MODE INDICATOR
The Live/Test pill lives in the Sidebar, inline-right of the GlobalStack
wordmark. Clicking it toggles mode. No separate TopBar component.

When in Test mode:
- Amber banner at the top of the main content area (full-width, above page padding):
  "You're viewing test data. No real transactions will be affected."
- Pill renders in amber styling

═══════════════════════════════════════════════════════════
VISUAL DENSITY SYSTEM (established Mar 18 2026)
═══════════════════════════════════════════════════════════

Target: Navattic-style analytics density — compact, information-dense,
not cramped. Reference image: /references/Navattic Web 145.png

Spacing rhythm:
- Between major sections on a page: 24px (space-y-6)
- Within cards (internal padding): 16px (p-4)
- Table header cells: px-4 py-2.5
- Table body cells: px-4 py-3
- Card section headers: px-4 py-3
- Between card rows: 8–12px (via divide-y, no extra padding)

Typography:
- Page headings: text-2xl font-medium (24px, weight 500) — not bold
- Section labels in cards: text-xs font-medium uppercase tracking-wide
- Table body text: text-sm (14px) for primary, text-xs (12px) for secondary
- ALWAYS use Pax type scale tokens (text-xs, text-sm, text-base, etc.)
  — never override with arbitrary pixel values like text-[13px]
- Balance/hero numbers: text-2xl font-semibold tabular-nums

Badge system:
- Small pills: text-xs, px-2 py-0.5, rounded-full, font-medium
- Semantic colors via Pax tokens:
  on-ramp/completed/active: feedback-success (green)
  off-ramp/business: fuschia (purple)
  deposit/processing: feedback-information (blue)
  withdrawal/pending: feedback-warning (amber)
  failed/rejected: feedback-danger (red)

Layout:
- Content area: max-w-[1200px] mx-auto, px-8 py-6 (in AppShell)
- Overview two-column: grid-cols-3, left col-span-2, right col-span-1
- Quick actions: compact outlined buttons (h-9), not card-sized

Live/Test pill:
- Small status chip: text-xs, px-3 py-1, rounded-full
- Green dot (1.5×1.5) in live mode, amber in test mode

═══════════════════════════════════════════════════════════
DO NOT
═══════════════════════════════════════════════════════════

- Do not write inline SVG — always use lucide-react icons instead
- Do not use a dark sidebar — explicitly changed to light
- Do not use modals for row detail — use the slide-in DetailPanel
- Do not import fonts from Google Fonts or external sources
- Do not install Tailwind separately — use Pax's Tailwind
- Do not install raw Shadcn — use what Pax exposes
- Do not make real API calls to any external service
- Do not build auth, login flows, or user management
- Do not add features not listed above — keep scope clean
- Do not leave CLAUDE.md stale — update it after every major piece of work

═══════════════════════════════════════════════════════════
WHAT TO TACKLE NEXT
═══════════════════════════════════════════════════════════

- Run dev server and verify all Step 23 + Step 24 changes render correctly in browser
- Verify Overview balance card toggle crossfades cleanly between merchant/customer states
- Verify "Send funds" from Overview + AccountDetail panel both open modal correctly
- Verify recipient panel opens on row click in /recipients
- Verify account number copy toast appears in AccountDetail panel
- Verify KYC tab TOS section shows "Accepted" badge for approved customers
- Verify "Expires in X days" appears for in-progress KYC states
- Consider: filter /transactions by recipientId to make "View all →" in recipient panel functional
- Consider: Add Audit Log entry for transfer.created events in the fixture
- Consider: Badge architecture — add a `context="kyc"` prop or separate KYC variant to avoid
  the children-override workaround needed for non-KYC `active` statuses

═══════════════════════════════════════════════════════════
DESIGN REFERENCES
═══════════════════════════════════════════════════════════

A /references folder exists in the project root. When a screenshot 
from it is attached to a message, use it as a visual reference — 
extract spacing, density, and typographic decisions only. Never copy 
colors, branding, or sidebar structure.