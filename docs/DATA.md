# Data Architecture

## Fixture Files

All mock data lives in `src/mocks/fixtures/`. These are the single source of truth.

| File | Contents |
|------|----------|
| `transactions.js` | 37 live transactions — types: DEPOSIT/WITHDRAWAL/CONVERSION; statuses: pending/completed/failed/canceled/reversed; IDs use `tx_` prefix |
| `accounts.js` | ~40 accounts: 1 merchant (on-chain USDC), rest customer (Base/Solana/Ethereum on-chain + fiat) |
| `customers.js` | 10 customers covering all 9 KYC states (NG, KE, ZA, GH) |
| `recipients.js` | 13 recipients across 5 customers — mix of fiat (bank accounts) and crypto (wallets); 1 archived |
| `transfers.js` | 16 transfers across 5 customers — mix of statuses (COMPLETED/PENDING/FAILED/CANCELED) |
| `webhooks.js` | 2 webhook endpoints |
| `webhookDeliveries.js` | 36 delivery records across both endpoints (see below) |
| `apiKey.js` | Single API key record with extended usage metadata (see below) |
| `auditLog.js` | 47 audit log entries across 30 days, 3 actors (see below) |
| `testFixtures.js` | Sparse test data: 5 txns, 3 accounts (1 merchant + 2 customer), 2 customers |

## Recipients Fixture Schema (recipients.js)

13 recipients across 5 customers (John, Wanjiku, Cape Logistics, Kwame, TechPay).
One is archived (rec_006 — Equity Bank, Wanjiku Holdings) to demonstrate that state.

**Fiat recipient:**
```js
{
  id: 'rec_001',
  customerId: 'cus_a1b2c3',
  type: 'fiat',
  name: 'GTBank — John Adeyemi',
  accountOwnerName: 'John Adeyemi',
  accountNumber: '0124567890',       // full, only used for CopyButton
  accountNumberMasked: '012****890', // display value
  routingNumber: '021000021',
  bankName: 'GTBank',
  accountType: 'checking' | 'savings',
  rail: 'wire' | 'ach' | 'ach_same_day',
  status: 'active' | 'archived',
  createdAt: ISO string,
}
```

**Crypto recipient:**
```js
{
  id: 'rec_003',
  customerId: 'cus_a1b2c3',
  type: 'crypto',
  name: 'Solana Treasury — John Adeyemi',
  walletAddress: '7xKXtg2CW87d97...',   // full address for copy
  chain: 'solana' | 'ethereum' | 'base',
  rail: 'solana' | 'ethereum' | 'base', // matches chain
  status: 'active' | 'archived',
  createdAt: ISO string,
}
```

## Transfers Fixture Schema (transfers.js)

16 transfers. Mutated in-place by POST /api/transfers (new records prepended).

```js
{
  id: 'trf_001',
  customerId: 'cus_a1b2c3',
  sourceAccountId: 'acc_c02',              // from accounts.js (customer-owned)
  sourceAccountType: 'on_chain_account' | 'virtual_account',
  sourceCurrency: 'usdc' | 'usd',
  recipientId: 'rec_001',                  // from recipients.js
  recipientType: 'fiat' | 'crypto',
  destinationCurrency: 'usd' | 'usdc',
  paymentRail: 'ach' | 'wire' | 'ach_same_day' | 'solana' | 'ethereum' | 'base',
  amount: 5000,                            // in sourceCurrency units
  merchantReference: 'payroll-jan-w1',     // nullable
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED',
  createdAt: ISO string,
  completedAt: ISO string | null,          // set only when COMPLETED
}
```

## Relationship: customer → accounts + recipients → transfers

```
Customer (cus_xxx)
  ├── Accounts (acc_xxx) — GlobalStack-managed balances, source of funds
  │     (on_chain_account: USDC wallets on Base/Solana/Ethereum)
  │     (virtual_account: USD bank accounts via Lead Bank)
  │
  ├── Recipients (rec_xxx) — External payout destinations
  │     (fiat: GTBank account#, routing#, rail)
  │     (crypto: wallet address, chain, rail)
  │
  └── Transfers (trf_xxx) — Payouts from Account → Recipient
        (sourceAccountId links to Account)
        (recipientId links to Recipient)
```

The key distinction: Accounts are managed by GlobalStack (we track their balance,
we issued them). Recipients are third-party destinations the platform routes to
but does not control or custody.

## Webhook Deliveries Fixture Structure (webhookDeliveries.js)

36 records across 2 endpoints. Each delivery represents one outbound HTTP POST attempt.

