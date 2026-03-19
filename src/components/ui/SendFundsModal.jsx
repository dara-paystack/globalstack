// SendFundsModal — 4-step transfer initiation flow.
//
// Why a modal (not the push panel pattern):
//   The push panel is a viewer — it coexists with the content area so operators
//   can browse records while viewing detail. It's informational and non-blocking.
//   The Send Funds flow is a multi-step action that changes state (POST /api/transfers).
//   The modal blocks the background intentionally: a sequential decision-making
//   flow should prevent accidental navigation away mid-step. It also returns the
//   user to exactly where they were when complete.
//
// Step state management:
//   Simple useState for `step` (integer 1–4) + a flat `formData` object.
//   No reducer: transitions are always linear (step ± 1), formData is shallow.
//   Co-located state in the modal component — it's entirely local and resets
//   automatically when the modal unmounts on close.
//
// preselectedAccountId prop:
//   When provided (from the Account detail panel "Send funds" button), the modal
//   initializes formData.sourceAccountId to that account and starts at step 2.
//   This skips step 1 because the source is already known — the user opened
//   "Send funds" from a specific account panel. The prop name communicates
//   *why* step 1 is skipped, not just *which step* to show.
//   Parent renders with a key={preselectedAccountId ?? 'generic'} so React
//   creates a fresh instance each time the account changes.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../../hooks/useAccounts'
import { useCustomers } from '../../hooks/useCustomers'
import { useRecipients } from '../../hooks/useRecipients'
import { Badge } from './Badge'
import { formatAmount } from '../../lib/format'

const RAIL_LABELS = {
  ach:          'ACH',
  ach_same_day: 'ACH Same-day',
  wire:         'Wire',
  solana:       'Solana',
  ethereum:     'Ethereum',
  base:         'Base',
}

const CHAIN_LABELS = {
  base:     'Base',
  solana:   'Solana',
  ethereum: 'Ethereum',
}

// Step indicator — simple "Step X of 4" text + progress dots.
// Not a heavy wizard component — just conditional rendering with a step counter.
function StepIndicator({ step, total = 4 }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={[
              'h-1.5 rounded-full transition-all duration-200',
              i < step ? 'w-6 bg-action-primary-main' : 'w-3 bg-border-primary-main',
            ].join(' ')}
          />
        ))}
      </div>
      <span className="text-xs text-content-tertiary font-medium">
        Step {step} of {total}
      </span>
    </div>
  )
}

// Coming-soon inline toast for "+ New recipient" link inside the modal
function ComingSoonNote({ visible }) {
  if (!visible) return null
  return (
    <div className="mt-3 px-3 py-2 rounded-lg bg-feedback-information-light border border-feedback-information-border text-xs text-feedback-information-main">
      Recipient creation coming soon — requires a bank resolution flow.
    </div>
  )
}

