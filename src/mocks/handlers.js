import { http, HttpResponse, delay } from 'msw'
import { transactions, TRANSACTION_TOTAL } from './fixtures/transactions'
import { accounts } from './fixtures/accounts'
import { customers } from './fixtures/customers'
import { webhooks } from './fixtures/webhooks'
import { webhookDeliveries } from './fixtures/webhookDeliveries'
import { apiKey } from './fixtures/apiKey'
import { auditLog } from './fixtures/auditLog'
import { recipients } from './fixtures/recipients'
import { team } from './fixtures/team'
import { transfers } from './fixtures/transfers'
import { requestLog, REQUEST_LOG_ANCHOR } from './fixtures/requestLog'
import {
  testTransactions,
  testAccounts,
  testCustomers,
  TEST_TRANSACTION_TOTAL,
} from './fixtures/testFixtures'

// Simulated API latency — keeps loading states visible and testable
const LATENCY = { min: 150, max: 300 }

async function randomDelay() {
  const ms = Math.random() * (LATENCY.max - LATENCY.min) + LATENCY.min
  await delay(ms)
}

// Helper: determine which dataset to use based on ?mode= query param
function getDataset(url, liveData, testData) {
  const mode = new URL(url).searchParams.get('mode')
  return mode === 'test' ? testData : liveData
}

