import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, CheckCircle } from "lucide-react";
import { Skeleton, Button } from "@paystack/pax";
import { usePageTitle } from "../lib/usePageTitle";
import { useTransactions } from "../hooks/useTransactions";
import { useAccounts } from "../hooks/useAccounts";
import { usePanelContext } from "../context/PanelContext";
import { Sparkline } from "../components/ui/Sparkline";
import { Badge } from "../components/ui/Badge";
import { SendFundsModal } from "../components/ui/SendFundsModal";
import { formatUSDC, formatAmount, formatDatetime } from "../lib/format";
import { transactions as allTxns } from "../mocks/fixtures/transactions";
import { buildAlertItems } from "../lib/alerts";

// Derives a 7-day EOD balance series for a set of USDC accounts from the fixture
// transaction history. Works backwards from currentBalance using:
//   credits — transactions where destinationAccount is in accountIds (definitive)
//   debits  — off-ramps/withdrawals sourced from walletLabel (heuristic, since
//             the fixture has no sourceAccount field — only sourceMethod text)
//
// Anchors to the latest transaction date in the fixture rather than Date.now(),
// so the chart doesn't drift as time passes and fixture dates age.
function computeSparkline(accountIds, walletLabel, currentBalance) {
  const idSet = new Set(accountIds);

  // Find the latest date in the fixture to anchor the 7-day window
  const anchor = allTxns
    .map((t) => t.createdAt.slice(0, 10))
    .sort()
    .at(-1); // e.g. '2026-03-10'

  const anchorDate = new Date(anchor + "T00:00:00Z");
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchorDate);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  // Net USDC change per day
  const net = Object.fromEntries(days.map((d) => [d, 0]));
  allTxns.forEach((t) => {
    if (t.status !== "completed") return;
    const day = t.createdAt.slice(0, 10);
    if (!(day in net)) return;

    if (t.destinationAccount && idSet.has(t.destinationAccount) && t.destCurrency === "USDC") {
      net[day] += t.destAmount;
    } else if (
      (t.type === "off-ramp" || t.type === "withdrawal") &&
      t.sourceCurrency === "USDC" &&
      t.sourceMethod?.includes(walletLabel)
    ) {
      net[day] -= t.sourceAmount;
    }
  });

  // Walk backwards from currentBalance to get EOD balance each day
  const eod = {};
  eod[days.at(-1)] = currentBalance;
  for (let i = days.length - 2; i >= 0; i--) {
    eod[days[i]] = eod[days[i + 1]] - net[days[i + 1]];
  }

  return days.map((day) => ({
    day: new Date(day + "T12:00:00Z").toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    value: Math.max(0, Math.round(eod[day])),
  }));
}