export function SendFundsModal({ open, onClose, preselectedAccountId }) {
  const navigate = useNavigate()

  // Linear step state. No reducer needed — transitions are always step ± 1.
  // Start at step 2 when a source account is pre-selected (e.g. from Account panel).
  const [step, setStep] = useState(preselectedAccountId ? 2 : 1)

  const [formData, setFormData] = useState({
    sourceAccountId: preselectedAccountId ?? null,
    recipientId: null,
    customerId: null,     // chosen in step 2 to filter recipients
    amount: '',
    rail: '',
    merchantReference: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdTransfer, setCreatedTransfer] = useState(null)
  const [showComingSoon, setShowComingSoon] = useState(false)

  // All accounts — filter to merchant-owned client-side (same as Overview pattern)
  const { data: allAccounts, loading: accountsLoading } = useAccounts()
  const merchantAccounts = allAccounts.filter((a) => a.owner === 'merchant')

  const { data: customers, loading: customersLoading } = useCustomers()

  // Fetch active recipients for the selected customer
  const { data: recipients, loading: recipientsLoading } = useRecipients({
    customerId: formData.customerId,
    status: 'active',
  })

  // Derived: selected account and recipient objects
  const selectedAccount = merchantAccounts.find((a) => a.id === formData.sourceAccountId)
  const selectedRecipient = recipients.find((r) => r.id === formData.recipientId)
  const selectedCustomer = customers.find((c) => c.id === formData.customerId)

  // Currency mismatch: USDC source → fiat recipient or USD source → crypto recipient
  const currencyMismatch =
    selectedAccount &&
    selectedRecipient &&
    ((selectedAccount.currency === 'USDC' && selectedRecipient.type === 'fiat') ||
      (selectedAccount.currency === 'USD' && selectedRecipient.type === 'crypto'))

  function set(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleConfirm() {
    if (!selectedAccount || !selectedRecipient || !formData.amount) return
    setIsSubmitting(true)

    try {
      const payload = {
        customerId: formData.customerId,
        sourceAccountId: selectedAccount.id,
        sourceAccountType: selectedAccount.type === 'fiat' ? 'virtual_account' : 'on_chain_account',
        sourceCurrency: selectedAccount.currency.toLowerCase(),
        recipientId: selectedRecipient.id,
        recipientType: selectedRecipient.type,
        destinationCurrency: selectedRecipient.type === 'fiat' ? 'usd' : 'usdc',
        paymentRail: formData.rail || selectedRecipient.rail,
        amount: parseFloat(formData.amount),
        merchantReference: formData.merchantReference || null,
      }

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const transfer = await res.json()
      setCreatedTransfer(transfer)
    } catch (err) {
      console.error('Transfer failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleComingSoon() {
    setShowComingSoon(true)
    setTimeout(() => setShowComingSoon(false), 3000)
  }

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!open) return null

  return (
    // Backdrop — full screen, dark overlay. Click outside to close.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      {/* Modal card — stop click propagation so clicks inside don't close it */}
      <div
        className="relative bg-surface-primary rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: 'calc(100vh - 48px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-primary-light shrink-0">
          <div className="text-base font-semibold text-content-primary">Send funds</div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-content-tertiary hover:bg-surface-secondary hover:text-content-primary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {createdTransfer ? (
            <SuccessView transfer={createdTransfer} onClose={onClose} navigate={navigate} />
          ) : (
            <>
              <StepIndicator step={step} />

              {step === 1 && (
                <Step1SelectSource
                  accounts={merchantAccounts}
                  loading={accountsLoading}
                  selectedId={formData.sourceAccountId}
                  onSelect={(id) => set('sourceAccountId', id)}
                />
              )}

              {step === 2 && (
                <Step2SelectRecipient
                  customers={customers}
                  customersLoading={customersLoading}
                  selectedCustomerId={formData.customerId}
                  onSelectCustomer={(id) => {
                    set('customerId', id)
                    set('recipientId', null)
                    set('rail', '')
                  }}
                  recipients={recipients}
                  recipientsLoading={recipientsLoading}
                  selectedId={formData.recipientId}
                  onSelect={(recipient) => {
                    set('recipientId', recipient.id)
                    set('rail', recipient.rail)
                  }}
                  onComingSoon={handleComingSoon}
                  showComingSoon={showComingSoon}
                  selectedAccount={selectedAccount}
                />
              )}

              {step === 3 && (
                <Step3EnterAmount
                  sourceAccount={selectedAccount}
                  recipient={selectedRecipient}
                  formData={formData}
                  currencyMismatch={currencyMismatch}
                  onAmountChange={(v) => set('amount', v)}
                  onRailChange={(v) => set('rail', v)}
                  onRefChange={(v) => set('merchantReference', v)}
                />
              )}

              {step === 4 && (
                <Step4Confirm
                  sourceAccount={selectedAccount}
                  recipient={selectedRecipient}
                  customer={selectedCustomer}
                  formData={formData}
                />
              )}
            </>
          )}
        </div>

        {/* Footer — action buttons */}
        {!createdTransfer && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border-primary-light shrink-0">
            <div>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary cursor-pointer transition-colors"
                >
                  ← Back
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border-primary-main text-content-secondary hover:bg-surface-secondary cursor-pointer transition-colors"
              >
                Cancel
              </button>

              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canAdvance(step, formData)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-action-primary-main text-content-inverse hover:bg-action-primary-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting || !formData.amount}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-action-primary-main text-content-inverse hover:bg-action-primary-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Sending…' : 'Confirm transfer →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Returns true if the user can advance from the current step
function canAdvance(step, formData) {
  if (step === 1) return !!formData.sourceAccountId
  if (step === 2) return !!formData.recipientId
  if (step === 3) return !!formData.amount && parseFloat(formData.amount) > 0
  return true
}

// ─── Step 1: Select source account ───────────────────────────────────────────

function Step1SelectSource({ accounts, loading, selectedId, onSelect }) {
  return (
    <div>
      <div className="text-[15px] font-medium text-content-primary mb-1">
        Which account are you sending from?
      </div>
      <p className="text-sm text-content-tertiary mb-5">
        Select a merchant account with available funds.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl border border-border-primary-light animate-pulse bg-surface-secondary" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => {
            const hasBalance = account.balance > 0
            const isSelected = selectedId === account.id

            return (
              <button
                key={account.id}
                onClick={() => hasBalance && onSelect(account.id)}
                disabled={!hasBalance}
                className={[
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors',
                  isSelected
                    ? 'border-action-primary-main bg-feedback-information-light'
                    : hasBalance
                    ? 'border-border-primary-light hover:border-border-primary-dark hover:bg-surface-secondary cursor-pointer'
                    : 'border-border-primary-light bg-surface-secondary cursor-not-allowed opacity-60',
                ].join(' ')}
              >
                <div>
                  <div className="text-sm font-medium text-content-primary">
                    {account.label}
                  </div>
                  <div className="text-xs text-content-tertiary mt-0.5 font-mono">
                    {account.addressShort}
                  </div>
                </div>
                <div className="text-right">
                  {hasBalance ? (
                    <div className="text-sm font-semibold text-content-primary tabular-nums">
                      {formatAmount(account.balance, account.currency)}
                    </div>
                  ) : (
                    <div className="text-xs text-content-tertiary">No funds</div>
                  )}
                  <div className="text-xs text-content-tertiary mt-0.5">
                    {account.currency}
                    {account.chain ? ` · ${CHAIN_LABELS[account.chain] ?? account.chain}` : ''}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Select recipient ─────────────────────────────────────────────────

function Step2SelectRecipient({
  customers,
  customersLoading,
  selectedCustomerId,
  onSelectCustomer,
  recipients,
  recipientsLoading,
  selectedId,
  onSelect,
  onComingSoon,
  showComingSoon,
  selectedAccount,
}) {
  // Filter recipients to those compatible with the selected source account currency.
  // Transfers are always same-currency: USDC accounts can only send to crypto recipients;
  // USD (fiat) accounts can only send to fiat bank account recipients.
  // This constraint is enforced here (presentation layer) — it's a transfer rule,
  // not a property of the recipient itself.
  const compatibleRecipients = selectedAccount
    ? recipients.filter((r) =>
        selectedAccount.type === 'on-chain' ? r.type === 'crypto' : r.type === 'fiat'
      )
    : recipients

  const expectedType = selectedAccount?.type === 'on-chain' ? 'crypto wallets' : 'bank accounts'
  const sourceCurrency = selectedAccount?.currency ?? ''

  return (
    <div>
      <div className="text-[15px] font-medium text-content-primary mb-1">
        Who are you sending to?
      </div>
      <p className="text-sm text-content-tertiary mb-5">
        Select a customer and then choose their recipient.
      </p>

      {/* Customer selector */}
      <div className="mb-4">
        <label className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-1.5 block">
          Customer
        </label>
        {customersLoading ? (
          <div className="h-9 rounded-lg bg-surface-secondary animate-pulse" />
        ) : (
          <div className="relative">
            <select
              value={selectedCustomerId ?? ''}
              onChange={(e) => onSelectCustomer(e.target.value || null)}
              className="w-full h-9 pl-3 pr-8 text-sm rounded-lg border border-border-primary-main bg-surface-primary text-content-primary appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-action-primary-main transition-colors"
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-content-tertiary" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Recipient list — only shown once a customer is selected */}
      {selectedCustomerId && (
        <div>
          <label className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-1.5 block">
            Recipient
          </label>

          {/* Currency constraint note — shown when source account is known */}
          {selectedAccount && (
            <p className="text-xs text-content-tertiary mb-2.5">
              Showing {expectedType} only — {sourceCurrency} transfers require a matching recipient type.
            </p>
          )}

          {recipientsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl border border-border-primary-light animate-pulse bg-surface-secondary" />
              ))}
            </div>
          ) : compatibleRecipients.length === 0 ? (
            <div className="rounded-xl border border-border-primary-light px-4 py-6 text-center">
              {recipients.length > 0 ? (
                // Customer has recipients, but none are compatible with this account's currency
                <>
                  <p className="text-sm text-content-secondary">
                    No compatible recipients for {sourceCurrency}.
                  </p>
                  <p className="text-xs text-content-tertiary mt-1">
                    {sourceCurrency} can only be sent to {expectedType}.
                    This customer's existing recipients use a different rail.
                  </p>
                </>
              ) : (
                // Customer has no recipients at all
                <p className="text-sm text-content-tertiary">No active recipients for this customer.</p>
              )}
              <button
                onClick={onComingSoon}
                className="text-sm text-action-primary-main hover:text-action-primary-dark mt-3 cursor-pointer"
              >
                + New recipient
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {compatibleRecipients.map((recipient) => {
                const isSelected = selectedId === recipient.id
                const subtitle = recipient.type === 'fiat'
                  ? `Bank account · ${RAIL_LABELS[recipient.rail] ?? recipient.rail}`
                  : `Crypto · ${CHAIN_LABELS[recipient.chain] ?? recipient.chain}`

                return (
                  <button
                    key={recipient.id}
                    onClick={() => onSelect(recipient)}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'border-action-primary-main bg-feedback-information-light'
                        : 'border-border-primary-light hover:border-border-primary-dark hover:bg-surface-secondary',
                    ].join(' ')}
                  >
                    <div>
                      <div className="text-sm font-medium text-content-primary">
                        {recipient.name}
                      </div>
                      <div className="text-xs text-content-tertiary mt-0.5">{subtitle}</div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-action-primary-main flex items-center justify-center shrink-0">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l1.8 1.8L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}

              {/* New recipient — requires bank resolution flow not yet built */}
              <div className="pt-1">
                <button
                  onClick={onComingSoon}
                  className="text-sm text-action-primary-main hover:text-action-primary-dark cursor-pointer"
                >
                  + New recipient
                </button>
              </div>
            </div>
          )}

          <ComingSoonNote visible={showComingSoon} />
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Enter amount ─────────────────────────────────────────────────────

function Step3EnterAmount({
  sourceAccount,
  recipient,
  formData,
  currencyMismatch,
  onAmountChange,
  onRailChange,
  onRefChange,
}) {
  if (!sourceAccount || !recipient) return null

  return (
    <div>
      <div className="text-[15px] font-medium text-content-primary mb-1">
        How much are you sending?
      </div>
      <p className="text-sm text-content-tertiary mb-5">
        Enter the amount to send from this account.
      </p>

      {/* Source account summary — read-only context card */}
      <div className="rounded-xl bg-surface-secondary border border-border-primary-light px-4 py-3 mb-5">
        <div className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-2">
          From
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-content-primary">{sourceAccount.label}</div>
            <div className="text-xs font-mono text-content-tertiary mt-0.5">{sourceAccount.addressShort}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-content-primary tabular-nums">
              {formatAmount(sourceAccount.balance, sourceAccount.currency)}
            </div>
            <div className="text-xs text-content-tertiary">available</div>
          </div>
        </div>
      </div>

      {/* Amount input */}
      <div className="mb-4">
        <label className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-1.5 block">
          Amount ({sourceAccount.currency})
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-content-tertiary font-medium">
            {sourceAccount.currency === 'USD' ? '$' : ''}
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className={[
              'w-full h-10 text-sm rounded-lg border border-border-primary-main bg-surface-primary text-content-primary',
              'focus:outline-none focus:ring-1 focus:ring-action-primary-main transition-colors',
              'tabular-nums',
              sourceAccount.currency === 'USD' ? 'pl-7 pr-3' : 'px-3',
            ].join(' ')}
          />
          {sourceAccount.currency !== 'USD' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-content-tertiary font-medium">
              {sourceAccount.currency}
            </span>
          )}
        </div>
      </div>

      {/* Conversion note — shown when source and destination currencies differ */}
      {currencyMismatch && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-feedback-information-light border border-feedback-information-border">
          <svg className="shrink-0 mt-0.5 text-feedback-information-main" width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25"/>
            <path d="M7 6.5v3M7 4.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
          <p className="text-xs text-feedback-information-main">
            Funds will be converted automatically from {sourceAccount.currency} to{' '}
            {recipient.type === 'fiat' ? 'USD' : 'USDC'} at the prevailing rate.
          </p>
        </div>
      )}

      {/* Rail — pre-populated from recipient, read-only (one rail per recipient in this model) */}
      <div className="mb-4">
        <label className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-1.5 block">
          Payment rail
        </label>
        <div className="h-10 px-3 flex items-center text-sm text-content-primary rounded-lg border border-border-primary-light bg-surface-secondary">
          {RAIL_LABELS[formData.rail] ?? formData.rail}
          <span className="ml-2 text-xs text-content-tertiary">(set by recipient)</span>
        </div>
      </div>

      {/* Merchant reference — optional */}
      <div>
        <label className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-1.5 block">
          Merchant reference{' '}
          <span className="normal-case font-normal text-content-quaternary">(optional)</span>
        </label>
        <input
          type="text"
          value={formData.merchantReference}
          onChange={(e) => onRefChange(e.target.value)}
          placeholder="e.g. payroll-march-w1"
          className="w-full h-10 px-3 text-sm rounded-lg border border-border-primary-main bg-surface-primary text-content-primary focus:outline-none focus:ring-1 focus:ring-action-primary-main transition-colors placeholder:text-content-quaternary font-mono"
        />
      </div>
    </div>
  )
}

// ─── Step 4: Confirm ──────────────────────────────────────────────────────────

function Step4Confirm({ sourceAccount, recipient, customer, formData }) {
  if (!sourceAccount || !recipient) return null

  const rows = [
    {
      label: 'From',
      value: `${sourceAccount.label} · ${sourceAccount.currency}`,
    },
    {
      label: 'To',
      value: `${recipient.name} · ${RAIL_LABELS[formData.rail] ?? formData.rail}`,
    },
    {
      label: 'Amount',
      value: formatAmount(parseFloat(formData.amount) || 0, sourceAccount.currency),
      bold: true,
    },
    {
      label: 'Rail',
      value: RAIL_LABELS[formData.rail] ?? formData.rail,
    },
    {
      label: 'Customer',
      value: customer?.name ?? '—',
    },
    {
      label: 'Reference',
      value: formData.merchantReference || '—',
      mono: !!formData.merchantReference,
    },
  ]

  return (
    <div>
      <div className="text-[15px] font-medium text-content-primary mb-1">
        Review your transfer
      </div>
      <p className="text-sm text-content-tertiary mb-5">
        Confirm the details before sending.
      </p>

      <div className="rounded-xl border border-border-primary-light overflow-hidden divide-y divide-border-primary-light">
        {rows.map(({ label, value, bold, mono }) => (
          <div key={label} className="flex items-start justify-between px-4 py-3 gap-4">
            <span className="text-sm text-content-tertiary shrink-0 min-w-[90px]">{label}</span>
            <span className={[
              'text-sm text-right',
              bold ? 'font-semibold text-content-primary tabular-nums' : 'text-content-primary',
              mono ? 'font-mono' : '',
            ].join(' ')}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-content-tertiary mt-4">
        By confirming, you authorise this transfer. This action cannot be undone.
      </p>
    </div>
  )
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView({ transfer, onClose, navigate }) {
  return (
    <div className="py-4 text-center">
      {/* Green checkmark */}
      <div className="w-12 h-12 rounded-full bg-feedback-success-light border border-feedback-success-border flex items-center justify-center mx-auto mb-4">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M5 11.5l4.5 4.5L17 7"
            stroke="var(--feedback-success-main, #17B04A)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="text-[17px] font-semibold text-content-primary mb-2">
        Transfer initiated
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-xs font-mono text-content-tertiary">{transfer.id}</span>
        <Badge variant="status" value="pending" />
      </div>

      <p className="text-sm text-content-secondary max-w-xs mx-auto mb-6">
        You&apos;ll receive a webhook notification when the transfer completes.
      </p>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-border-primary-main text-content-secondary hover:bg-surface-secondary cursor-pointer transition-colors"
        >
          Close
        </button>
        <button
          onClick={() => {
            onClose()
            navigate('/transactions')
          }}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-action-primary-main text-content-inverse hover:bg-action-primary-dark cursor-pointer transition-colors"
        >
          View in transactions →
        </button>
      </div>
    </div>
  )
}
