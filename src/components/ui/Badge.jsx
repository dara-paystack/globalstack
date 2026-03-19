// Badge — wraps Pax Chip with a two-variant API that enforces the design rule:
//
//   variant="type"    — always neutral/secondary. The label text is the only
//                       differentiator. Callers signal "this is a label, not a
//                       status" — the component handles the rest.
//
//   variant="status"  — semantic color derived from value. The caller passes the
//                       semantic key (value), never a color. The Badge maps it.
//                       Callers never choose colors; colors are never inconsistent.
//
// Usage:
//   <Badge variant="type" value={txn.type} />
//   <Badge variant="status" value={txn.status} />
//   <Badge variant="status" value={customer.kycStatus} context="kyc" />
//   <Badge variant="status" value={recipient.status} />  ← "active" → "Active" (no kyc context)

import { Chip } from '@paystack/pax'

// All status values → Pax Chip semantic color.
// Covers: transaction statuses, account statuses, KYC statuses.
const STATUS_COLOR = {
  // ── Transaction statuses ──────────────────────────────────────────────────
  completed:  'success',
  pending:    'information',   // waiting for next step — not a problem, just in-flight
  failed:     'error',
  canceled:   'secondary',    // terminal but not an error — intentionally voided
  reversed:   'secondary',    // terminal, funds returned — same visual weight as canceled

  // ── Account statuses (on-chain) ───────────────────────────────────────────
  active:     'success',
  inactive:   'secondary',
  closed:     'secondary',

  // ── Virtual account statuses (fiat) ───────────────────────────────────────
  open:        'success',      // OPEN → Open (green)
  deactivated: 'secondary',   // DEACTIVATED → neutral, not an error
  // 'closed' already mapped above — shared across account types

  // ── KYC statuses — 9 states ───────────────────────────────────────────────
  // 'active' already mapped (approved customer) → success
  // 'rejected' already mapped → error
  not_started:            'secondary',   // hasn't begun — neutral
  incomplete:             'warning',     // started but stalled — operator should nudge
  awaiting_questionnaire: 'warning',     // submitted, needs questionnaire
  awaiting_ubo:           'warning',     // business needs UBO disclosure
  under_review:           'information', // under compliance review — no action needed
  paused:                 'warning',     // temporarily suspended
  offboarded:             'secondary',   // relationship ended — neutral terminal

  // ── Team member statuses ──────────────────────────────────────────────────
  invited:   'information', // invitation sent, awaiting acceptance — pending action
  suspended: 'secondary',  // access revoked — neutral, not an error state

  // ── Recipient statuses ────────────────────────────────────────────────────
  archived: 'secondary',   // removed from active use; historical reference only

  // ── Transfer statuses ─────────────────────────────────────────────────────
  // PENDING/COMPLETED/FAILED/CANCELED — API returns uppercase; toLowerCase() in Badge handles it
  // 'completed', 'failed', 'canceled', 'pending' already mapped above
}

// Display labels for KYC statuses — the API values use snake_case, the UI
// shows human-readable labels. Keeps label logic in one place.
const KYC_LABELS = {
  not_started:            'Not started',
  incomplete:             'Incomplete',
  awaiting_questionnaire: 'Awaiting questionnaire',
  awaiting_ubo:           'Awaiting UBO',
  under_review:           'Under review',
  active:                 'Approved',    // ACTIVE = approved customer
  rejected:               'Rejected',
  paused:                 'Paused',
  offboarded:             'Offboarded',
}

// Virtual account status labels — OPEN/DEACTIVATED/CLOSED map to friendlier text
const ACCOUNT_STATUS_LABELS = {
  open:        'Open',
  deactivated: 'Inactive',
  closed:      'Closed',
}

// Pax Chip CVA bug workaround: base styles set bg-surface-primary and
// border-border-primary-main, and color variant classes lose in Tailwind v4's
// CSS ordering. Force the correct semantic bg + border with !important.
// Only needed for colored variants — secondary uses the defaults.
const SEMANTIC_OVERRIDES = {
  success:     '!bg-feedback-success-light !border-feedback-success-border',
  information: '!bg-feedback-information-light !border-feedback-information-border',
  warning:     '!bg-feedback-warning-light !border-feedback-warning-border',
  error:       '!bg-feedback-danger-light !border-feedback-danger-border',
}

// Format a raw value for display when no specific label map applies.
// Handles underscores, hyphens, and capitalisation.
// "not_started" → "Not started", "on-chain" → "On‑chain"
function formatLabel(value) {
  if (!value) return ''
  return value
    .replace(/_/g, ' ')
    .replace(/-/g, '\u2011')   // non-breaking hyphen — prevents wrapping at hyphen
    .replace(/^\w/, (c) => c.toUpperCase())
}

// context="kyc" opts into the KYC_LABELS map so 'active' → "Approved".
// Without it, 'active' falls through to formatLabel → "Active".
// This removes the need for children overrides at non-KYC call sites.
export function Badge({ variant, value, context, children }) {
  let label = children

  if (!label) {
    label =
      (context === 'kyc' ? KYC_LABELS[value] : undefined) ??
      ACCOUNT_STATUS_LABELS[value] ??
      formatLabel(value)
  }

  if (variant === 'type') {
    // All type badges are the same neutral secondary — the text distinguishes them.
    // Not using semantic colors for types because types are labels, not outcomes.
    // Giving "Conversion" a colored badge implies judgment; neutral keeps the
    // semantic signal clean for actual status badges.
    return (
      <Chip variant="status" color="secondary">
        {label}
      </Chip>
    )
  }

  // variant="status" — semantic color from value, never from the caller
  const color = STATUS_COLOR[value?.toLowerCase()] ?? 'secondary'
  const overrides = SEMANTIC_OVERRIDES[color]

  return (
    <Chip variant="status" color={color} className={overrides}>
      {label}
    </Chip>
  )
}
