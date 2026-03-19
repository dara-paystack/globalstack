// ApiKey page — developer-facing key management with security posture and usage context.
//
// Why not reuse the shared <CopyButton>?
// CopyButton is a self-contained atom — it owns its own "copied" tick state.
// This page needs a page-level toast triggered by the same copy action. We could
// add an `onCopy` callback prop to CopyButton, but that leaks page concerns into
// a shared component. Instead, we inline the copy + toast logic here. Same pattern
// as a form — you don't put submission logic inside a shared <Input> component.
//
// Why not reuse <Sparkline>?
// Sparkline is optimised for the compact balance trends on Overview: no axis, USDC
// label in tooltip, fixed height. The usage chart here needs an XAxis with day labels
// and a "Requests" tooltip. Forcing both needs into one component with conditionals
// is more complex than building the chart directly with Recharts, which is already
// our charting dependency.

import { useState, useEffect, useId, useRef } from 'react'
import { auditLog, actors } from '../mocks/fixtures/auditLog'
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton, Alert, AlertTitle, AlertDescription, AlertInformationIcon } from '@paystack/pax'
import { Badge } from '../components/ui/Badge'
import { formatDate, formatDatetime } from '../lib/format'

// The complete permission surface this key system supports.
// We use this to derive what the current key CANNOT do — the denied column.
//
// Why show denied permissions at all?
// A list of only granted permissions forces the reader to ask: "Is this everything
// this key can do, or just some of it?" That doubt sends people to support.
// Showing both columns makes the scope fully legible. "transactions:write is absent"
// is an immediate, self-service answer to "why is my POST /transactions returning 403?"
// It also reframes the absence as intentional restriction (good security) rather
// than a system limitation.
const ALL_PERMISSIONS = [
  'transactions:read',
  'transactions:write',
  'accounts:read',
  'accounts:write',
  'customers:read',
  'customers:write',
  'webhooks:read',
  'webhooks:write',
]

// Compute short day labels for the last 7 days, ending with "Today".
// Derived from the current date so the chart always reads correctly in the browser,
// not hardcoded strings that would become wrong the next day.
function getLast7DayLabels() {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return 'Today'
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return DAY_NAMES[d.getDay()]
  })
}