**wh_01 (active primary — 27 deliveries):**
- 1 pending (most recent, ~2 min ago)
- 2 failed — consecutive burst clustered ~3.5 hrs ago (500 error + timeout)
- 24 delivered across the last 7 days

**wh_02 (inactive backup — 9 deliveries):**
- All delivered, no failures
- Older timestamps (1–12 days ago) — backup endpoint deprioritised

**Delivery record shape:**

```js
{
  id: 'whdel_01_001',          // unique delivery ID
  endpointId: 'wh_01',         // which endpoint received (or attempted) this
  eventType: 'CONVERSION',     // CONVERSION | TRANSFER | INDEXED_DEPOSIT
  eventId: 'tx_7f3a01abc',     // the transaction/event that triggered this delivery (tx_ prefix)
  status: 'delivered',         // delivered | failed | pending
  attempts: 1,                 // number of attempts before giving up (1–3)
  statusCode: 200,             // HTTP response code: 200, 404, 500, 'timeout', or null
  duration: 143,               // response time in ms, or null for failure/pending
  timestamp: '2026-03-19T13:57:00Z',
  payload: { ... },            // truncated JSON preview (~8 fields)
}
```

**`statusCode` conventions:**
- `200` — delivered successfully
- `500` — server-side error from the endpoint handler
- `'timeout'` — string literal (not integer) — endpoint didn't respond in time
- `null` — pending, no response received yet

**Payload templates by event type:**
- `CONVERSION`: event, id, corridor, amount, currency, rate, sourceAmount, sourceCurrency, settledAt
- `TRANSFER`: event, id, amount, currency, destination, chain, txHash, settledAt
- `INDEXED_DEPOSIT`: event, id, amount, currency, method, account, reference, indexedAt

**Note on failure clustering:** The 2 failures in wh_01 are placed at 10:23 and 10:31 AM —
consecutive events during a transient downstream deploy issue. This is realistic; webhook
failures tend to come in bursts when an endpoint is unhealthy, not randomly distributed.

**Adding new deliveries:**
1. Add records to `webhookDeliveries.js` following the shape above
2. No handler changes needed — the handler filters from the full array by `endpointId`
3. The `deliverySummary` in webhook list/detail responses is computed dynamically,
   so new failures will automatically appear in the failed count and callout banner

## API Key Fixture Structure (apiKey.js)

Single record — merchants have one live secret key:

| Field | Value | Notes |
|-------|-------|-------|
| `id` | `key_01HXYZ1234567890` | Key identifier |
| `key` | `sk_live_••••••••••••••••••••••••••••••••` | Masked display value |
| `status` | `active` | Drives the Badge on the key card |
| `created` | `2026-01-15T00:00:00Z` | ISO string, formatted with `formatDate()` |
| `lastUsed` | `2026-03-19T13:47:00Z` | ISO string, formatted with `formatDatetime()` — consistent with 143 requests today |
| `lastIp` | `41.190.3.xxx` | Originating IP of last call — security audit signal |
| `totalRequests` | `12847` | Lifetime request count |
| `requestsToday` | `143` | Partial count (today not complete) |
| `errorsToday` | `2` | Red if > 0, muted gray if 0 on the Usage card |
| `permissions` | `[...]` | Array of granted permission strings |
| `requestVolume` | `[843, 921, 1102, 987, 1243, 1891, 143]` | Last 7 days (index 6 = today) |

**`permissions` granted (5):** transactions:read, transactions:write, accounts:read,
accounts:write, customers:read — realistic operator scope: full transaction + account access,
customer read-only, no webhook management. Produces a 5-granted / 3-denied two-column layout.

**`permissions` denied (3, derived):** customers:write, webhooks:read, webhooks:write — derived
at render time by diffing `permissions` against `ALL_PERMISSIONS` constant in ApiKey.jsx.
Not stored in the fixture. Denied column uses muted gray (not red) — absence is intentional
scope, not an error.

**`requestVolume`:** 7 integers, index 0 = 7 days ago, index 6 = today. Today's count is
partial — it feeds the amber dot on the sparkline's last data point.

## Accounts Fixture Structure (accounts.js)

**1 merchant account:**
- `acc_01` — Primary Wallet (on-chain USDC, Base) — 98,200 USDC

**All accounts now have:**
- `asOf: '<ISO timestamp>'` — balance freshness timestamp, shown in panel + Accounts banner
- `chain: 'base' | 'solana' | 'ethereum'` — lowercase (on-chain accounts only)
- On-chain accounts: `address` (full), `addressShort` (truncated)
- Fiat accounts: `bankName`, `accountName`, `accountNumber` (full), `routingNumber`, `status: 'open'|'deactivated'|'closed'`, `addressShort` (masked: "Lead Bank 412****8903")

