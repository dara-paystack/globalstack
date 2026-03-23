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
//   Parent renders with a key={preselectedAccountId ?? 'generic'} for fresh instances.
//
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, TextInput } from '@paystack/pax'
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

// Coming-soon inline note for "+ New recipient" inside Step 2
function ComingSoonNote({ visible }) {
  if (!visible) return null
  return (
    <div className="mt-3 px-3 py-2 rounded-lg bg-feedback-information-light border border-feedback-information-border text-xs text-feedback-information-main">
      Recipient creation coming soon — requires a bank resolution flow.
    </div>
  )
}

// ReadOnlyCard — the "card row" pattern from the Retry refund reference.
// Used for information that's already been decided: source account, selected recipient.
// Visually separates committed state from editable form fields below.
function ReadOnlyCard({ label, primary, secondary, trailingPrimary, trailingSecondary }) {
  return (
    <div className="rounded-xl border border-border-primary-light px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {label && (
            <div className="text-xs text-content-tertiary mb-1">{label}</div>
          )}
          <div className="text-sm font-medium text-content-primary truncate">{primary}</div>
          {secondary && (
            <div className="text-xs text-content-tertiary font-mono mt-0.5">{secondary}</div>
          )}
        </div>
        {(trailingPrimary || trailingSecondary) && (
          <div className="text-right shrink-0">
            {trailingPrimary && (
              <div className="text-sm font-semibold text-content-primary tabular-nums">{trailingPrimary}</div>
            )}
            {trailingSecondary && (
              <div className="text-xs text-content-tertiary mt-0.5">{trailingSecondary}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function SendFundsModal({ open, onClose, preselectedAccountId }) {
  const navigate = useNavigate()
  const modalRef = useRef(null)

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
  const [submitError, setSubmitError] = useState(null)
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
    setSubmitError(null)

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
      setSubmitError('Transfer failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleComingSoon() {
    setShowComingSoon(true)
    setTimeout(() => setShowComingSoon(false), 3000)
  }

  // Focus management and keyboard handling when modal is open.
  //
  // Why a focus trap matters: without it, Tab moves focus through background
  // content while the modal is visible. Screen reader users navigating by Tab
  // would escape the dialog and interact with page content behind the overlay —
  // effectively stranded with no way to know they've left the dialog.
  //
  // The trap works by intercepting Tab/Shift+Tab at document level: when the
  // focused element is the first or last focusable item in the modal, we wrap
  // focus back to the other end instead of letting it escape.
  //
  // Initial focus: we move focus into the modal on open so keyboard users
  // don't have to Tab back into it after it appears.
  useEffect(() => {
    if (!open) return

    const FOCUSABLE = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const modal = modalRef.current
    if (modal) {
      const focusable = Array.from(modal.querySelectorAll(FOCUSABLE))
      focusable[0]?.focus()
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modal) {
        const focusable = Array.from(modal.querySelectorAll(FOCUSABLE))
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  // Portal renders the modal at document.body level so it's never clipped
  // by overflow:hidden on ancestors (e.g. GlobalPanel). position:fixed is
  // nominally viewport-relative, but browsers can trap it inside composited
  // layers — portalling out is the reliable fix for modals triggered from panels.
  return createPortal(
    // Backdrop — full screen, dark overlay. Click outside to close.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-funds-title"
        className="relative bg-surface-primary rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 48px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — title + step counter + close button, with divider below */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border-primary-light shrink-0">
          <div>
            <div id="send-funds-title" className="text-lg font-semibold text-content-primary">
              Send funds
            </div>
            {!createdTransfer && (
              <p className="text-xs text-content-tertiary mt-0.5">Step {step} of 4</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-content-tertiary hover:bg-surface-secondary hover:text-content-primary transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X width={16} height={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {createdTransfer ? (
            <SuccessView transfer={createdTransfer} onClose={onClose} navigate={navigate} />
          ) : (
            <>

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

        {/* Footer — action buttons.
            Layout: [← Back] bottom-left, [Cancel][Continue] bottom-right.
            This separates navigation (Back = directional) from decisions
            (Cancel = abort, Continue = commit). The primary action always
            lives at the bottom-right — users build a spatial habit quickly. */}
        {!createdTransfer && (
          <div className="border-t border-border-primary-light shrink-0">
            {submitError && (
              <p className="px-6 pt-3 text-xs text-feedback-danger-main">{submitError}</p>
            )}
            <div className="flex items-center justify-between px-6 py-4">
            <div>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-3 py-2 text-sm text-content-secondary hover:text-content-primary cursor-pointer transition-colors"
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
                // "Continue" — no arrow icon. The filled button style communicates
                // primary action without decoration.
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canAdvance(step, formData)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-action-primary-main text-content-inverse hover:bg-action-primary-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting || !formData.amount}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-action-primary-main text-content-inverse hover:bg-action-primary-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Sending…' : 'Confirm transfer'}
                </button>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
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
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border-primary-light animate-pulse bg-surface-secondary" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {accounts.map((account) => {
            const hasBalance = account.balance > 0
            const isSelected = selectedId === account.id

            return (
              <button
                key={account.id}
                onClick={() => hasBalance && onSelect(account.id)}
                disabled={!hasBalance}
                className={[
                  'w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors',
                  isSelected
                    ? 'border-action-primary-main bg-feedback-information-light cursor-pointer'
                    : hasBalance
                    ? 'border-border-primary-light hover:border-border-primary-dark hover:bg-surface-secondary cursor-pointer'
                    : 'border-border-primary-light bg-surface-secondary cursor-not-allowed opacity-50',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  {/* Selection indicator — radio-style circle */}
                  <div className={[
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    isSelected ? 'border-action-primary-main bg-action-primary-main' : 'border-border-primary-dark',
                  ].join(' ')}>
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-content-primary">
                      {account.label}
                    </div>
                    <div className="text-xs text-content-tertiary mt-0.5 font-mono">
                      {account.addressShort}
                    </div>
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
      {/* Customer selector */}
      <div className="mb-5">
        <label className="text-sm font-medium text-content-primary mb-2 block">
          Customer
        </label>
        {customersLoading ? (
          <div className="h-11 rounded-xl bg-surface-secondary animate-pulse" />
        ) : (
          <Select
            value={selectedCustomerId ?? 'none'}
            onValueChange={(val) => onSelectCustomer(val === 'none' ? null : val)}
          >
            <SelectTrigger className="w-full text-sm cursor-pointer">
              <SelectValue placeholder="Select a customer…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select a customer…</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Recipient list — only shown once a customer is selected */}
      {selectedCustomerId && (
        <div>
          <label className="text-sm font-medium text-content-primary mb-2 block">
            Recipient
          </label>

          {/* Currency constraint note */}
          {selectedAccount && (
            <p className="text-xs text-content-tertiary mb-3">
              Showing {expectedType} only — {sourceCurrency} transfers require a matching recipient type.
            </p>
          )}

          {recipientsLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl border border-border-primary-light animate-pulse bg-surface-secondary" />
              ))}
            </div>
          ) : compatibleRecipients.length === 0 ? (
            <div className="rounded-xl border border-border-primary-light px-4 py-6 text-center">
              {recipients.length > 0 ? (
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
            <div className="space-y-2.5">
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
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'border-action-primary-main bg-feedback-information-light'
                        : 'border-border-primary-light hover:border-border-primary-dark hover:bg-surface-secondary',
                    ].join(' ')}
                  >
                    {/* Radio-style selection indicator */}
                    <div className={[
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'border-action-primary-main bg-action-primary-main' : 'border-border-primary-dark',
                    ].join(' ')}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-content-primary">{recipient.name}</div>
                      <div className="text-xs text-content-tertiary mt-0.5">{subtitle}</div>
                    </div>
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

  const recipientSubtitle = recipient.type === 'fiat'
    ? `Bank account · ${RAIL_LABELS[recipient.rail] ?? recipient.rail}`
    : `Crypto · ${CHAIN_LABELS[recipient.chain] ?? recipient.chain}`

  return (
    <div>
      {/* Source + destination context cards — "ReadOnlyCard" pattern from the reference.
          Information that's already been decided is shown as a contained bordered row,
          visually separated from the editable fields below. Users can review what they've
          set up without it blending into the form. */}
      <div className="space-y-2.5 mb-6">
        <ReadOnlyCard
          label="From"
          primary={sourceAccount.label}
          secondary={sourceAccount.addressShort}
          trailingPrimary={formatAmount(sourceAccount.balance, sourceAccount.currency)}
          trailingSecondary="available"
        />
        <ReadOnlyCard
          label="To"
          primary={recipient.name}
          secondary={recipientSubtitle}
        />
      </div>

      {/* Amount input */}
      <div className="mb-5">
        <label htmlFor="send-funds-amount" className="text-sm font-medium text-content-primary mb-2 block">
          Amount ({sourceAccount.currency})
        </label>
        <div className="relative">
          {/* aria-hidden: decorative currency prefix, the label already names the currency */}
          {sourceAccount.currency === 'USD' && (
            <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-content-tertiary font-medium">
              $
            </span>
          )}
          <TextInput
            id="send-funds-amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className={[
              'w-full tabular-nums',
              sourceAccount.currency === 'USD' ? 'pl-7 pr-3.5' : '',
            ].join(' ')}
          />
          {sourceAccount.currency !== 'USD' && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-content-tertiary font-medium">
              {sourceAccount.currency}
            </span>
          )}
        </div>
      </div>

      {/* Conversion note — shown when source and destination currencies differ */}
      {currencyMismatch && (
        <div className="mb-5 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-feedback-information-light border border-feedback-information-border">
          <Info className="shrink-0 mt-0.5 text-feedback-information-main" width={13} height={13} strokeWidth={1.25} />
          <p className="text-xs text-feedback-information-main">
            Funds will be converted automatically from {sourceAccount.currency} to{' '}
            {recipient.type === 'fiat' ? 'USD' : 'USDC'} at the prevailing rate.
          </p>
        </div>
      )}

      {/* Rail — pre-populated from recipient, read-only (one rail per recipient in this model) */}
      <div className="mb-5">
        <label className="text-sm font-medium text-content-primary mb-2 block">
          Payment rail
        </label>
        <div className="h-11 px-3.5 flex items-center text-sm text-content-primary rounded-xl border border-border-primary-light bg-surface-secondary">
          {RAIL_LABELS[formData.rail] ?? formData.rail}
          <span className="ml-2 text-xs text-content-tertiary">(set by recipient)</span>
        </div>
      </div>

      {/* Merchant reference — optional */}
      <div>
        <label htmlFor="send-funds-reference" className="text-sm font-medium text-content-primary mb-2 block">
          Merchant reference{' '}
          <span className="font-normal text-content-tertiary">(optional)</span>
        </label>
        <TextInput
          id="send-funds-reference"
          type="text"
          value={formData.merchantReference}
          onChange={(e) => onRefChange(e.target.value)}
          placeholder="e.g. payroll-march-w1"
          className="w-full font-mono"
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
      <div className="rounded-xl border border-border-primary-light overflow-hidden divide-y divide-border-primary-light">
        {rows.map(({ label, value, bold, mono }) => (
          <div key={label} className="flex items-start justify-between px-4 py-3.5 gap-4">
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

      <p className="text-xs text-content-tertiary mt-5">
        By confirming, you authorise this transfer. This action cannot be undone.
      </p>
    </div>
  )
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView({ transfer, onClose, navigate }) {
  return (
    <div className="py-6 text-center">
      {/* Green checkmark */}
      <div className="w-12 h-12 rounded-full bg-feedback-success-light border border-feedback-success-border flex items-center justify-center mx-auto mb-4">
        <Check width={22} height={22} stroke="var(--feedback-success-main, #17B04A)" strokeWidth={2} />
      </div>

      <div className="text-[17px] font-semibold text-content-primary mb-2">
        Transfer initiated
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-xs font-mono text-content-tertiary">{transfer.id}</span>
        <Badge variant="status" value="pending" />
      </div>

      <p className="text-sm text-content-secondary max-w-xs mx-auto mb-7">
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
