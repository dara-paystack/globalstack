// GlobalPanel — the page-level push panel rendered in AppShell.
//
// Width animation (0 → 420px) pushes <main> — translateX would keep the 420px
// reserved even when closed; width genuinely removes flex space on close.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Skeleton, Tabs, TabsList, TabsTrigger, TabsContent, Button, Chip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@paystack/pax'
import { X, ArrowLeft, ArrowUp, ArrowDown, CheckCircle, Network, Landmark } from 'lucide-react'
import { usePanelContext } from '../../context/PanelContext'
import { useTransaction } from '../../hooks/useTransactions'
import { useAccount } from '../../hooks/useAccounts'
import { useCustomer } from '../../hooks/useCustomers'
import { useWebhook, useWebhookDeliveries } from '../../hooks/useWebhooks'
import { useRecipient } from '../../hooks/useRecipients'
import { useRequestLogEntry } from '../../hooks/useRequestLog'
import { Badge } from '../ui/Badge'
import { CopyButton } from '../ui/CopyButton'
import { Timeline } from '../ui/Timeline'
import { PanelSection, PanelRow } from './DetailPanel'
import { SendFundsModal } from '../ui/SendFundsModal'
import { formatAmount, formatUSDC, formatDatetime, formatDate, formatRelative } from '../../lib/format'
import { buildAlertItems, groupAlertItems, ALERT_CATEGORY_LABELS } from '../../lib/alerts'
import { accounts as allAccounts } from '../../mocks/fixtures/accounts'
import { transactions } from '../../mocks/fixtures/transactions'
import { transfers as allTransfers } from '../../mocks/fixtures/transfers'
import { customers as allCustomers } from '../../mocks/fixtures/customers'

const COUNTRY_NAMES = {
  NG: 'Nigeria',
  KE: 'Kenya',
  ZA: 'South Africa',
  GH: 'Ghana',
}

// Block explorer URLs per chain — used for onChainTxHash links
const CHAIN_EXPLORER = {
  base:     (hash) => `https://basescan.org/tx/${hash}`,
  solana:   (hash) => `https://solscan.io/tx/${hash}`,
  ethereum: (hash) => `https://etherscan.io/tx/${hash}`,
}

// Display labels for chain values (API uses lowercase)
const CHAIN_LABELS = {
  base:     'Base',
  solana:   'Solana',
  ethereum: 'Ethereum',
}