**Customer accounts:**

| Customer (ID) | Notable accounts |
|---------------|-----------------|
| John Adeyemi (`cus_a1b2c3`) | acc_c01–c07: Savings 87,200 USDC, Primary 24,500 USDC; + acc_c_sol01 (Solana, 5,800 USDC) |
| Wanjiku Holdings (`cus_b2c3d4`) | acc_c08–c14: Operations 156,000 USDC (largest), Reserve 72,000 USDC; + acc_c_sol02 (Solana, 25,000 USDC) |
| Cape Logistics Ltd (`cus_c3d4e5`) | acc_c15–c21: KYC under_review — most accounts at low balance. acc_c19 status=deactivated |
| Kwame Asante (`cus_d4e5f6`) | acc_c22–c28: Savings 19,400 USDC, Payroll 12,300 USDC; + acc_c_eth01 (Ethereum, 4,100 USDC) |
| TechPay Solutions (`cus_e5f6g7`) | acc_c29–c35: KYC rejected — mostly zero. acc_c33 status=closed |
| Emeka Okafor (`cus_f6g7h8`) | acc_c36: not_started KYC — no balance |
| Amara Mensah (`cus_g7h8i9`) | acc_c37: incomplete KYC |
| Priya Capital Ltd (`cus_h8i9j0`) | acc_c38: awaiting_questionnaire |
| Delta Freight Co (`cus_i9j0k1`) | acc_c39: paused |
| MobiPay Ltd (`cus_j0k1l2`) | acc_c40–c41: offboarded |

**Customer ID format:** `cus_` (not `cust_`) everywhere in fixtures, hooks, and the audit log fixture.

## Transaction Fixture Schema (transactions.js)

**Type values:** `'deposit'` | `'withdrawal'` | `'conversion'` — on-ramp and off-ramp are
not types; they are directions of a conversion communicated via the `corridor` field.

**Status values:** `'pending'` | `'completed'` | `'failed'` | `'canceled'` | `'reversed'`
(no `processing` — the API has no such state)

**ID format:** `tx_` prefix with 3 extra alphanumeric characters appended (e.g. `tx_7f3a01abc`).
The extra chars distinguish IDs that share a common prefix and make them visually distinct
from UUIDs or sequential integers.

**New fields added (data model alignment):**

| Field | Type | Notes |
|-------|------|-------|
| `merchant_reference` | string \| null | Operator-supplied reference. Null for system-generated transactions. |
| `onChainTxHash` | string \| null | 64-char hex hash. Present on: all deposits/withdrawals; completed fiat→USDC conversions. Null for fiat-only flows. |
| `chain` | string | Lowercase: `'base'`, `'solana'`, `'ethereum'` |
| `customerId` | string | `cus_` prefix (not `cust_`) |

**Which transactions have `onChainTxHash`:**
All deposit and withdrawal records, plus 9 completed fiat→USDC conversions:
`tx_7f3a01abc`, `tx_c6g706pqr`, `tx_i2md12ef4`, `tx_j3ne13gh5`, `tx_m6qh16mn8`,
`tx_o8sj18qr0`, `tx_r1vm21wx3`, `tx_t3xo23ab5`, `tx_y8ct28kl0`

**Panel display:**
- "References" section: transaction ID (mono + copy) + merchant_reference (mono + copy, or "—")
  + onChainTxHash (truncated + copy + "View on explorer ↗" link) — consolidated into one section
- The "On-chain" section was merged into References to reduce panel scrolling
- Explorer URLs: Base → basescan.org, Solana → solscan.io, Ethereum → etherscan.io
- Canceled transactions show `cancelReason` in a subtle note block
- Reversed transactions show a note block explaining the reversal

## Customer Fixture Schema (customers.js)

**ID format:** `cus_` prefix (e.g. `cus_a1b2c3`) — not `cust_`.

**9 KYC states:**

| State | Group | Operator action |
|-------|-------|----------------|
| `not_started` | Incomplete | Share KYC link — customer hasn't begun |
| `incomplete` | Incomplete | Share KYC link — customer started but didn't finish |
| `awaiting_questionnaire` | Incomplete | Share KYC link — questionnaire not yet submitted |
| `awaiting_ubo` | Incomplete | Share KYC link — UBO declaration outstanding |
| `under_review` | Active | No action — compliance team reviewing |
| `active` | Active | No action — fully approved (displays as "Approved") |
| `rejected` | Blocked | Compliance decision — cannot be undone by operator |
| `paused` | Blocked | Contact compliance team |
| `offboarded` | Blocked | Customer relationship ended |