function trendPercent(sparkline) {
  if (!sparkline.length) return null;
  const first = sparkline[0].value;
  const last = sparkline.at(-1).value;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Quick action icons — 14×14, inline, no background circles.
// These actions are secondary to the data — they shouldn't dominate visually.
const ACTIONS = [
  {
    label: "Add funds",
    icon: <ArrowDown width={13} height={13} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    label: "Send funds",
    icon: <ArrowUp width={13} height={13} strokeWidth={1.5} aria-hidden="true" />,
  },
];

export default function Overview() {
  usePageTitle('Overview')
  const navigate = useNavigate();
  const { data: txns, loading: txnLoading } = useTransactions({ limit: 5 });
  const { data: accounts, loading: accLoading } = useAccounts();
  const { panelState, openPanel } = usePanelContext();

  // Send funds modal — triggered by the "Send funds" quick action button.
  // No preselectedAccountId here — the modal starts at step 1 so the operator
  // picks the source account. The Account detail panel sets preselectedAccountId.
  const [sendFundsOpen, setSendFundsOpen] = useState(false);

  const merchantAccounts = accounts.filter((a) => a.owner === "merchant");
  const customerAccounts = accounts.filter((a) => a.owner === "customer");

  const treasuryBalance = merchantAccounts.reduce(
    (sum, a) => (a.currency === "USDC" ? sum + a.balance : sum),
    0,
  );
  const customerUsdcBalance = customerAccounts.reduce(
    (sum, a) => (a.currency === "USDC" ? sum + a.balance : sum),
    0,
  );
  const customerCount = new Set(
    customerAccounts.filter((a) => a.customerId).map((a) => a.customerId),
  ).size;

  // Alert items: derived synchronously from fixture imports — no loading state needed.
  // buildAlertItems is called every render; fixtures are in-memory, cost is negligible.
  const alertItems = buildAlertItems(navigate);

  // Card border reflects the most severe category present, providing peripheral
  // urgency awareness even before the operator reads the card.
  // api_error (especially 401/500) is urgent — integration may be broken.
  const hasUrgent = alertItems.some(i =>
    i.category === 'failed_txn' || i.category === 'webhook' ||
    i.category === 'api_error' || i.category === 'kyc_blocked',
  );
  const alertCardBorder = hasUrgent ? 'border-feedback-warning-border' : 'border-border-primary-light';
  const alertCardBg = hasUrgent ? 'bg-feedback-warning-light' : 'bg-surface-primary';

  // Show the 5 most recent items in the card; the rest live in the panel.
  const visibleAlertItems = alertItems.slice(0, 5)

  // Derived from fixture transactions — always consistent with the displayed balance.
  // merchantAccountIds: USDC accounts only. walletLabel: the sourceMethod text used
  // on off-ramps/withdrawals from this account (proxy for sourceAccount, which the
  // fixture doesn't have as a structured field).
  const merchantUsdcIds = merchantAccounts
    .filter((a) => a.currency === "USDC")
    .map((a) => a.id);
  const customerUsdcIds = customerAccounts
    .filter((a) => a.currency === "USDC")
    .map((a) => a.id);

  const merchantSparkline = computeSparkline(merchantUsdcIds, "Primary Wallet (John)", treasuryBalance);
  const customerSparkline = computeSparkline(customerUsdcIds, "Primary Wallet (Wanjiku)", customerUsdcBalance);

  // Total sparkline: sum of merchant + customer at each data point.
  // Both series use the same 7-day anchor, so they have the same labels and length.
  // Summing point-by-point gives the aggregate infrastructure balance over time.
  const totalBalance = treasuryBalance + customerUsdcBalance;
  const totalSparkline = merchantSparkline.map((pt, i) => ({
    day: pt.day,
    value: pt.value + customerSparkline[i].value,
  }));
  const totalTrend = trendPercent(totalSparkline);

  return (
    <>
    <div className="space-y-8">

      {/* Page header + quick actions.
          Mobile: stack vertically (flex-col), actions below heading.
          Tablet/desktop: side by side (sm:flex-row). */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-content-primary leading-snug">
            {getGreeting()}, Acme Corp
          </h1>
          <p className="text-sm text-content-tertiary mt-1">
            Here&apos;s what&apos;s happening across your treasury today.
          </p>
        </div>

        {/* Quick actions — compact outlined buttons. */}
        <div className="flex items-center gap-2">
          {ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              color="secondary"
              size="sm"
              className="cursor-pointer"
              onClick={action.label === "Send funds" ? () => setSendFundsOpen(true) : undefined}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Balance card ─────────────────────────────────────────────────────── */}
      {/* Mobile: single column (flex-col). Tablet/desktop: two-column (flex-row).
          Left/top (flex-[2]): label + number + trend + sparkline.
          Right/bottom (flex-[1]): breakdown rows.
          Divider: horizontal on mobile (h-px), vertical on desktop (w-px). */}
      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden flex flex-col md:flex-row">

        {/* ── Left column ── */}
        <div className="flex-[2] min-w-0 pt-5 pl-5 pr-0 pb-0 flex flex-col">
          <div className="text-xs font-medium text-content-tertiary mb-2">
            Total balance
          </div>

          {accLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-4 w-28" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-semibold text-content-primary tabular-nums leading-none">
                {formatUSDC(totalBalance)}
              </div>
              {totalTrend !== null && (
                <div className={[
                  "text-xs font-medium mt-2",
                  totalTrend >= 0 ? "text-feedback-success-dark" : "text-feedback-danger-dark",
                ].join(" ")}>
                  {totalTrend >= 0 ? "+" : ""}{totalTrend.toFixed(1)}% vs 7 days ago
                </div>
              )}
            </>
          )}

          {/* Sparkline — bleeds to the left card edge (-ml-5 cancels the pl-5
              column padding). At 60% card width the chart lands at ~4:1 aspect
              ratio with height=90, which feels natural without vertical stretch. */}
          <div className="mt-3 -ml-5">
            <Sparkline data={totalSparkline} dataKey="value" height={90} />
          </div>
        </div>

        {/* Divider: horizontal on mobile, vertical on desktop */}
        <div className="h-px md:h-auto md:w-px bg-border-primary-light flex-shrink-0" />

        {/* ── Right column ── */}
        {/* justify-center groups both rows at vertical center.
            divide-y draws the subtle separator between them without
            any extra border markup on the individual rows. */}
        <div className="flex-[1] flex flex-col justify-center divide-y divide-border-primary-light">
          {[
            {
              label: "Your balance",
              amount: treasuryBalance,
              // merchantUsdcIds already computed above — reuse directly
              meta: `${merchantUsdcIds.length} account${merchantUsdcIds.length !== 1 ? "s" : ""}`,
            },
            {
              label: "Customer funds",
              amount: customerUsdcBalance,
              // customerAccounts.length and customerCount both computed above
              meta: `${customerAccounts.length} account${customerAccounts.length !== 1 ? "s" : ""} · ${customerCount} customer${customerCount !== 1 ? "s" : ""}`,
            },
          ].map(({ label, amount, meta }) => (
            <div key={label} className="px-6 py-4">
              <div className="text-xs font-medium text-content-tertiary mb-2">
                {label}
              </div>
              {accLoading ? (
                <Skeleton className="h-4 w-32 mb-1" />
              ) : (
                <>
                  <div className="text-md font-medium text-content-primary tabular-nums">
                    {formatUSDC(amount)}
                  </div>
                  <div className="text-xs text-content-tertiary mt-0.5">
                    {meta}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Your accounts — full-width, like the balance card ──────────────── */}
      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-primary-light">
          <span className="text-xs font-semibold text-content-tertiary uppercase tracking-[0.06em]">
            Your accounts
          </span>
        </div>
        {accLoading ? (
          <div className="p-4 space-y-2.5">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : (
          <div className="divide-y divide-border-primary-light">
            {merchantAccounts.map((acc) => (
              <div
                key={acc.id}
                role="button"
                tabIndex={0}
                onClick={() => openPanel("account", acc.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel("account", acc.id) } }}
                className={[
                  "px-4 py-3 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-main focus-visible:ring-inset",
                  panelState.type === "account" && panelState.id === acc.id
                    ? "bg-surface-secondary"
                    : "hover:bg-surface-secondary",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-content-primary leading-snug">
                      {acc.label}
                    </div>
                    <div className="text-xs text-content-tertiary mt-0.5 font-mono">
                      {acc.addressShort} · {acc.currency}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-content-primary tabular-nums whitespace-nowrap">
                    {formatAmount(acc.balance, acc.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Transactions + Needs Attention ───────────────────────────────────── */}
      {/* Desktop: 2-col grid (transactions 2/3, alerts 1/3).
          Mobile: single column. Needs Attention comes FIRST on mobile (order-first)
          because it's more actionable than the full transaction list.
          CSS order-1/order-2 controls visual sequence without changing DOM order. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Recent transactions — order-2 on mobile (after alerts), order-1 on desktop */}
        <div className="col-span-1 md:col-span-2 order-2 md:order-1 bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-primary-light">
            <span className="text-xs font-semibold text-content-tertiary uppercase tracking-[0.06em]">
              Recent transactions
            </span>
          </div>

          {txnLoading ? (
            <div className="p-4 space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : txns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-content-tertiary">
                No transactions yet.
              </p>
              <p className="text-xs text-content-tertiary mt-1">
                Activity will appear here once you have movement on your
                accounts.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary-light bg-surface-secondary">
                  <th className="px-4 py-2 text-left text-xs font-medium text-content-tertiary">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-content-tertiary">Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-content-tertiary">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-content-tertiary">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary-light">
                {txns.map((txn) => (
                  // tabIndex={0} + onKeyDown: makes the row reachable and activatable
                  // by keyboard. Without this, keyboard users can never open the panel.
                  // Enter and Space are the standard keys for activating interactive elements.
                  <tr
                    key={txn.id}
                    onClick={() => openPanel("transaction", txn.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel("transaction", txn.id) } }}
                    tabIndex={0}
                    className={[
                      "cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-main focus-visible:ring-inset",
                      panelState.type === "transaction" && panelState.id === txn.id
                        ? "bg-surface-secondary"
                        : "hover:bg-surface-secondary",
                    ].join(" ")}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5 items-start">
                        <Badge variant="type" value={txn.type} />
                        <span className="text-xs text-content-tertiary">
                          {txn.corridor}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-content-primary text-right tabular-nums whitespace-nowrap">
                      {formatAmount(txn.destAmount, txn.destCurrency)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Badge variant="status" value={txn.status} />
                    </td>
                    <td className="px-4 py-2.5 text-sm text-content-tertiary text-right whitespace-nowrap">
                      {formatDatetime(txn.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Alerts column — order-1 on mobile (first), order-2 on desktop (second) */}
        <div className="order-1 md:order-2 space-y-4">
          {/* Needs attention — always rendered; content switches between all-clear and
              grouped alert items. Border colour reflects worst active category:
                danger  → failed transactions
                warning → webhook failures or KYC blocked customers
                neutral → stalled transactions only, or all-clear */}
          <div className={`bg-surface-primary border ${alertCardBorder} rounded-xl overflow-hidden`}>
            <div className="px-4 py-4 border-b border-feedback-warning-border bg-feedback-warning-light flex items-center gap-2">
              <span className="text-xs font-semibold text-feedback-warning-dark uppercase tracking-[0.06em] flex-1">
                Needs attention
              </span>
              {/* "View all →" opens the NeedsAttentionPanel for a focused full-list view */}
              {alertItems.length > 0 && (
                <Button
                  variant="text"
                  color="secondary"
                  size="xs"
                  className="cursor-pointer"
                  onClick={() => openPanel('needs_attention', 'all')}
                >
                  View all ({alertItems.length})
                </Button>
              )}
            </div>

            {alertItems.length === 0 ? (
              <div className="px-4 py-4 flex items-center gap-2">
                <CheckCircle width={15} height={15} strokeWidth={1.75} className="text-feedback-success-main flex-shrink-0" aria-hidden="true" />
                <span className="text-sm text-content-tertiary">Everything looks good.</span>
              </div>
            ) : (
              <div className="divide-y divide-border-primary-light">
                {visibleAlertItems.map(item => (
                  <div
                    key={item.key}
                    onClick={item.onView}
                    className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-surface-secondary transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium text-content-primary leading-snug ${item.mono ? 'font-mono' : ''}`}>
                        {item.primary}
                      </div>
                      <div className="text-xs text-content-tertiary mt-0.5 leading-none">
                        {item.secondary}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    <SendFundsModal
      open={sendFundsOpen}
      onClose={() => setSendFundsOpen(false)}
    />
    </>
  );
}