// Custom Recharts tooltip — labels the metric as "Requests" not "USDC".
// Recharts passes color as a CSS var via fill which can't be read as a hex —
// so the dot color is hardcoded to match the stroke color used on the <Area>.
function UsageTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-primary border border-border-primary-light rounded-xl px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-content-primary mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#009EFF' }} />
        <span className="text-xs text-content-tertiary">Requests</span>
        <span className="text-xs font-medium text-content-primary tabular-nums ml-1">
          {payload[0].value.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

export default function ApiKey() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastVisible, setToastVisible] = useState(false)
  // Counter for generating unique audit entry IDs within this session
  const copyCountRef = useRef(0)
  // Unique gradient ID — prevents SVG <defs> collisions if this component
  // ever renders more than once on the same page (e.g. in a tabbed layout)
  const gradientId = `api-spark-${useId().replace(/:/g, '')}`

  useEffect(() => {
    fetch('/api/api-key')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleCopy() {
    // We copy the masked display value, not the real key.
    // Operators who need the real key have it from the moment of creation.
    // Copying here gives visual confirmation that "something happened" —
    // it builds interaction trust without implying we're revealing the full secret.
    navigator.clipboard.writeText(data?.key ?? '').catch(() => {})
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2000)

    // Record a live api_key.copied event in the in-memory audit log.
    // This is the distinction between "viewed the page" (passive) and
    // "extracted the key to clipboard" (active — higher audit significance).
    // We write directly to the imported array; MSW serves this array on
    // subsequent /api/audit-log requests so it appears without a full reload.
    copyCountRef.current += 1
    auditLog.unshift({
      id: `aud_live_copy_${copyCountRef.current}`,
      actor: actors.tolu,
      action: 'api_key.copied',
      target: { type: 'api_key', id: 'apikey_01', label: 'Live API Key' },
      metadata: {},
      ip: actors.tolu.ip,
      timestamp: new Date().toISOString(),
    })
  }

  const dayLabels = getLast7DayLabels()
  const chartData = (data?.requestVolume ?? []).map((count, i) => ({
    day: dayLabels[i],
    requests: count,
  }))

  const grantedSet = new Set(data?.permissions ?? [])
  const grantedList = ALL_PERMISSIONS.filter((p) => grantedSet.has(p))
  const deniedList = ALL_PERMISSIONS.filter((p) => !grantedSet.has(p))

  return (
    <div className="space-y-6">

      {/* ── Toast ─────────────────────────────────────────────────────────────
          Fixed at bottom-right of the viewport. Always in the DOM, but invisible
          (opacity-0 + pointer-events-none) when not active. CSS transition on
          opacity + translateY gives the subtle "pop up" entry. ──────────────── */}
      <div
        className={`fixed bottom-6 right-8 z-50 bg-content-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg transition-all duration-300 ${
          toastVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-1.5 pointer-events-none'
        }`}
      >
        Copied to clipboard
      </div>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-content-primary leading-snug">API Key</h1>
        <p className="mt-1 text-sm text-content-tertiary max-w-xl">
          Your secret key for authenticating API requests. Keep this secure
          and never expose it in client-side code.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="bg-surface-primary border border-border-primary-light rounded-xl p-5 space-y-3"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="bg-surface-primary border border-border-primary-light rounded-xl p-5 space-y-3"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <p className="text-sm text-feedback-danger-main">{error}</p>
      ) : (
        <div className="grid grid-cols-3 gap-6 items-start">

          {/* ── Left column: Secret key + Usage ─────────────────────────────── */}
          <div className="col-span-2 space-y-6">

            {/* Section 1: Key */}
            <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border-primary-light flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-content-tertiary">
                    Secret key
                  </h2>
                  <Badge variant="status" value={data.status}>Active</Badge>
                </div>
                <span className="text-xs text-content-tertiary">
                  Created {formatDate(data.created)}
                </span>
              </div>

              <div className="px-5 pt-4 pb-4">
                {/* Masked key row */}
                <div className="bg-surface-secondary border border-border-primary-light rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                  <span className="font-mono text-sm text-content-primary tracking-widest select-all">
                    {data.key}
                  </span>
                  {/* Inline copy button — triggers page-level toast, so we can't
                      use the shared <CopyButton> atom which owns its own tick state */}
                  <button
                    onClick={handleCopy}
                    aria-label="Copy key to clipboard"
                    className="ml-1.5 p-1 rounded text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary transition-colors cursor-pointer shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                      <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                      <path
                        d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v7A1.5 1.5 0 003.5 12H5"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                {/* Last used + originating IP */}
                <p className="mt-2.5 text-xs text-content-tertiary">
                  Last used {formatDatetime(data.lastUsed)} from{' '}
                  <span className="font-mono">{data.lastIp}</span>
                </p>
              </div>

              <div className="px-5 py-3.5 border-t border-border-primary-light">
                <p className="text-xs text-content-tertiary">
                  To generate a new key or revoke this one, contact your account manager.
                </p>
              </div>
            </div>

            {/* Section 2: Usage */}
            <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border-primary-light">
                <h2 className="text-xs font-medium uppercase tracking-wide text-content-tertiary">
                  Usage — last 7 days
                </h2>
              </div>

              {/* Three stat cells — divided horizontally, no card overhead per cell */}
              <div className="grid grid-cols-3 divide-x divide-border-primary-light">
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-content-tertiary mb-2">
                    Requests today
                  </p>
                  <p className="text-2xl font-semibold text-content-primary tabular-nums leading-none">
                    {data.requestsToday.toLocaleString()}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-content-tertiary mb-2">
                    Errors today
                  </p>
                  {/* Color = status: red if errors exist, muted gray if clean.
                      This is the one place on the page where color carries meaning. */}
                  <p
                    className={`text-2xl font-semibold tabular-nums leading-none ${
                      data.errorsToday > 0
                        ? 'text-feedback-danger-main'
                        : 'text-content-tertiary'
                    }`}
                  >
                    {data.errorsToday.toLocaleString()}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-content-tertiary mb-2">
                    Total requests
                  </p>
                  <p className="text-2xl font-semibold text-content-primary tabular-nums leading-none">
                    {data.totalRequests.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 7-day request volume sparkline */}
              <div className="px-5 pt-1 pb-5">
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#009EFF" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#009EFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      dy={6}
                    />
                    <Tooltip
                      content={<UsageTooltip />}
                      cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#009EFF"
                      strokeWidth={1.5}
                      fill={`url(#${gradientId})`}
                      activeDot={{ r: 4, fill: '#009EFF', stroke: '#fff', strokeWidth: 2 }}
                      dot={(props) => {
                        // Render a visible dot only for today (last index) — amber to
                        // signal the count is partial (day not yet complete). All other
                        // points get an empty <g/> which Recharts requires as a valid
                        // SVG element (returning null causes a React warning here).
                        if (props.index !== chartData.length - 1) {
                          return <g key={props.index} />
                        }
                        return (
                          <circle
                            key={props.index}
                            cx={props.cx}
                            cy={props.cy}
                            r={4}
                            fill="#F59E0B"
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        )
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Amber dot legend — explains why today's point looks different */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#F59E0B' }} />
                  <span className="text-xs text-content-tertiary">
                    Today's count is partial — the day isn't complete yet
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column: Security banner + Permissions ──────────────────── */}
          <div className="space-y-6">

            {/* Security guidance — Pax Alert keeps this consistent with system-level
                notifications. Muted variant is low-noise for a sidebar context. */}
            <Alert severity="information" variant="filled">
              <AlertTitle className="flex flex-col gap-4">
                <AlertInformationIcon />
                Keep your secret key secure
              </AlertTitle>
              <AlertDescription>
                Never expose this key in frontend code or public repositories.
                Store it server-side via environment variables, and contact your
                account manager to rotate or revoke it.
              </AlertDescription>
            </Alert>

            {/* Permissions card */}
            <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border-primary-light">
                <h2 className="text-xs font-medium uppercase tracking-wide text-content-tertiary">
                  Permissions
                </h2>
              </div>

              <div className="px-5 py-4">
                {/* Two independent columns — not a row-paired table.
                    If granted and denied counts differ (they will), a table would
                    show empty cells which reads as "missing data". Two separate lists
                    avoid that and keep each column clean. */}
                <div className="grid grid-cols-2 gap-x-6">
                  {/* Granted — success green signals capability, not outcome */}
                  <div className="space-y-2">
                    {grantedList.map((perm) => (
                      <div key={perm} className="flex items-center gap-2">
                        <span className="text-feedback-success-main text-sm font-medium w-4 shrink-0 text-center leading-none">
                          ✓
                        </span>
                        <span className="text-xs text-content-primary font-mono">
                          {perm}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Denied — muted gray, not red. Absence of a permission is
                      intentional scope, not an error. Red would imply something
                      is broken. Gray says "this was deliberately not granted". */}
                  <div className="space-y-2">
                    {deniedList.map((perm) => (
                      <div key={perm} className="flex items-center gap-2">
                        <span className="text-content-tertiary text-sm font-medium w-4 shrink-0 text-center leading-none">
                          ✗
                        </span>
                        <span className="text-xs text-content-tertiary font-mono">
                          {perm}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-border-primary-light">
                <p className="text-xs text-content-tertiary">
                  Permissions are set by GlobalStack. Contact your account manager to request changes.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