**New fields:**

| Field | Type | Notes |
|-------|------|-------|
| `tosStatus` | boolean | Whether customer has accepted Terms of Service |
| `tosLink` | string | Link to share with customer to accept TOS |
| `kycLink` | string | Link to share with customer to resume/start KYC |
| `kycLinkExpiresAt` | ISO string | Expiry date for the KYC link — 30 days from `createdAt`. Used to show "Expires in X days" in the KYC tab. |
| `country` | string \| null | ISO 3166-1 alpha-2 code. KYC-sourced — may be `null` for customers who haven't started KYC (`not_started` state). Panel shows "—" when absent. |
| `balance` | number | USDC balance (sum of USDC accounts — kept in sync with accounts.js) |

**Panel KYC tab:**
- Shows state-specific guidance + copyable KYC link (for Incomplete group)
- "Expires in X days" shown below the KYC link: amber ≤7 days, red if expired
- TOS Status section always shown:
  - `tosStatus === true`: green "Accepted" badge + eligibility note
  - `tosStatus === false`: amber warning block + copy TOS link

## MSW Handler Map

All handlers are in `src/mocks/handlers.js`. Every request gets 150–300ms of simulated latency.

| Route | Handler behaviour |
|-------|-------------------|
| `GET /api/transactions` | Filters by ?status, ?type; paginates by ?page & ?limit; reports total=847 for live unfiltered |
| `GET /api/transactions/:id` | Returns single record or 404 |
| `GET /api/accounts` | Full filter/sort/paginate support — see params below |
| `GET /api/accounts/:id` | Returns single account or 404 |
| `GET /api/customers` | Returns customers filtered by `?kycStatus=` (exact match) |
| `GET /api/customers/:id` | Returns single customer or 404 |
| `GET /api/api-key` | Returns full apiKey fixture: key, status, created, lastUsed, lastIp, usage stats, permissions[], requestVolume[] |
| `GET /api/webhooks` | Returns webhook list with `deliverySummary` per endpoint (total, failed, lastAt) computed server-side from deliveries fixture |
| `GET /api/webhooks/:id` | Returns single endpoint with `deliverySummary` — used by GlobalPanel |
| `GET /api/webhooks/:id/deliveries` | Paginated delivery log, newest-first. Params: `?page=1&limit=15` |
| `POST /api/webhooks` | Returns 201 (no logic) |
| `DELETE /api/webhooks/:id` | Returns 204 |

### GET /api/accounts — query params

| Param | Values | Default | Notes |
|-------|--------|---------|-------|
| `mode` | `live` \| `test` | `live` | Selects fixture dataset |
| `owner` | `merchant` \| `customer` | (all) | Filter by ownership layer |
| `search` | string | (none) | Substring match on label, addressShort, customer name |
| `type` | `on-chain` \| `fiat` | (all) | Filter by account type |
| `currency` | `USDC` \| `USD` | (all) | Filter by currency |
| `sort` | `balance_desc` \| `balance_asc` | `balance_desc` | Applied before pagination |
| `page` | integer | `1` | 1-indexed |
| `limit` | integer | `1000` | Default 1000 = "fetch all" (backward compat for old callers) |

**Sort order matters**: sort is applied to the full filtered dataset before slicing the page.
This ensures page 2 is always a continuation of page 1's sort order, not independently sorted.

## Hooks

| Hook | Usage |
|------|-------|
| `useAccounts({ owner? })` | Fetches all accounts (or filtered by owner) without pagination. Used by Overview + Accounts banner. Old callers: `useAccounts()` with no args still works. |
| `useCustomerAccounts({ page, limit, search, type, sort })` | Paginated customer accounts for the Accounts page flat table. Returns `{ data, meta, loading, error, refetch }`. |
| `useAccount(id)` | Single account by ID. Used by GlobalPanel. |

## Adding New Data

1. Add records to the relevant fixture file (e.g. `customers.js`)
2. No handler changes needed — handlers read from the array directly
3. For test-mode equivalents, add to `testFixtures.js`
4. For new accounts: follow the `acc_cXX` ID pattern; set `owner`, `customerId`, `customer` fields

## Pagination Response Shape

```json
{
  "data": [...],
  "meta": {
    "total": 35,
    "page": 1,
    "limit": 15,
    "totalPages": 3
  }
}
```

The accounts handler always returns `meta` now (was previously omitted). Old callers that
only read `json.data` are unaffected — adding meta is non-breaking.

