// Alert item derivation — shared between Overview (card) and GlobalPanel (NeedsAttentionPanel).
//
// buildAlertItems(navigate) returns a flat, priority-ordered list of operational problems
// derived synchronously from fixture imports. No API call, no async.
//
// Priority order:
//   1. Failed transactions  — highest urgency, money may be stuck
//   2. Webhook failures     — events silently dropped; developer concern
//   3. API errors           — integration broken; 401/500 need immediate attention
//   4. KYC blocked          — awaiting (needs operator input) before blocked/terminal
//   5. Stalled transactions — pending > 1hr, may indicate a rail stall
//
// Each item: { key, category, primary, mono, secondary, onView }
// Items do NOT carry a badge value — category headers provide sufficient context.
// Consumers decide whether to render badges (currently: none, by design).

import { transactions as allTxns }       from '../mocks/fixtures/transactions'
import { webhookDeliveries }             from '../mocks/fixtures/webhookDeliveries'
import { webhooks as webhookEndpoints }  from '../mocks/fixtures/webhooks'
import { customers }                     from '../mocks/fixtures/customers'
import { requestLog, REQUEST_LOG_ANCHOR } from '../mocks/fixtures/requestLog'
import { formatRelative }                from './format'

const AWAITING_KYC = new Set(['awaiting_ubo', 'awaiting_questionnaire'])
const BLOCKED_KYC  = new Set(['rejected', 'paused', 'offboarded'])
const ONE_HOUR_MS       = 60 * 60 * 1000
const TWENTY_FOUR_H_MS  = 24 * 60 * 60 * 1000

// Short status text for the secondary line in the API errors summary
const HTTP_STATUS_TEXT = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
}

export const KYC_BLOCKED_LABELS = {
  rejected:               'Rejected',
  paused:                 'Paused',
  offboarded:             'Offboarded',
  awaiting_ubo:           'Awaiting UBO',
  awaiting_questionnaire: 'Awaiting questionnaire',
}

export const ALERT_CATEGORY_LABELS = {
  failed_txn:  'Failed transactions',
  webhook:     'Webhook failures',
  api_error:   'API errors',
  kyc_blocked: 'KYC blocked',
  stalled_txn: 'Stalled transactions',
}