export const handlers = [
  // ── Transactions ────────────────────────────────────────────────────────────
  http.get('/api/transactions', async ({ request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '10', 10)
    const cursor = url.searchParams.get('cursor') ?? ''
    const status = url.searchParams.get('status') ?? ''
    const type = url.searchParams.get('type') ?? ''
    const accountId = url.searchParams.get('accountId') ?? ''
    const recipientId = url.searchParams.get('recipientId') ?? ''
    const mode = url.searchParams.get('mode') ?? 'live'

    const allTxns = mode === 'test' ? testTransactions : transactions
    const simulatedTotal = mode === 'test' ? TEST_TRANSACTION_TOTAL : TRANSACTION_TOTAL

    let filtered = allTxns

    if (status) {
      filtered = filtered.filter((t) => t.status === status)
    }
    if (type) {
      filtered = filtered.filter((t) => t.type === type)
    }
    // accountId filter: matches transactions where this account is either source or destination.
    // Used by the Transactions page when navigated to from an account panel ("View all →").
    if (accountId) {
      filtered = filtered.filter(
        (t) => t.sourceAccountId === accountId || t.destinationAccount === accountId,
      )
    }
    // recipientId filter: joins through the transfers fixture — finds all source accounts
    // that have sent to this recipient, then returns transactions from those accounts.
    if (recipientId) {
      const recipientAccountIds = new Set(
        transfers.filter((tf) => tf.recipientId === recipientId).map((tf) => tf.sourceAccountId),
      )
      filtered = filtered.filter((t) => recipientAccountIds.has(t.sourceAccountId))
    }

    // Cursor-based slicing: find the cursor item, then take the next `limit` records.
    // Cursor is the ID of the last item on the previous page.
    // If no cursor, start from the beginning.
    let start = 0
    if (cursor) {
      const idx = filtered.findIndex((t) => t.id === cursor)
      start = idx >= 0 ? idx + 1 : 0
    }

    const pageData = filtered.slice(start, start + limit)
    // nextCursor is the ID of the last item returned — sent back to the client
    // so it can request the next page without knowing page numbers.
    const nextCursor = pageData.length === limit ? pageData[pageData.length - 1].id : null
    const hasPrev = start > 0
    const hasNext = nextCursor !== null

    // When filters are active, report the actual filtered count.
    // When unfiltered in live mode, report the simulated large total (847).
    const reportedTotal = status || type || accountId || recipientId ? filtered.length : simulatedTotal

    return HttpResponse.json({
      data: pageData,
      meta: {
        total: reportedTotal,
        nextCursor,
        hasNext,
        hasPrev,
        limit,
      },
    })
  }),

  http.get('/api/transactions/:id', async ({ params, request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? 'live'
    const allTxns = mode === 'test' ? testTransactions : transactions

    const txn = allTxns.find((t) => t.id === params.id)
    if (!txn) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(txn)
  }),

  // ── Accounts ────────────────────────────────────────────────────────────────
  //
  // Supports:
  //   ?owner=merchant|customer        — filter by ownership layer
  //   ?search=                        — substring on label, addressShort, customer name
  //   ?type=on-chain|fiat             — filter by account type
  //   ?currency=USDC|USD              — filter by currency
  //   ?sort=balance_desc|balance_asc  — sort order (default: balance_desc)
  //   ?page=1&limit=15                — pagination (default limit=1000 = "all")
  //
  // Always returns { data, meta }. Old callers (useAccounts) only read json.data
  // so adding meta is non-breaking.
  http.get('/api/accounts', async ({ request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? 'live'
    const owner = url.searchParams.get('owner') ?? ''
    const search = (url.searchParams.get('search') ?? '').toLowerCase().trim()
    const type = url.searchParams.get('type') ?? ''
    const currency = url.searchParams.get('currency') ?? ''
    const sort = url.searchParams.get('sort') ?? 'balance_desc'
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    // Default to 1000 so callers that omit limit get all records (backward compat)
    const limit = parseInt(url.searchParams.get('limit') ?? '1000', 10)

    let data = mode === 'test' ? testAccounts : accounts

    if (owner) data = data.filter((a) => a.owner === owner)
    if (type) data = data.filter((a) => a.type === type)
    if (currency) data = data.filter((a) => a.currency === currency)
    if (search) {
      data = data.filter(
        (a) =>
          a.label.toLowerCase().includes(search) ||
          a.addressShort.toLowerCase().includes(search) ||
          (a.customer && a.customer.toLowerCase().includes(search)),
      )
    }

    // Sort before paginating — sort must operate on the full filtered set,
    // not just the current page, or page 2 would be sorted independently
    if (sort === 'balance_asc') {
      data = [...data].sort((a, b) => a.balance - b.balance)
    } else {
      // balance_desc default: highest balance first, most useful for an operator
      // monitoring concentration risk across the book
      data = [...data].sort((a, b) => b.balance - a.balance)
    }

    const total = data.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const pageData = data.slice(start, start + limit)

    return HttpResponse.json({
      data: pageData,
      meta: { total, page, limit, totalPages },
    })
  }),

  http.get('/api/accounts/:id', async ({ params, request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? 'live'
    const allAccounts = mode === 'test' ? testAccounts : accounts

    const account = allAccounts.find((a) => a.id === params.id)
    if (!account) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(account)
  }),

  // ── Customers ───────────────────────────────────────────────────────────────
  http.get('/api/customers', async ({ request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? 'live'
    const kycStatus = url.searchParams.get('kycStatus') ?? ''

    let data = mode === 'test' ? testCustomers : customers

    if (kycStatus) {
      data = data.filter((c) => c.kycStatus === kycStatus)
    }

    return HttpResponse.json({ data })
  }),

  http.get('/api/customers/:id', async ({ params, request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? 'live'
    const allCustomers = mode === 'test' ? testCustomers : customers

    const customer = allCustomers.find((c) => c.id === params.id)
    if (!customer) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(customer)
  }),

  // ── API Key ──────────────────────────────────────────────────────────────────
  http.get('/api/api-key', async () => {
    await randomDelay()
    return HttpResponse.json(apiKey)
  }),

  // ── Webhooks ─────────────────────────────────────────────────────────────────
  //
  // GET /api/webhooks augments each endpoint with a deliverySummary so the
  // list page can show "27 deliveries • 2 failed • last delivery 2 min ago"
  // without requiring N extra fetches from the UI.
  // Computing it here (server-side join) is the right pattern — the client
  // shouldn't be aggregating raw delivery records just to show a card summary.
  http.get('/api/webhooks', async () => {
    await randomDelay()

    const withSummary = webhooks.map((wh) => {
      const deliveries = webhookDeliveries.filter((d) => d.endpointId === wh.id)
      const failed = deliveries.filter((d) => d.status === 'failed').length
      // Most recent delivery by timestamp
      const sorted = [...deliveries].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      )
      const lastAt = sorted[0]?.timestamp ?? null

      return {
        ...wh,
        deliverySummary: { total: deliveries.length, failed, lastAt },
      }
    })

    return HttpResponse.json({ data: withSummary })
  }),

  // Single endpoint — used by the GlobalPanel to populate the panel header
  // and summary section without relying on state passed from the list page.
  http.get('/api/webhooks/:id', async ({ params }) => {
    await randomDelay()

    const wh = webhooks.find((w) => w.id === params.id)
    if (!wh) return new HttpResponse(null, { status: 404 })

    const deliveries = webhookDeliveries.filter((d) => d.endpointId === wh.id)
    const failed = deliveries.filter((d) => d.status === 'failed').length
    const sorted = [...deliveries].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    )
    const lastAt = sorted[0]?.timestamp ?? null

    return HttpResponse.json({
      ...wh,
      deliverySummary: { total: deliveries.length, failed, lastAt },
    })
  }),

  // Paginated delivery log for a single endpoint.
  // Deliveries are returned newest-first — operators want to see the most
  // recent activity at the top, not scroll to find it.
  http.get('/api/webhooks/:id/deliveries', async ({ params, request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const limit = parseInt(url.searchParams.get('limit') ?? '15', 10)

    const endpointDeliveries = webhookDeliveries
      .filter((d) => d.endpointId === params.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    const total = endpointDeliveries.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const pageData = endpointDeliveries.slice(start, start + limit)

    return HttpResponse.json({
      data: pageData,
      meta: { total, page, limit, totalPages },
    })
  }),

  http.post('/api/webhooks', async () => {
    await randomDelay()
    // No real logic — just return 201 Created
    return new HttpResponse(null, { status: 201 })
  }),

  http.delete('/api/webhooks/:id', async () => {
    await randomDelay()
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Recipients ───────────────────────────────────────────────────────────────
  //
  // Supports:
  //   ?customerId=cus_xxx     — filter by customer
  //   ?type=fiat|crypto       — filter by recipient type
  //   ?status=active|archived — filter by status (default: all)
  //   ?page=1&limit=15        — pagination
  //
  // Recipients are not mode-separated — they exist independently of
  // test/live transaction mode (same as audit logs).
  http.get('/api/recipients', async ({ request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId') ?? ''
    const type = url.searchParams.get('type') ?? ''
    const status = url.searchParams.get('status') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const limit = parseInt(url.searchParams.get('limit') ?? '15', 10)

    let data = [...recipients]

    if (customerId) data = data.filter((r) => r.customerId === customerId)
    if (type) data = data.filter((r) => r.type === type)
    if (status) data = data.filter((r) => r.status === status)

    const total = data.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const pageData = data.slice(start, start + limit)

    return HttpResponse.json({
      data: pageData,
      meta: { total, page, limit, totalPages },
    })
  }),

  http.get('/api/recipients/:id', async ({ params }) => {
    await randomDelay()

    const recipient = recipients.find((r) => r.id === params.id)
    if (!recipient) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(recipient)
  }),

  // ── Transfers ─────────────────────────────────────────────────────────────────
  //
  // Supports:
  //   ?customerId=cus_xxx                — filter by customer
  //   ?status=PENDING|COMPLETED|FAILED|CANCELED — filter by status
  //   ?page=1&limit=15                   — pagination
  //
  // POST /api/transfers — creates a new transfer in PENDING state.
  // Returns 201 with the new transfer object. The fixture array is mutated
  // directly so subsequent GETs include the new record (same pattern as
  // the audit log api_key.copied event).
  http.get('/api/transfers', async ({ request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId') ?? ''
    const status = url.searchParams.get('status') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const limit = parseInt(url.searchParams.get('limit') ?? '15', 10)

    let data = [...transfers].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )

    if (customerId) data = data.filter((t) => t.customerId === customerId)
    if (status) data = data.filter((t) => t.status === status)

    const total = data.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const pageData = data.slice(start, start + limit)

    return HttpResponse.json({
      data: pageData,
      meta: { total, page, limit, totalPages },
    })
  }),

  http.get('/api/transfers/:id', async ({ params }) => {
    await randomDelay()

    const transfer = transfers.find((t) => t.id === params.id)
    if (!transfer) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(transfer)
  }),

  http.post('/api/transfers', async ({ request }) => {
    await randomDelay()

    const body = await request.json()

    // Generate a realistic-looking transfer ID
    const id = 'trf_' + Math.random().toString(36).slice(2, 9)
    const newTransfer = {
      id,
      customerId: body.customerId ?? null,
      sourceAccountId: body.sourceAccountId ?? null,
      sourceAccountType: body.sourceAccountType ?? 'on_chain_account',
      sourceCurrency: body.sourceCurrency ?? 'usdc',
      recipientId: body.recipientId ?? null,
      recipientType: body.recipientType ?? 'fiat',
      destinationCurrency: body.destinationCurrency ?? 'usd',
      paymentRail: body.paymentRail ?? 'wire',
      amount: body.amount ?? 0,
      merchantReference: body.merchantReference ?? null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      completedAt: null,
    }

    // Mutate the fixture array so this transfer shows up in GET /api/transfers.
    // Unshift (prepend) so it appears first in newest-first ordering.
    transfers.unshift(newTransfer)

    return HttpResponse.json(newTransfer, { status: 201 })
  }),

  // ── Team ──────────────────────────────────────────────────────────────────────
  //
  // Returns all team members. No mode separation — team membership is real
  // operational data, not test data.
  //
  // Members are returned in a stable order: active members first (sorted by
  // joinedAt), then invited (pending acceptance), then suspended last.
  http.get('/api/team', async () => {
    await randomDelay()

    const STATUS_ORDER = { active: 0, invited: 1, suspended: 2 }
    const sorted = [...team].sort((a, b) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (statusDiff !== 0) return statusDiff
      // Within active: sort by joinedAt ascending (longest-serving first)
      if (a.joinedAt && b.joinedAt) {
        return new Date(a.joinedAt) - new Date(b.joinedAt)
      }
      return 0
    })

    return HttpResponse.json({ data: sorted, meta: { total: team.length } })
  }),

  // ── Audit Log ─────────────────────────────────────────────────────────────────
  //
  // Audit logs are always real — no test/live mode distinction.
  // Compliance records aren't suppressed in test mode.
  //
  // Supports:
  //   ?cursor=<last-seen-id>            (omit for first page)
  //   ?limit=20
  //   ?action=customer|webhook|api_key|account|login   (category filter)
  //   ?actor=Tolu+Adeyinka                              (filter by actor name)
  //   ?dateRange=last_7|last_30|last_90                 (defaults to last_30)
  //
  // Entries are always returned newest-first.
  http.get('/api/audit-log', async ({ request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor') ?? ''
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)
    const actionFilter = url.searchParams.get('action') ?? ''
    const actorFilter = url.searchParams.get('actor') ?? ''
    const dateRange = url.searchParams.get('dateRange') ?? 'last_30'

    // Date range cutoff — anchor to the fixture's "today" (2026-03-19)
    const ANCHOR = new Date('2026-03-19T23:59:59Z').getTime()
    const RANGE_DAYS = dateRange === 'last_7' ? 7 : dateRange === 'last_90' ? 90 : 30
    const cutoff = ANCHOR - RANGE_DAYS * 24 * 60 * 60 * 1000

    // Map category filter to action prefix/value
    const ACTION_CATEGORY_MAP = {
      customer: (a) => a.startsWith('customer.'),
      webhook: (a) => a.startsWith('webhook.'),
      api_key: (a) => a.startsWith('api_key.'),
      account: (a) => a.startsWith('account.'),
      login: (a) => a === 'dashboard.login',
    }

    let data = [...auditLog]

    // Filter by date range
    data = data.filter((e) => new Date(e.timestamp).getTime() >= cutoff)

    // Filter by action category
    if (actionFilter && ACTION_CATEGORY_MAP[actionFilter]) {
      data = data.filter((e) => ACTION_CATEGORY_MAP[actionFilter](e.action))
    }

    // Filter by actor name (exact match for dropdown use)
    if (actorFilter) {
      data = data.filter((e) => e.actor.name === actorFilter)
    }

    // Always newest-first
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // Cursor-based slicing: cursor = ID of last item on previous page.
    let start = 0
    if (cursor) {
      const idx = data.findIndex((e) => e.id === cursor)
      start = idx >= 0 ? idx + 1 : 0
    }

    const pageData = data.slice(start, start + limit)
    const nextCursor = pageData.length === limit ? pageData[pageData.length - 1].id : null
    const hasPrev = start > 0
    const hasNext = nextCursor !== null

    return HttpResponse.json({
      data: pageData,
      meta: { nextCursor, hasNext, hasPrev, limit },
    })
  }),

  // ── Request Log ───────────────────────────────────────────────────────────────
  //
  // Records every inbound API request made using the merchant's secret key.
  // Not mode-separated — requests happen regardless of which mode the dashboard
  // is in. The log is always the real record of what the integration called.
  //
  // Supports:
  //   ?page=1&limit=20
  //   ?method=GET|POST            — filter by HTTP method
  //   ?statusGroup=2xx|4xx|5xx   — filter by status code group
  //   ?endpoint=/fx/v1/...       — filter by endpoint template
  //   ?dateRange=last_24h|last_7|last_30  (defaults to last_7)
  //
  // Entries are returned newest-first.
  http.get('/api/request-log', async ({ request }) => {
    await randomDelay()

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)
    const method = url.searchParams.get('method') ?? ''
    const statusGroup = url.searchParams.get('statusGroup') ?? ''
    const endpoint = url.searchParams.get('endpoint') ?? ''
    const dateRange = url.searchParams.get('dateRange') ?? 'last_7'

    // Date range cutoff — anchored to fixture's "today" so it doesn't erode
    const ANCHOR = new Date(REQUEST_LOG_ANCHOR + 'T23:59:59Z').getTime()
    const RANGE_DAYS = dateRange === 'last_24h' ? 1 : dateRange === 'last_30' ? 30 : 7
    const cutoff = ANCHOR - RANGE_DAYS * 24 * 60 * 60 * 1000

    let data = [...requestLog].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    )

    // Date range filter
    data = data.filter((r) => new Date(r.timestamp).getTime() >= cutoff)

    // Method filter
    if (method) {
      data = data.filter((r) => r.method === method.toUpperCase())
    }

    // Status group filter — group 4xx catches 400, 401, 403, 404 etc.
    if (statusGroup) {
      if (statusGroup === '2xx') {
        data = data.filter((r) => r.statusCode >= 200 && r.statusCode < 300)
      } else if (statusGroup === '4xx') {
        data = data.filter((r) => r.statusCode >= 400 && r.statusCode < 500)
      } else if (statusGroup === '5xx') {
        data = data.filter((r) => r.statusCode >= 500 && r.statusCode < 600)
      }
    }

    // Endpoint template filter
    if (endpoint) {
      data = data.filter((r) => r.endpoint === endpoint)
    }

    const total = data.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const pageData = data.slice(start, start + limit)

    return HttpResponse.json({
      data: pageData,
      meta: { total, page, limit, totalPages },
    })
  }),

  // Single request log entry — used by the detail panel
  http.get('/api/request-log/:id', async ({ params }) => {
    await randomDelay()

    const entry = requestLog.find((r) => r.id === params.id)
    if (!entry) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(entry)
  }),
]