## Customer Panel Relational Fields

The CustomerPanel Accounts and Transactions tabs filter directly from fixtures client-side
(no extra API calls). This requires two relational fields:

**`accounts.customerId`** — present on every customer-owned account. Links an account to
its owning customer. Populated for all `acc_c01`–`acc_c35`. Merchant account (`acc_01`)
has `customerId: null`.

**`transactions.customerId`** — present on every transaction. Links a transaction to the
customer whose accounts were involved. Used by the Transactions tab to show recent
activity for a specific customer.

These fields are necessary for client-side filtering because the MSW endpoints don't
support a `?customerId=` query param — adding one would be easy if the volume grew.

## Customer → Customers Page Link Pattern

The Customer column in the Accounts table navigates to `/customers` with a pre-opened panel:

```js
navigate('/customers', { state: { openCustomerId: 'cust_xyz' } })
```

The Customers page reads this in a `useEffect`:

```js
const location = useLocation()
useEffect(() => {
  const id = location.state?.openCustomerId
  if (id) openPanel('customer', id)
}, [location.state?.openCustomerId])
```

Why router state instead of a URL param:
- Panel open is ephemeral UI state — it shouldn't be in the URL, survive refresh, or be shareable
- Router state is delivered once on navigation and not re-delivered on subsequent renders
- This pattern can be reused anywhere a cross-page panel-open is needed

## Test Mode

Handlers check `?mode=test` and return sparse test fixtures instead of live data.
The total for test transactions is `TEST_TRANSACTION_TOTAL = 5` (no fake large dataset).
Test accounts use the `testAccounts` array (3 accounts: 1 merchant, 2 customer).

## Account Ownership

Every account has an `owner` field: `'merchant'` or `'customer'`.

- **Merchant** accounts are Acme Corp's own operational treasury
- **Customer** accounts are held in custody for end-users

The two balances must never be combined in the UI. The MSW handler supports
`?owner=merchant` or `?owner=customer` to filter server-side.

## Audit Log Fixture Structure (auditLog.js)

47 entries spanning the last 30 days. Activity is clustered realistically: business hours
(08:00–17:00 UTC), Mondays and Fridays busier, no overnight events.

**Three actors:**

| Name | Role | IP |
|------|------|----|
| Tolu Adeyinka | Admin | 41.190.3.xxx |
| Amara Osei | Developer | 197.210.54.xxx |
| Chisom Eze | Finance | 105.112.22.xxx |

**Action type taxonomy:**

| Action | Category | Description |
|--------|----------|-------------|
| `customer.created` | customer | New customer record created |
| `customer.kyc_approved` | customer | KYC status moved to approved |
| `customer.kyc_rejected` | customer | KYC status moved to rejected |
| `webhook.created` | webhook | New endpoint added |
| `webhook.deleted` | webhook | Endpoint removed |
| `webhook.updated` | webhook | Endpoint edited (events field) |
| `api_key.viewed` | api_key | Viewed API key page (passive — visited the settings page) |
| `api_key.copied` | api_key | Copied API key (active — extracted value to clipboard) |
| `account.created` | account | New account created for a customer |
| `dashboard.login` | login | User signed in to dashboard |

**Audit log entry shape:**

```js
{
  id: 'aud_001',
  actor: { name, email, role, ip },
  action: 'customer.kyc_approved',
  target: { type: 'customer', id: 'cust_xyz', label: 'Wanjiku Holdings' },
  metadata: { from: 'pending', to: 'approved' },
  ip: '41.190.3.xxx',
  timestamp: '2026-03-19T09:47:15Z',
}
```

**MSW handler — `GET /api/audit-log`:**

| Param | Values | Default | Notes |
|-------|--------|---------|-------|
| `page` | integer | `1` | 1-indexed |
| `limit` | integer | `20` | 20 per page — audit logs are read carefully |
| `action` | `customer\|webhook\|api_key\|account\|login` | (all) | Category filter |
| `actor` | actor name string | (all) | Exact match on actor.name |
| `dateRange` | `last_7\|last_30\|last_90` | `last_30` | Anchored to 2026-03-19 |

**No mode switching**: audit logs are not filtered by test/live. Compliance records
represent real operator actions and are not suppressed in test mode.

## Why 847?

`TRANSACTION_TOTAL = 847` is exported from `transactions.js` and used by the
`GET /api/transactions` handler when returning unfiltered live results. This simulates
a real merchant's transaction history. When filters are applied, the handler reports
the actual filtered count from the local fixture array.