// PanelHeader — close button row, responsive.
// Mobile: back arrow (←) top-left, panel is full-screen, "back" = return to list.
// Tablet/desktop: × top-right, panel is a push drawer alongside the table.
// Why back vs ×: full-screen panel feels like a navigation drill-down (native app
// pattern). "Back" is the expected affordance. "Close" implies a floating overlay.
function PanelHeader({ onClose }) {
  return (
    <div className="flex items-center px-4 pt-4 pb-2 shrink-0">
      {/* Back arrow — mobile only (md:hidden). Left-aligned. 44×44px touch target. */}
      <button
        onClick={onClose}
        aria-label="Go back"
        className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary transition-colors cursor-pointer"
      >
        <ArrowLeft width={18} height={18} strokeWidth={1.75} />
      </button>

      {/* Spacer — pushes × to the right on tablet/desktop */}
      <div className="flex-1" />

      {/* × button — tablet/desktop only (hidden md:flex). Right-aligned. */}
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary transition-colors cursor-pointer"
      >
        <X width={16} height={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-28" />
      <div className="flex gap-2 mt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="border-t border-border-primary-light pt-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

// ─── Shell ─────────────────────────────────────────────────────────────────

// NeedsAttentionPanel — full-list view of all operational alerts, grouped by category.
// Opened by the "View all →" button in the Overview "Needs Attention" card.
// Each row navigates to the relevant page; AppShell closes this panel automatically
// on route change via its location.pathname useEffect.
function NeedsAttentionPanel() {
  const navigate = useNavigate()
  const items = buildAlertItems(navigate)
  const groups = groupAlertItems(items)

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-content-primary">Needs attention</h2>
        <p className="text-sm text-content-tertiary mt-0.5">
          {items.length === 0
            ? 'No issues at this time.'
            : `${items.length} item${items.length !== 1 ? 's' : ''} need review`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-sm text-content-tertiary">
          <CheckCircle width={15} height={15} strokeWidth={1.75} className="text-feedback-success-main flex-shrink-0" aria-hidden="true" />
          Everything looks good.
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([category, catItems]) => (
            <div key={category}>
              {/* Category header — same style as PanelSection labels */}
              <div className="text-xs font-semibold text-content-tertiary uppercase tracking-[0.06em] mb-2">
                {ALERT_CATEGORY_LABELS[category]}
              </div>
              <div className="border border-border-primary-light rounded-lg overflow-hidden divide-y divide-border-primary-light">
                {catItems.map(item => (
                  <div
                    key={item.key}
                    onClick={item.onView}
                    className="px-3 py-2.5 cursor-pointer hover:bg-surface-secondary transition-colors"
                  >
                    <div className={`text-sm font-medium text-content-primary truncate leading-snug ${item.mono ? 'font-mono' : ''}`}>
                      {item.primary}
                    </div>
                    <div className="text-xs text-content-tertiary mt-0.5 truncate">
                      {item.secondary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function GlobalPanel() {
  const { panelState, closePanel } = usePanelContext()
  const isOpen = !!panelState.type

  return (
    // role="complementary" makes this a named landmark — screen reader users navigating
    // by landmarks (a common pattern) can jump directly to the detail panel.
    // aria-hidden when closed: the panel has zero width but its DOM content still
    // exists. aria-hidden prevents screen readers from finding focusable elements
    // inside the collapsed panel before it's opened.
    // Responsive panel widths:
    //   Mobile  (< md): 100vw — full screen, covers content entirely.
    //   Tablet  (md:  ): 380px — push panel alongside table.
    //   Desktop (lg:  ): 420px — push panel alongside table.
    //
    // On mobile, <main> collapses to width 0 (flex-1 with the panel taking 100vw).
    // overflow-hidden on the parent clips this. The operator sees only the panel.
    // Closing restores <main> to flex-1.
    //
    // The inner container is fixed to the panel's width so the scrollable content
    // doesn't reflux during the width animation on close.
    <div
      role="complementary"
      aria-label="Detail panel"
      aria-hidden={!isOpen}
      className={[
        'shrink-0 bg-surface-primary border-l border-border-primary-light flex flex-col',
        'transition-all duration-200 ease-out overflow-hidden',
        isOpen ? 'w-screen md:w-[380px] lg:w-[420px]' : 'w-0',
      ].join(' ')}
    >
      <div className="w-screen md:w-[380px] lg:w-[420px] flex flex-col h-full">
        <PanelHeader onClose={closePanel} />
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {panelState.type === 'transaction' && (
            <TransactionPanel id={panelState.id} />
          )}
          {panelState.type === 'account' && (
            <AccountPanel id={panelState.id} />
          )}
          {panelState.type === 'customer' && (
            <CustomerPanel id={panelState.id} />
          )}
          {panelState.type === 'webhook' && (
            <WebhookPanel id={panelState.id} />
          )}
          {panelState.type === 'recipient' && (
            <RecipientPanel id={panelState.id} />
          )}
          {panelState.type === 'requestLog' && (
            <RequestLogPanel id={panelState.id} />
          )}
          {panelState.type === 'needs_attention' && (
            <NeedsAttentionPanel />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Transaction panel ──────────────────────────────────────────────────────

function TransactionPanel({ id }) {
  const { data: txn, loading, error } = useTransaction(id)
  if (loading) return <PanelSkeleton />
  if (error || !txn) return <p className="text-sm text-feedback-danger-main">Failed to load transaction.</p>
  return <TransactionDetail txn={txn} />
}

function TransactionDetail({ txn }) {
  const destAccount = txn.destinationAccount
    ? allAccounts.find((a) => a.id === txn.destinationAccount)
    : null
  const customerName = destAccount?.owner === 'customer' ? destAccount.customer : null

  const explorerUrl = txn.onChainTxHash && txn.chain
    ? CHAIN_EXPLORER[txn.chain]?.(txn.onChainTxHash)
    : null

  return (
    <div className="space-y-6">
      {/* Header — ID is the primary identity, timestamp is the context anchor.
          The corridor (NGN → USDC) belongs in the Conversion section as a field,
          not here. The ID is what operators use to look things up, file support
          tickets, and reconcile against their own records. */}
      <div>
        <div className="font-mono text-sm font-medium text-content-primary leading-snug mb-1">
          {txn.id}
        </div>
        <div className="text-xs text-content-tertiary mb-3">
          {formatDatetime(txn.createdAt)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="status" value={txn.status} />
          <Badge variant="type" value={txn.type} />
        </div>
      </div>

      <div className="border-t border-border-primary-light" />

      {/* Reversed note — subtle callout, not an error state */}
      {txn.status === 'reversed' && (
        <div className="rounded-lg border border-border-primary-light bg-surface-secondary px-4 py-3">
          <p className="text-sm text-content-secondary">
            This transaction was reversed. Funds have been returned to the source.
          </p>
        </div>
      )}

      {/* Canceled note */}
      {txn.status === 'canceled' && txn.cancelReason && (
        <div className="rounded-lg border border-border-primary-light bg-surface-secondary px-4 py-3">
          <p className="text-sm text-content-secondary">{txn.cancelReason}</p>
        </div>
      )}

      {/* Conversion section — corridor, amounts, rate */}
      {txn.type === 'conversion' && (
        <PanelSection title="Conversion">
          <PanelRow label="Corridor">{txn.corridor}</PanelRow>
          <PanelRow label="Source">
            {formatAmount(txn.sourceAmount, txn.sourceCurrency)}
          </PanelRow>
          <PanelRow label="Source Method">{txn.sourceMethod}</PanelRow>
          <PanelRow label="Converted">
            {formatAmount(txn.destAmount, txn.destCurrency)}
          </PanelRow>
          {txn.rate && (
            <PanelRow label="Rate">
              1 USDC = {txn.rate.toLocaleString()}{' '}
              {txn.sourceCurrency === 'USDC' ? txn.destCurrency : txn.sourceCurrency}
            </PanelRow>
          )}
        </PanelSection>
      )}

      {/* Transfer section — deposits and withdrawals */}
      {(txn.type === 'deposit' || txn.type === 'withdrawal') && (
        <PanelSection title="Transfer">
          <PanelRow label="Amount">
            {formatAmount(txn.destAmount, txn.destCurrency)}
          </PanelRow>
          <PanelRow label={txn.type === 'deposit' ? 'From' : 'Via'}>
            {txn.sourceMethod}
          </PanelRow>
          <PanelRow label="To">{txn.destination}</PanelRow>
        </PanelSection>
      )}

      {/* Settled to — on-chain wallet destination */}
      {txn.walletAddress && (
        <PanelSection title="Settled To">
          {customerName && (
            <PanelRow label="Customer">
              <Link to="/dashboard/customers" className="text-sm font-medium link">
                {customerName}
              </Link>
            </PanelRow>
          )}
          <PanelRow label="Chain">{CHAIN_LABELS[txn.chain] ?? txn.chain}</PanelRow>
          <PanelRow label="Wallet">
            <span className="font-mono text-xs">{txn.walletAddressShort}</span>
            <CopyButton text={txn.walletAddress} />
          </PanelRow>
        </PanelSection>
      )}

      {/* Failure reason */}
      {txn.failureReason && (
        <PanelSection title="Failure Reason">
          <p className="text-sm text-feedback-danger-main">{txn.failureReason}</p>
        </PanelSection>
      )}

      {/* References — IDs for developer correlation + on-chain hash for settlement verification.
          On-chain hash is here (not a separate section) because operators encounter it in the
          same context as other references: "what's the ID for this transaction?" Keeping all
          external identifiers in one section reduces panel scrolling and mental context switching.
          If onChainTxHash is null (fiat transactions), the row is omitted entirely. */}
      <PanelSection title="References">
        <PanelRow label="Transaction ID">
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{txn.id}</span>
            <CopyButton text={txn.id} />
          </span>
        </PanelRow>
        <PanelRow label="Merchant ref">
          {txn.merchant_reference ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs">{txn.merchant_reference}</span>
              <CopyButton text={txn.merchant_reference} />
            </span>
          ) : (
            <span className="text-content-quaternary">—</span>
          )}
        </PanelRow>
        {txn.onChainTxHash && (
          <>
            <PanelRow label="On-chain hash">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs">
                  {txn.onChainTxHash.slice(0, 10)}…{txn.onChainTxHash.slice(-4)}
                </span>
                <CopyButton text={txn.onChainTxHash} />
              </span>
            </PanelRow>
            {explorerUrl && (
              <PanelRow label="">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-action-primary-main hover:text-action-primary-dark"
                >
                  View on explorer ↗
                </a>
              </PanelRow>
            )}
          </>
        )}
      </PanelSection>

      {/* Timeline — mocked; requires stateHistory backend field for real data */}
      {txn.timeline?.length > 0 && (
        <PanelSection title="Timeline">
          <Timeline events={txn.timeline} />
        </PanelSection>
      )}
    </div>
  )
}

// ─── Account panel ──────────────────────────────────────────────────────────

// Returns the last 5 transactions involving this account as source or destination.
// Only completed + pending — failed/canceled/reversed are operational noise at this level.
// Sorted newest-first so the most recent activity is immediately visible.
function getRecentActivity(accountId) {
  return transactions
    .filter(
      (t) =>
        (t.sourceAccountId === accountId || t.destinationAccount === accountId) &&
        (t.status === 'completed' || t.status === 'pending'),
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
}

// One-line plain-language description of what happened, from this account's perspective.
//   Conversion:  corridor string ("NGN → USDC", "USDC → KES")
//   Deposit:     "From [sourceAddressShort]" — specific wallet address, never generic label
//   Withdrawal:  "To [destination]" — destination already carries the short address or bank name
function activityDescription(txn) {
  if (txn.type === 'conversion') return txn.corridor
  if (txn.type === 'deposit') {
    if (txn.sourceAddressShort) return `From ${txn.sourceAddressShort}`
    return `From ${txn.sourceMethod}`
  }
  if (txn.type === 'withdrawal') return `To ${txn.destination}`
  return txn.type
}

function AccountPanel({ id }) {
  const { data: account, loading, error } = useAccount(id)
  if (loading) return <PanelSkeleton />
  if (error || !account) return <p className="text-sm text-feedback-danger-main">Failed to load account.</p>
  return <AccountDetail account={account} />
}

// Format asOf timestamp as "As of Mar 19, 2026, 10:00 AM"
function AsOfNote({ timestamp }) {
  if (!timestamp) return null
  return (
    <div className="text-xs text-content-tertiary mt-1">
      Last updated: {formatDatetime(timestamp)}
    </div>
  )
}

function AccountDetail({ account }) {
  const navigate = useNavigate()
  const activity = getRecentActivity(account.id)
  const isMerchant = account.owner === 'merchant'
  const isFiat = account.type === 'fiat'

  // Send funds modal — opened from the "Send funds" button below.
  // Opens with this account pre-selected (step 1 skipped, starts at step 2).
  // preselectedAccountId communicates WHY step 1 is skipped, not just which step.
  const [sendFundsOpen, setSendFundsOpen] = useState(false)

  // Inline toast for account number copy — same pattern as ApiKey.jsx.
  // Lives here (not in CopyButton) because the message is context-specific.
  const [acctNumCopied, setAcctNumCopied] = useState(false)
  function handleAcctNumCopy() {
    setAcctNumCopied(true)
    setTimeout(() => setAcctNumCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-[18px] font-medium text-content-primary leading-snug mb-1">
          {account.label}
        </div>
        <div className="text-xs font-mono text-content-tertiary mb-3">
          {account.addressShort}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="type" value={account.type} />
          <Badge variant="status" value={account.status} />
          {isMerchant && <Badge variant="type" value="merchant" />}
        </div>
      </div>

      <div className="border-t border-border-primary-light" />

      <PanelSection title="Account">
        {!isMerchant && account.customer && (
          <PanelRow label="Customer">
            <Link to="/dashboard/customers" className="text-sm font-medium link">
              {account.customer}
            </Link>
          </PanelRow>
        )}
        {isMerchant && <PanelRow label="Owner">Acme Corp (merchant)</PanelRow>}

        {/* On-chain accounts: chain + wallet address */}
        {!isFiat && (
          <>
            {account.chain && (
              <PanelRow label="Chain">
                {CHAIN_LABELS[account.chain] ?? account.chain}
              </PanelRow>
            )}
            <PanelRow label="Address">
              <span className="font-mono text-xs">{account.addressShort}</span>
              <CopyButton text={account.address} />
            </PanelRow>
          </>
        )}

        {/* Fiat/virtual accounts: banking details */}
        {isFiat && (
          <>
            <PanelRow label="Bank name">{account.bankName}</PanelRow>
            <PanelRow label="Account name">{account.accountName}</PanelRow>
            <PanelRow label="Account number">
              <span className="font-mono text-xs">{account.addressShort}</span>
              <CopyButton text={account.accountNumber ?? account.address} onCopy={handleAcctNumCopy} />
            </PanelRow>
            <PanelRow label="Routing number">
              <span className="font-mono text-xs">{account.routingNumber}</span>
              <CopyButton text={account.routingNumber} />
            </PanelRow>
            <PanelRow label="Status">
              <Badge variant="status" value={account.status} />
            </PanelRow>
          </>
        )}

        <PanelRow label="Currency">{account.currency}</PanelRow>
        <PanelRow label="Balance">
          <div>
            <span className="font-semibold">
              {formatAmount(account.balance, account.currency)}
            </span>
            <AsOfNote timestamp={account.asOf} />
          </div>
        </PanelRow>
      </PanelSection>

      {/* Send funds — only visible when the account has a positive balance.
          Opens the modal with this account pre-selected (skips step 1). */}
      {account.balance > 0 && (
        <Button
          variant="outline"
          color="secondary"
          className="w-full cursor-pointer"
          onClick={() => setSendFundsOpen(true)}
        >
          <ArrowUp aria-hidden="true" />
          Send funds
        </Button>
      )}

      {sendFundsOpen && (
        <SendFundsModal
          key={account.id}
          open
          preselectedAccountId={account.id}
          onClose={() => setSendFundsOpen(false)}
        />
      )}

      {/* Recent Activity — always rendered; shows empty state when no transactions.
          getRecentActivity filters both source and destination, so outflows appear too.
          isCredit is determined by which field matched the account ID, not by type —
          the same USDC→NGN conversion is a debit for the source wallet and invisible
          to all other accounts. Account-centric, not transaction-centric.
          "View all" lives in the section header row — the established pattern for
          overflow sections in panels. */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
            Recent Activity
          </div>
          <Button
            variant="text"
            color="secondary"
            size="xs"
            className="cursor-pointer"
            onClick={() => navigate('/dashboard/transactions', { state: { filterAccountId: account.id } })}
          >
            View all
          </Button>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-content-tertiary text-center py-2">No activity yet.</p>
        ) : (
          <div>
            {activity.map((txn, index) => {
              const isCredit = txn.destinationAccount === account.id
              // Inflows: show what arrived (destAmount/destCurrency — the account's currency)
              // Outflows: show what left (sourceAmount/sourceCurrency — also the account's currency)
              const amount = isCredit
                ? formatAmount(txn.destAmount, txn.destCurrency)
                : formatAmount(txn.sourceAmount, txn.sourceCurrency)
              return (
                <div
                  key={txn.id}
                  className={[
                    'flex items-center gap-3 py-3',
                    index < activity.length - 1 ? 'border-b border-border-default' : '',
                  ].join(' ')}
                >
                  {/* Left: directional icon + description/timestamp stack.
                      items-start on inner flex aligns icon to the description line,
                      not the vertical midpoint of the two-line text block. */}
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isCredit ? (
                      <ArrowDown
                        width={16}
                        height={16}
                        strokeWidth={2.5}
                        className="text-feedback-success-main shrink-0 mt-px"
                      />
                    ) : (
                      <ArrowUp
                        width={16}
                        height={16}
                        strokeWidth={2.5}
                        className="text-feedback-danger-main shrink-0 mt-px"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-content-primary truncate leading-snug">
                        {activityDescription(txn)}
                      </div>
                      <div className="text-xs text-content-tertiary mt-0.5">
                        {formatRelative(txn.createdAt)}
                      </div>
                    </div>
                  </div>
                  {/* Right: signed amount, right-aligned, vertically centered */}
                  <div
                    className={[
                      'text-[13px] font-medium tabular-nums whitespace-nowrap',
                      isCredit ? 'text-feedback-success-main' : 'text-feedback-danger-main',
                    ].join(' ')}
                  >
                    {isCredit ? '+' : '−'}{amount}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Account number copy toast — fixed bottom-right, auto-dismisses after 2s */}
      {acctNumCopied && (
        <div className="fixed bottom-6 right-6 z-50 bg-content-primary text-surface-primary text-sm px-4 py-2.5 rounded-lg shadow-lg pointer-events-none">
          Account number copied
        </div>
      )}
    </div>
  )
}

// ─── Customer panel ──────────────────────────────────────────────────────────

function CustomerPanel({ id }) {
  const { data: customer, loading, error } = useCustomer(id)
  if (loading) return <PanelSkeleton />
  if (error || !customer) return <p className="text-sm text-feedback-danger-main">Failed to load customer.</p>
  return <CustomerDetail key={customer.id} customer={customer} />
}

function CustomerDetail({ customer }) {
  const navigate = useNavigate()

  const customerAccounts = allAccounts.filter((a) => a.customerId === customer.id)
  const customerTxns = transactions
    .filter((t) => t.customerId === customer.id)
    .slice(0, 15)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[18px] font-medium text-content-primary leading-snug mb-1">
          {customer.name}
        </div>
        <div className="text-xs font-mono text-content-tertiary mb-3">{customer.id}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="type" value={customer.type} />
          <Badge variant="status" value={customer.kycStatus} context="kyc" />
        </div>
      </div>

      <div className="border-t border-border-primary-light" />

      <PanelSection title="Profile">
        <PanelRow label="Name">{customer.name}</PanelRow>
        <PanelRow label="Type">
          <Badge variant="type" value={customer.type} />
        </PanelRow>
        <PanelRow label="Country">
          {customer.country
            ? (COUNTRY_NAMES[customer.country] ?? customer.country)
            : <span className="text-content-quaternary">—</span>}
        </PanelRow>
        <PanelRow label="Email">
          <span className="flex items-center gap-2">
            <span>{customer.email}</span>
            <CopyButton text={customer.email} />
          </span>
        </PanelRow>
        <PanelRow label="Phone">{customer.phone}</PanelRow>
        <PanelRow label="Created">{formatDate(customer.createdAt)}</PanelRow>
      </PanelSection>

      <PanelSection title="Balance">
        <div className="text-2xl font-semibold text-content-primary tabular-nums">
          {customer.balance > 0 ? (
            formatUSDC(customer.balance)
          ) : (
            <span className="text-content-quaternary">$0 USDC</span>
          )}
        </div>
      </PanelSection>

      {/* Tabs */}
      <Tabs defaultValue="accounts" className="gap-0">
        <TabsList className="-mx-6 px-6">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="kyc">KYC / Docs</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="-mx-6">
          <AccountsTab accounts={customerAccounts} navigate={navigate} />
        </TabsContent>
        <TabsContent value="transactions" className="-mx-6">
          <TransactionsTab txns={customerTxns} customerId={customer.id} navigate={navigate} />
        </TabsContent>
        <TabsContent value="kyc" className="-mx-6">
          <KycTab customer={customer} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Accounts tab ────────────────────────────────────────────────────────────

function AccountsTab({ accounts, navigate }) {
  if (accounts.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm text-content-tertiary">No accounts yet.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border-primary-light">
      {accounts.map((account) => (
        <button
          key={account.id}
          onClick={() => navigate('/dashboard/accounts', { state: { openAccountId: account.id } })}
          className="w-full grid grid-cols-[auto_1fr_auto] items-start gap-3 px-6 py-3.5 hover:bg-surface-secondary transition-colors text-left cursor-pointer"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-[3px] text-content-secondary cursor-default">
                  {account.type === 'fiat'
                    ? <Landmark width={16} height={16} strokeWidth={1.5} />
                    : <Network width={16} height={16} strokeWidth={1.5} />
                  }
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {account.type === 'fiat' ? 'Fiat account' : 'On-chain account'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="min-w-0">
            <div className="text-sm font-medium text-content-primary truncate">
              {account.label}
            </div>
            <div className="text-xs text-content-tertiary font-mono mt-0.5 truncate">
              {account.addressShort}
            </div>
          </div>
          <div className="self-center text-sm font-medium tabular-nums whitespace-nowrap text-right">
            {account.balance > 0 ? (
              <span className="text-content-primary">
                {formatAmount(account.balance, account.currency)}
              </span>
            ) : (
              <span className="text-content-tertiary">—</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Transactions tab ────────────────────────────────────────────────────────

function TransactionsTab({ txns, customerId, navigate }) {
  if (txns.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm text-content-tertiary">No transactions yet.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="divide-y divide-border-primary-light">
        {txns.map((txn) => {
          // Conversions: credit if fiat→USDC (destCurrency === 'USDC')
          const isCredit = txn.type === 'conversion'
            ? txn.destCurrency === 'USDC'
            : txn.type === 'deposit'
          return (
            <div key={txn.id} className="flex items-start gap-3 px-6 py-4">
              <div className="shrink-0 mt-0.5">
                <Badge variant="type" value={txn.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={[
                      'text-sm font-semibold tabular-nums',
                      isCredit ? 'text-feedback-success-main' : 'text-content-primary',
                    ].join(' ')}
                  >
                    {isCredit ? '+' : '-'}
                    {formatAmount(txn.destAmount, txn.destCurrency)}
                  </span>
                  <Badge variant="status" value={txn.status} />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-content-tertiary">{txn.corridor}</span>
                  <span className="text-xs text-content-tertiary">
                    {formatRelative(txn.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-6 py-4 border-t border-border-primary-light">
        <button
          onClick={() => navigate('/dashboard/transactions', { state: { filterCustomerId: customerId } })}
          className="text-sm link cursor-pointer"
        >
          View all transactions →
        </button>
      </div>
    </div>
  )
}

// ─── KYC / Docs tab ──────────────────────────────────────────────────────────
//
// Full 9-state coverage. Each state shows a contextual note and, where
// applicable, a button to copy the KYC link (share with customer to resume)
// or TOS link (share to accept terms before transacting).
//
// States where we show the KYC link: not_started, incomplete,
//   awaiting_questionnaire, awaiting_ubo — customer needs to take action.
// States where no action is needed: under_review, active, rejected,
//   paused, offboarded.

// KYC_STATUS_CONTENT — message text and whether to show the KYC link.
// Title and color fields removed: the badge is the status indicator; prose is explanation only.
const KYC_STATUS_CONTENT = {
  active: {
    message: 'Customer has passed all required KYC checks.',
    showKycLink: false,
  },
  not_started: {
    message: 'Customer has not started KYC.',
    showKycLink: true,
  },
  incomplete: {
    message: 'Customer has not completed KYC.',
    showKycLink: true,
  },
  awaiting_questionnaire: {
    message: 'Waiting for customer to complete their questionnaire.',
    showKycLink: true,
  },
  awaiting_ubo: {
    message: 'Waiting for customer to disclose their ultimate beneficial owner.',
    showKycLink: true,
  },
  under_review: {
    message: 'Documents submitted and under review. No action required.',
    showKycLink: false,
  },
  rejected: {
    message: 'KYC was rejected. This customer cannot transact.',
    showKycLink: false,
  },
  paused: {
    message: "This customer's account has been paused.",
    showKycLink: false,
  },
  offboarded: {
    message: 'This customer has been offboarded.',
    showKycLink: false,
  },
}

// CopyTextLink — inline text link that copies to clipboard.
// Used for KYC and TOS links so the action reads as a simple affordance, not a button.
function CopyTextLink({ text, label }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button
      onClick={handleCopy}
      className="link text-sm cursor-pointer text-left"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

function KycTab({ customer }) {
  const { kycStatus, type, kycLink, tosLink, tosStatus } = customer
  const isBusiness = type === 'business'
  const content = KYC_STATUS_CONTENT[kycStatus]

  const docs = [
    { label: 'Government ID' },
    { label: 'Proof of address' },
    ...(isBusiness ? [{ label: 'Business registration' }, { label: 'UBO declaration' }] : []),
  ]

  return (
    <div className="px-6 py-5 space-y-6">
      {/* KYC Status */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-4">
          KYC Status
        </div>
        {content && (
          <div className="flex items-start gap-2">
            <Badge variant="status" value={kycStatus} context="kyc" />
            <div className="flex flex-col gap-1">
              <span className="text-sm text-content-secondary">{content.message}</span>
              {content.showKycLink && kycLink && (
                <CopyTextLink text={kycLink} label="Copy KYC link →" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Terms of Service */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-4">
          Terms of Service
        </div>
        <div className="flex items-start gap-2">
          <Badge variant="status" value={tosStatus ? 'completed' : 'pending'}>
            {tosStatus ? 'Accepted' : 'Not accepted'}
          </Badge>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-content-secondary">
              {tosStatus
                ? 'Customer has accepted the Terms of Service and is eligible to transact.'
                : 'Customer has not accepted the Terms of Service.'}
            </span>
            {!tosStatus && tosLink && (
              <CopyTextLink text={tosLink} label="Copy TOS link →" />
            )}
          </div>
        </div>
      </div>

      {/* Documents — two-column list; no icons to avoid false interactive affordance */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-4">
          Documents
        </div>
        <div className="divide-y divide-border-default">
          {docs.map((doc) => (
            <div key={doc.label} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-content-primary">{doc.label}</span>
              <span className="text-sm text-content-secondary">Not submitted</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Recipient panel ──────────────────────────────────────────────────────────

const RECIPIENT_RAIL_LABELS = {
  ach:          'ACH',
  ach_same_day: 'ACH Same-day',
  wire:         'Wire',
  solana:       'Solana',
  ethereum:     'Ethereum',
  base:         'Base',
}

const RECIPIENT_CHAIN_LABELS = {
  base:     'Base',
  solana:   'Solana',
  ethereum: 'Ethereum',
}

function RecipientPanel({ id }) {
  const { data: recipient, loading, error } = useRecipient(id)
  if (loading) return <PanelSkeleton />
  if (error || !recipient) return <p className="text-sm text-feedback-danger-main">Failed to load recipient.</p>
  return <RecipientDetail recipient={recipient} />
}

function RecipientDetail({ recipient }) {
  const navigate = useNavigate()
  const isFiat = recipient.type === 'fiat'

  // Look up the customer for the link
  const customer = allCustomers.find((c) => c.id === recipient.customerId)

  // Last 3 transfers to this recipient — read directly from the transfers fixture.
  // Same pattern as account recent activity: no extra fetch needed, fixture is small.
  const recentTransfers = [...allTransfers]
    .filter((t) => t.recipientId === recipient.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3)

  function truncateAddress(addr) {
    if (!addr || addr.length <= 14) return addr
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-[18px] font-medium text-content-primary leading-snug mb-1">
          {recipient.name}
        </div>
        <div className="font-mono text-xs text-content-tertiary mb-3">{recipient.id}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="type" value={isFiat ? 'fiat' : 'crypto'} />
          <Badge variant="status" value={recipient.status} />
        </div>
      </div>

      <div className="border-t border-border-primary-light" />

      {/* Fiat: banking profile */}
      {isFiat && (
        <PanelSection title="Profile">
          <PanelRow label="Owner name">{recipient.accountOwnerName}</PanelRow>
          <PanelRow label="Bank">{recipient.bankName}</PanelRow>
          <PanelRow label="Account number">
            <span className="font-mono text-xs">{recipient.accountNumberMasked}</span>
            <CopyButton text={recipient.accountNumber} />
          </PanelRow>
          <PanelRow label="Routing number">
            <span className="font-mono text-xs">{recipient.routingNumber}</span>
            <CopyButton text={recipient.routingNumber} />
          </PanelRow>
          <PanelRow label="Account type">
            {recipient.accountType.charAt(0).toUpperCase() + recipient.accountType.slice(1)}
          </PanelRow>
          <PanelRow label="Rail">
            {RECIPIENT_RAIL_LABELS[recipient.rail] ?? recipient.rail}
          </PanelRow>
        </PanelSection>
      )}

      {/* Crypto: wallet profile */}
      {!isFiat && (
        <PanelSection title="Account">
          <PanelRow label="Chain">
            {RECIPIENT_CHAIN_LABELS[recipient.chain] ?? recipient.chain}
          </PanelRow>
          <PanelRow label="Address">
            <span className="font-mono text-xs">{truncateAddress(recipient.walletAddress)}</span>
            <CopyButton text={recipient.walletAddress} />
          </PanelRow>
          <PanelRow label="Rail">
            {RECIPIENT_RAIL_LABELS[recipient.rail] ?? recipient.rail}
          </PanelRow>
        </PanelSection>
      )}

      {/* Customer link */}
      {customer && (
        <PanelSection title="Customer">
          <PanelRow label="Customer">
            <button
              onClick={() => navigate('/dashboard/customers', { state: { openCustomerId: customer.id } })}
              className="text-sm font-medium link cursor-pointer"
            >
              {customer.name}
            </button>
          </PanelRow>
        </PanelSection>
      )}

      {/* Recent transfers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
            Transfers
          </div>
          <Button
            variant="text"
            color="secondary"
            size="xs"
            className="cursor-pointer"
            onClick={() => navigate('/dashboard/transactions', { state: { filterRecipientId: recipient.id, filterRecipientLabel: recipient.name } })}
          >
            View all
          </Button>
        </div>
        {recentTransfers.length === 0 ? (
          <p className="text-sm text-content-tertiary">No transfers yet.</p>
        ) : (
          <div className="space-y-3">
            {recentTransfers.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-content-primary tabular-nums">
                    {formatAmount(transfer.amount, transfer.sourceCurrency.toUpperCase())}
                  </div>
                  <div className="text-xs text-content-tertiary mt-0.5">
                    {formatDate(transfer.createdAt)}
                  </div>
                </div>
                <Badge variant="status" value={transfer.status.toLowerCase()} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Webhook panel ────────────────────────────────────────────────────────────

function WebhookPanel({ id }) {
  const { data: webhook, loading, error } = useWebhook(id)
  if (loading) return <PanelSkeleton />
  if (error || !webhook) return <p className="text-sm text-feedback-danger-main">Failed to load endpoint.</p>
  return <WebhookDetail key={id} webhook={webhook} />
}

function WebhookDetail({ webhook }) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const { data: deliveries, meta, loading: dLoading } = useWebhookDeliveries(webhook.id, page)

  const summary = webhook.deliverySummary ?? { total: 0, failed: 0, lastAt: null }
  const delivered = summary.total - summary.failed
  const successRate =
    summary.total > 0
      ? ((delivered / summary.total) * 100).toFixed(1)
      : '100.0'

  function toggleExpand(deliveryId) {
    setExpandedId((prev) => (prev === deliveryId ? null : deliveryId))
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-sm text-content-primary break-all leading-snug mb-1">
          {webhook.url}
        </div>
        <div className="text-xs text-content-tertiary mb-3 uppercase tracking-wide font-medium">
          Endpoint
        </div>
        <Badge variant="status" value={webhook.status} />
      </div>

      <div className="border-t border-border-primary-light" />

      <PanelSection title="Endpoint">
        <PanelRow label="URL">
          <span className="font-mono text-xs break-all">{webhook.url}</span>
        </PanelRow>
        <PanelRow label="Status">
          <Badge variant="status" value={webhook.status} />
        </PanelRow>
        <PanelRow label="Events">
          <span className="text-sm">{webhook.events.join(' • ')}</span>
        </PanelRow>
        <PanelRow label="Created">{formatDate(webhook.createdAt)}</PanelRow>
      </PanelSection>

      <PanelSection title="Delivery Summary">
        <PanelRow label="Total">{summary.total}</PanelRow>
        <PanelRow label="Delivered">
          <span className="text-feedback-success-main font-medium">{delivered}</span>
        </PanelRow>
        <PanelRow label="Failed">
          <span className={summary.failed > 0 ? 'text-feedback-danger-main font-medium' : 'text-content-secondary'}>
            {summary.failed}
          </span>
        </PanelRow>
        <PanelRow label="Success rate">{successRate}%</PanelRow>
      </PanelSection>

      <PanelSection title="Recent Deliveries">
        {dLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <p className="text-sm text-content-tertiary">No deliveries yet.</p>
        ) : (
          <DeliveryLog
            deliveries={deliveries}
            meta={meta}
            page={page}
            onPage={setPage}
            expandedId={expandedId}
            onExpand={toggleExpand}
          />
        )}
      </PanelSection>
    </div>
  )
}

// ─── Delivery log ─────────────────────────────────────────────────────────────

const DELIVERY_DOT = {
  delivered: 'bg-feedback-success-main',
  failed: 'bg-feedback-danger-main',
  pending: 'bg-feedback-information-main',
}

function statusLabel(delivery) {
  if (delivery.statusCode === 'timeout') return 'Timeout'
  if (delivery.statusCode === 200) return '200 OK'
  if (delivery.statusCode === null) return 'Pending'
  return `${delivery.statusCode} Error`
}

function DeliveryLog({ deliveries, meta, page, onPage, expandedId, onExpand }) {
  return (
    <div>
      <div className="divide-y divide-border-primary-light -mx-6">
        {deliveries.map((delivery) => (
          <DeliveryRow
            key={delivery.id}
            delivery={delivery}
            expanded={expandedId === delivery.id}
            onExpand={() => onExpand(delivery.id)}
          />
        ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-content-tertiary">
          <span>
            Showing {(page - 1) * meta.limit + 1}–
            {Math.min(page * meta.limit, meta.total)} of {meta.total} deliveries
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              className="px-2 py-1 rounded border border-border-primary-main disabled:opacity-40 hover:bg-surface-secondary cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => onPage(page + 1)}
              className="px-2 py-1 rounded border border-border-primary-main disabled:opacity-40 hover:bg-surface-secondary cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DeliveryRow({ delivery, expanded, onExpand }) {
  const isFailed = delivery.status === 'failed'
  const dotClass = DELIVERY_DOT[delivery.status] ?? 'bg-content-quaternary'
  const label = statusLabel(delivery)

  return (
    <div>
      <div
        onClick={onExpand}
        className="flex items-start gap-3 px-6 py-3 hover:bg-surface-secondary transition-colors cursor-pointer"
      >
        <div className={`mt-[6px] shrink-0 w-2 h-2 rounded-full ${dotClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-content-primary">
                {delivery.eventType}
              </span>
              <span className="font-mono text-xs text-content-tertiary truncate">
                {delivery.eventId}
              </span>
            </div>
            <span className="text-xs text-content-tertiary whitespace-nowrap shrink-0">
              {formatRelative(delivery.timestamp)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className={`text-xs ${isFailed ? 'text-feedback-danger-main' : 'text-content-tertiary'}`}>
              {label}
              {delivery.duration != null && (
                <span className="ml-2 text-content-quaternary">{delivery.duration}ms</span>
              )}
            </span>
            {isFailed && (
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-action-primary-main hover:text-action-primary-dark cursor-pointer font-medium shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && delivery.payload && (
        <div className="px-6 pb-4 bg-surface-secondary border-b border-border-primary-light">
          <div className="text-xs font-semibold uppercase tracking-widest text-content-tertiary mb-2 pt-3">
            Payload Preview
          </div>
          <pre className="text-xs text-content-secondary bg-surface-primary border border-border-primary-light rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre">
            {JSON.stringify(delivery.payload, null, 2)}
          </pre>
          <button className="text-xs text-content-quaternary mt-2 cursor-not-allowed">
            View full payload →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Request Log panel ──────────────────────────────────────────────────────
//
// Shows the full detail of a single API request: request body (with syntax
// highlighting), response, and a linked transaction if the response body
// contains a `reference` field matching a transaction ID in the fixture.
//
// JSON syntax highlighting rationale:
// A raw pre block with no highlighting puts all the cognitive load on the
// developer to visually parse keys from values. Coloring keys, strings, numbers
// and keywords separately makes the structure readable at a glance — the same
// reason every code editor uses syntax highlighting. We implement a minimal
// regex-based highlighter rather than a library: it handles our fixture data
// correctly and avoids adding a parse-tree dependency to what is ultimately
// a prototype display concern.

// Chip color override pattern — same as Badge.jsx
const RL_CHIP_OVERRIDES = {
  success:     '!bg-feedback-success-light !border-feedback-success-border',
  information: '!bg-feedback-information-light !border-feedback-information-border',
  warning:     '!bg-feedback-warning-light !border-feedback-warning-border',
  error:       '!bg-feedback-danger-light !border-feedback-danger-border',
}

function rlStatusColor(code) {
  if (code >= 200 && code < 300) return 'success'
  if (code === 401 || code >= 500) return 'error'
  if (code >= 400) return 'warning'
  return 'secondary'
}

const HTTP_STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
}

// Escape HTML entities before applying syntax highlight patterns.
// This prevents the JSON content from breaking the surrounding HTML if any
// value happens to contain < > & characters.
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Apply syntax highlighting via inline styles so the colours work regardless
// of whether Tailwind purges these generated class names in production.
// Pattern order matters: keys before values, so colon-separated pairs parse cleanly.
function syntaxHighlight(line) {
  const escaped = escapeHtml(line)
  return escaped
    // Object keys: "key":
    .replace(
      /(&quot;[\w\s-]+&quot;)\s*:/g,
      (_, key) => `<span style="color:#0f766e;font-weight:500">${key}</span>:`,
    )
    // String values: : "value"
    .replace(
      /:\s*(&quot;(?:[^&]|&[^q]|&q[^u]|&qu[^o]|&quo[^t])*?&quot;)/g,
      (_, str) => `: <span style="color:#7c3aed">${str}</span>`,
    )
    // Number values: : 1234.56
    .replace(
      /:\s*(-?\d+\.?\d*)/g,
      (_, num) => `: <span style="color:#0369a1">${num}</span>`,
    )
    // Keyword values: true | false | null
    .replace(
      /:\s*(true|false|null)\b/g,
      (_, kw) => `: <span style="color:#0369a1;font-style:italic">${kw}</span>`,
    )
}

// JsonBlock — formatted, optionally syntax-highlighted JSON with line limit + expand toggle.
// maxLines defaults to 15 per spec; callers can override.
function JsonBlock({ data, maxLines = 15, note }) {
  const [expanded, setExpanded] = useState(false)
  if (!data) return null
  const json = JSON.stringify(data, null, 2)
  const lines = json.split('\n')
  const truncated = lines.length > maxLines && !expanded
  const displayLines = truncated ? lines.slice(0, maxLines) : lines

  return (
    <div>
      <pre className="bg-surface-secondary border border-border-primary-light rounded-lg p-3.5 text-xs font-mono leading-relaxed overflow-x-auto">
        {displayLines.map((line, i) => (
          <div
            key={i}
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }}
          />
        ))}
        {truncated && (
          <div style={{ color: '#9ca3af' }}>  ...</div>
        )}
      </pre>
      <div className="flex items-center justify-between mt-1.5">
        {lines.length > maxLines && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-content-secondary hover:text-content-primary transition-colors cursor-pointer"
          >
            {expanded ? 'Show less' : `Show full (${lines.length} lines)`}
          </button>
        )}
        {note && lines.length <= maxLines && (
          <p className="text-xs text-content-quaternary">{note}</p>
        )}
        {note && lines.length > maxLines && expanded && (
          <p className="text-xs text-content-quaternary">{note}</p>
        )}
      </div>
    </div>
  )
}

function RequestLogPanel({ id }) {
  const { data: req, loading, error } = useRequestLogEntry(id)
  if (loading) return <PanelSkeleton />
  if (error || !req) return <p className="text-sm text-feedback-danger-main">Failed to load request.</p>
  return <RequestLogDetail req={req} />
}

function RequestLogDetail({ req }) {
  const navigate = useNavigate()
  const { openPanel } = usePanelContext()
  const statusColor = rlStatusColor(req.statusCode)
  const statusText = HTTP_STATUS_TEXT[req.statusCode] ?? ''

  // Linked transaction: if the response body has a `reference` field that
  // matches a transaction ID in the fixture, surface it as a deep link.
  // Rationale: POST /fx/v1/conversions returns a reference = the transaction ID.
  // The request log entry and transaction are different records — one shows
  // what was sent and how the API responded; the other shows what settled financially.
  const linkedTxId = req.responseBody?.reference
  const linkedTx = linkedTxId ? transactions.find((t) => t.id === linkedTxId) : null

  // For successful conversion responses, show key fields only — not the full body.
  // The conversion response has many fields; developers want to quickly confirm
  // the reference, status, and amounts. Full body is available on expand.
  const isConversionSuccess =
    req.statusCode < 300 &&
    req.responseBody?.reference &&
    req.responseBody?.source_currency &&
    req.responseBody?.converted_amount !== undefined

  const displayResponseBody = isConversionSuccess
    ? {
        reference: req.responseBody.reference,
        status: req.responseBody.status,
        source_currency: req.responseBody.source_currency,
        converted_amount: req.responseBody.converted_amount,
        rate: req.responseBody.rate,
      }
    : req.responseBody

  const isPost = req.method === 'POST'

  return (
    <div className="space-y-6">
      {/* ── Header — ID as primary identity ───────────────────────── */}
      <div>
        <div className="font-mono text-sm font-medium text-content-primary leading-snug mb-1">
          {req.id}
        </div>
        <div className="text-xs text-content-tertiary mb-3">
          {formatDatetime(req.timestamp)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Method badge */}
          <Chip
            variant="status"
            color={isPost ? 'information' : 'secondary'}
            className={isPost ? RL_CHIP_OVERRIDES.information : ''}
          >
            {req.method}
          </Chip>
          {/* Status code badge */}
          <Chip
            variant="status"
            color={statusColor}
            className={RL_CHIP_OVERRIDES[statusColor] ?? ''}
          >
            {req.statusCode}
          </Chip>
        </div>
      </div>

      <div className="border-t border-border-primary-light" />

      {/* ── Request metadata ──────────────────────────────────────── */}
      <PanelSection label="Request">
        <PanelRow label="Endpoint">
          <span className="font-mono text-xs break-all">{req.path}</span>
        </PanelRow>
        <PanelRow label="Method">{req.method}</PanelRow>
        <PanelRow label="Status">
          {req.statusCode} {statusText}
        </PanelRow>
        <PanelRow label="Latency">
          <span
            className={
              req.latencyMs > 600
                ? 'text-feedback-danger-main font-medium'
                : req.latencyMs >= 300
                ? 'text-feedback-warning-dark font-medium'
                : ''
            }
          >
            {req.latencyMs}ms
          </span>
        </PanelRow>
        <PanelRow label="IP address">
          <span className="font-mono text-xs">{req.ipAddress}</span>
        </PanelRow>
        <PanelRow label="Timestamp">{formatDatetime(req.timestamp)}</PanelRow>
      </PanelSection>

      {/* ── Request body — only for POST requests ─────────────────── */}
      {req.requestBody && (
        <PanelSection label="Request Body">
          <JsonBlock data={req.requestBody} maxLines={15} />
        </PanelSection>
      )}

      {/* ── Response ──────────────────────────────────────────────── */}
      <PanelSection label="Response">
        <div className="mb-3">
          <span
            className={[
              'text-sm font-semibold tabular-nums',
              statusColor === 'success' ? 'text-feedback-success-dark' :
              statusColor === 'error'   ? 'text-feedback-danger-main' :
              statusColor === 'warning' ? 'text-feedback-warning-dark' :
              'text-content-primary',
            ].join(' ')}
          >
            {req.statusCode}
          </span>
          {statusText && (
            <span className="text-sm text-content-secondary ml-1.5">{statusText}</span>
          )}
        </div>
        <JsonBlock
          data={displayResponseBody}
          maxLines={15}
          note={isConversionSuccess ? 'Showing key fields only.' : undefined}
        />
      </PanelSection>

      {/* ── Linked transaction ─────────────────────────────────────── */}
      {/* Only shown when the response `reference` field matches a known
          transaction ID. Connects the API call to its financial outcome. */}
      {linkedTx && (
        <PanelSection label="Linked Transaction">
          <div className="flex items-center justify-between gap-3 py-0.5">
            <div className="min-w-0">
              <div className="text-xs font-mono text-content-primary truncate">
                {linkedTx.id}
              </div>
              <div className="text-xs text-content-tertiary mt-0.5">
                {linkedTx.corridor} · {linkedTx.status}
              </div>
            </div>
            <button
              onClick={() =>
                navigate('/dashboard/transactions', {
                  state: { openTransactionId: linkedTx.id },
                })
              }
              className="text-xs text-action-primary-main hover:text-action-primary-dark font-medium cursor-pointer shrink-0 transition-colors"
            >
              View →
            </button>
          </div>
        </PanelSection>
      )}
    </div>
  )
}