// navigate is passed in from the calling component's useNavigate() hook.
// onView for each item captures the navigate reference — when called, it
// pushes to the destination page with router state that pre-opens the detail panel.
// AppShell's route-change useEffect closes the GlobalPanel automatically on navigation.
export function buildAlertItems(navigate) {
  const items = []

  // ── 1. Failed transactions ─────────────────────────────────────────────────
  allTxns
    .filter(t => t.status === 'failed')
    .forEach(t => items.push({
      key:       t.id,
      category:  'failed_txn',
      primary:   t.id,
      mono:      true,
      secondary: `${t.corridor} · ${formatRelative(t.createdAt)}`,
      timestamp: t.createdAt,
      onView:    () => navigate('/transactions', { state: { openTransactionId: t.id } }),
    }))

  // ── 2. Webhook failures in last 24h ───────────────────────────────────────
  // Anchor to latest fixture delivery timestamp — prevents the 24h window from
  // eroding to zero as the prototype ages past the fixture dates.
  const anchorTs = webhookDeliveries.reduce(
    (max, d) => (d.timestamp > max ? d.timestamp : max), ''
  )
  const anchorMs = new Date(anchorTs).getTime()

  const failedByEndpoint = webhookDeliveries.reduce((acc, d) => {
    if (d.status !== 'failed') return acc
    if (anchorMs - new Date(d.timestamp).getTime() >= TWENTY_FOUR_H_MS) return acc
    if (!acc[d.endpointId]) acc[d.endpointId] = { count: 0, lastAt: '' }
    acc[d.endpointId].count++
    if (d.timestamp > acc[d.endpointId].lastAt) acc[d.endpointId].lastAt = d.timestamp
    return acc
  }, {})

  webhookEndpoints
    .filter(wh => failedByEndpoint[wh.id])
    .forEach(wh => {
      const { count, lastAt } = failedByEndpoint[wh.id]
      let displayUrl = wh.url
      try { const u = new URL(wh.url); displayUrl = u.host + u.pathname } catch {}
      items.push({
        key:       wh.id,
        category:  'webhook',
        primary:   displayUrl,
        mono:      false,
        secondary: `${count} failed · last ${formatRelative(lastAt)}`,
        timestamp: lastAt,
        onView:    () => navigate('/developer/webhooks', { state: { openWebhookId: wh.id } }),
      })
    })

  // ── 3. API errors today ────────────────────────────────────────────────────
  // Anchored to REQUEST_LOG_ANCHOR (2026-03-19) — "today" is a fixed concept
  // in the prototype, not tied to Date.now().
  // Surfaces as ONE summary item (aggregate count + last error), not per-request.
  // Why aggregate: the operator needs to know "there's a problem" and navigate
  // to the Request Log for the detail. Flooding the alert card with individual
  // HTTP errors would obscure the financial alerts above them.
  // Only shown if errors exist today — silence = clean.
  const todayErrors = requestLog.filter(
    (r) => r.timestamp.startsWith(REQUEST_LOG_ANCHOR) && r.statusCode >= 400,
  )
  if (todayErrors.length > 0) {
    const latest = todayErrors.reduce(
      (acc, r) => (r.timestamp > acc.timestamp ? r : acc),
      todayErrors[0],
    )
    const latestStatusText = HTTP_STATUS_TEXT[latest.statusCode] ?? String(latest.statusCode)
    items.push({
      key:       'api_errors_today',
      category:  'api_error',
      primary:   `${todayErrors.length} error${todayErrors.length !== 1 ? 's' : ''} today`,
      mono:      false,
      secondary: `Last: ${latest.statusCode} ${latestStatusText} · ${formatRelative(latest.timestamp)}`,
      timestamp: latest.timestamp,
      onView:    () => navigate('/developer/request-log', { state: { dateRange: 'last_24h' } }),
    })
  }

  // ── 4. KYC blocked customers ───────────────────────────────────────────────
  // Awaiting statuses first — these need active operator input to unblock.
  // Blocked/terminal after — need review but aren't always immediately actionable.
  customers
    .filter(c => AWAITING_KYC.has(c.kycStatus) || BLOCKED_KYC.has(c.kycStatus))
    .sort((a, b) => {
      const aW = AWAITING_KYC.has(a.kycStatus) ? 0 : 1
      const bW = AWAITING_KYC.has(b.kycStatus) ? 0 : 1
      return aW - bW
    })
    .forEach(c => items.push({
      key:       c.id,
      category:  'kyc_blocked',
      primary:   c.name,
      mono:      false,
      secondary: `${KYC_BLOCKED_LABELS[c.kycStatus]} · ${c.id}`,
      timestamp: c.createdAt,
      onView:    () => navigate('/customers', { state: { openCustomerId: c.id } }),
    }))

  // ── 5. Stalled transactions (pending > 1hr) ────────────────────────────────
  // Uses Date.now() — all fixture pending transactions are many days old vs the
  // fixture anchor dates, so they all surface. Intentional for the prototype.
  allTxns
    .filter(t => t.status === 'pending' && Date.now() - new Date(t.createdAt) > ONE_HOUR_MS)
    .forEach(t => items.push({
      key:       t.id,
      category:  'stalled_txn',
      primary:   t.id,
      mono:      true,
      secondary: `${t.corridor} · Pending ${formatRelative(t.createdAt)}`,
      timestamp: t.createdAt,
      onView:    () => navigate('/transactions', { state: { openTransactionId: t.id } }),
    }))

  // Sort by recency — most recently-relevant item first.
  // ISO strings compare correctly with localeCompare / string comparison.
  items.sort((a, b) => (b.timestamp ?? '') > (a.timestamp ?? '') ? 1 : -1)

  return items
}

// Group a flat item list by category, preserving insertion (priority) order.
// Object.entries() respects property insertion order in modern JS engines.
export function groupAlertItems(items) {
  return items.reduce((groups, item) => {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
    return groups
  }, {})
}
