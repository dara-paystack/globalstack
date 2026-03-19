// Transfers — payouts from a customer account to a recipient.
//
// A transfer moves funds from a GlobalStack-managed account (source) to an
// external recipient destination. Cross-type is supported:
//   on-chain USDC account → fiat bank recipient  (platform converts)
//   fiat USD account      → crypto wallet recipient (platform converts)
//   on-chain USDC account → crypto wallet recipient (same-currency, no conversion)
//
// sourceAccountId   — account from accounts.js (customer-owned)
// sourceAccountType — virtual_account | on_chain_account
// sourceCurrency    — usd | usdc (matches the source account's currency)
// recipientId       — recipient from recipients.js
// recipientType     — fiat | crypto (denormalized from recipient for quick lookup)
// destinationCurrency — usd | usdc (the currency the recipient receives)
// paymentRail       — ach | wire | ach_same_day | solana | ethereum | base
// amount            — number, in the source currency units (USDC or USD)
//
// status: PENDING | COMPLETED | FAILED | CANCELED
//   PENDING   — in-flight, awaiting settlement
//   COMPLETED — fully settled, funds delivered
//   FAILED    — rejected by rails (e.g. invalid account, compliance hold)
//   CANCELED  — operator or system canceled before settlement
//
// completedAt — set only when status === 'COMPLETED'; null otherwise

export const transfers = [
  // ── John Adeyemi (cus_a1b2c3) ──────────────────────────────────────────────
  {
    id: 'trf_001',
    customerId: 'cus_a1b2c3',
    sourceAccountId: 'acc_c02',         // Savings Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_001',             // GTBank — John Adeyemi
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'wire',
    amount: 5000,
    merchantReference: 'payroll-jan-w1',
    status: 'COMPLETED',
    createdAt: '2026-02-18T10:30:00Z',
    completedAt: '2026-02-19T09:15:00Z',
  },
  {
    id: 'trf_002',
    customerId: 'cus_a1b2c3',
    sourceAccountId: 'acc_c02',         // Savings Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_002',             // Zenith Bank — John Adeyemi
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'ach',
    amount: 2500,
    merchantReference: 'payroll-jan-ops',
    status: 'COMPLETED',
    createdAt: '2026-02-18T10:35:00Z',
    completedAt: '2026-02-19T11:00:00Z',
  },
  {
    id: 'trf_003',
    customerId: 'cus_a1b2c3',
    sourceAccountId: 'acc_c_sol01',     // Solana Wallet (Solana, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_003',             // Solana Treasury — John Adeyemi
    recipientType: 'crypto',
    destinationCurrency: 'usdc',
    paymentRail: 'solana',
    amount: 1500,
    merchantReference: 'treasury-rebalance-01',
    status: 'COMPLETED',
    createdAt: '2026-02-25T14:00:00Z',
    completedAt: '2026-02-25T14:02:00Z',
  },
  {
    id: 'trf_012',
    customerId: 'cus_a1b2c3',
    sourceAccountId: 'acc_c01',         // Primary Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_001',             // GTBank — John Adeyemi
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'wire',
    amount: 3000,
    merchantReference: 'payroll-feb-w1',
    status: 'COMPLETED',
    createdAt: '2026-03-10T09:15:00Z',
    completedAt: '2026-03-11T10:30:00Z',
  },
  {
    id: 'trf_014',
    customerId: 'cus_a1b2c3',
    sourceAccountId: 'acc_c02',         // Savings Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_004',             // Ethereum Wallet — John Adeyemi
    recipientType: 'crypto',
    destinationCurrency: 'usdc',
    paymentRail: 'ethereum',
    amount: 4000,
    merchantReference: 'eth-transfer-01',
    status: 'FAILED',
    createdAt: '2026-03-14T16:00:00Z',
    completedAt: null,
  },

  // ── Wanjiku Holdings (cus_b2c3d4) ──────────────────────────────────────────
  {
    id: 'trf_004',
    customerId: 'cus_b2c3d4',
    sourceAccountId: 'acc_c09',         // Operations Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_005',             // KCB Bank — Wanjiku Holdings
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'wire',
    amount: 50000,
    merchantReference: 'feb-payroll-batch',
    status: 'COMPLETED',
    createdAt: '2026-02-20T08:00:00Z',
    completedAt: '2026-02-21T10:00:00Z',
  },
  {
    id: 'trf_005',
    customerId: 'cus_b2c3d4',
    sourceAccountId: 'acc_c08',         // Primary Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_007',             // Base Treasury — Wanjiku Holdings
    recipientType: 'crypto',
    destinationCurrency: 'usdc',
    paymentRail: 'base',
    amount: 20000,
    merchantReference: 'liquidity-pool-02',
    status: 'PENDING',
    createdAt: '2026-03-18T14:30:00Z',
    completedAt: null,
  },
  {
    id: 'trf_013',
    customerId: 'cus_b2c3d4',
    sourceAccountId: 'acc_c12',         // Reserve Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_005',             // KCB Bank — Wanjiku Holdings
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'wire',
    amount: 75000,
    merchantReference: 'mar-vendor-batch',
    status: 'PENDING',
    createdAt: '2026-03-15T11:00:00Z',
    completedAt: null,
  },

  // ── Cape Logistics Ltd (cus_c3d4e5) ────────────────────────────────────────
  {
    id: 'trf_006',
    customerId: 'cus_c3d4e5',
    sourceAccountId: 'acc_c20',         // Settlement Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_008',             // Standard Bank — Cape Logistics
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'wire',
    amount: 8500,
    merchantReference: 'freight-payment-q1',
    status: 'FAILED',
    createdAt: '2026-03-10T13:00:00Z',
    completedAt: null,
  },
  {
    id: 'trf_007',
    customerId: 'cus_c3d4e5',
    sourceAccountId: 'acc_c17',         // Operations Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_009',             // Ethereum Cold Wallet — Cape Logistics
    recipientType: 'crypto',
    destinationCurrency: 'usdc',
    paymentRail: 'ethereum',
    amount: 1200,
    merchantReference: 'cold-storage-01',
    status: 'COMPLETED',
    createdAt: '2026-03-05T09:30:00Z',
    completedAt: '2026-03-05T09:32:00Z',
  },
  {
    id: 'trf_015',
    customerId: 'cus_c3d4e5',
    sourceAccountId: 'acc_c18',         // Receiving Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_008',             // Standard Bank — Cape Logistics
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'wire',
    amount: 1500,
    merchantReference: 'freight-settlement-02',
    status: 'COMPLETED',
    createdAt: '2026-03-16T10:00:00Z',
    completedAt: '2026-03-16T14:30:00Z',
  },

  // ── Kwame Asante (cus_d4e5f6) ───────────────────────────────────────────────
  {
    id: 'trf_008',
    customerId: 'cus_d4e5f6',
    sourceAccountId: 'acc_c24',         // Savings Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_010',             // GCB Bank — Kwame Asante
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'ach',
    amount: 6000,
    merchantReference: 'personal-transfer-01',
    status: 'COMPLETED',
    createdAt: '2026-03-12T10:00:00Z',
    completedAt: '2026-03-13T08:00:00Z',
  },
  {
    id: 'trf_009',
    customerId: 'cus_d4e5f6',
    sourceAccountId: 'acc_c22',         // Primary Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_011',             // Solana Wallet — Kwame Asante
    recipientType: 'crypto',
    destinationCurrency: 'usdc',
    paymentRail: 'solana',
    amount: 3500,
    merchantReference: 'yield-staking-01',
    status: 'PENDING',
    createdAt: '2026-03-17T15:00:00Z',
    completedAt: null,
  },
  {
    id: 'trf_016',
    customerId: 'cus_d4e5f6',
    sourceAccountId: 'acc_c28',         // Payroll Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_010',             // GCB Bank — Kwame Asante
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'ach',
    amount: 4000,
    merchantReference: 'payroll-q1-march',
    status: 'COMPLETED',
    createdAt: '2026-03-18T08:00:00Z',
    completedAt: '2026-03-18T16:00:00Z',
  },

  // ── TechPay Solutions (cus_e5f6g7) ─────────────────────────────────────────
  // KYC rejected — these transfers predate the rejection
  {
    id: 'trf_010',
    customerId: 'cus_e5f6g7',
    sourceAccountId: 'acc_c31',         // Operations Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_012',             // Access Bank — TechPay Solutions
    recipientType: 'fiat',
    destinationCurrency: 'usd',
    paymentRail: 'ach_same_day',
    amount: 900,
    merchantReference: 'vendor-pay-01',
    status: 'CANCELED',
    createdAt: '2026-03-08T12:00:00Z',
    completedAt: null,
  },
  {
    id: 'trf_011',
    customerId: 'cus_e5f6g7',
    sourceAccountId: 'acc_c34',         // Receiving Wallet (Base, USDC)
    sourceAccountType: 'on_chain_account',
    sourceCurrency: 'usdc',
    recipientId: 'rec_013',             // Base Wallet — TechPay Solutions
    recipientType: 'crypto',
    destinationCurrency: 'usdc',
    paymentRail: 'base',
    amount: 500,
    merchantReference: 'treasury-move-01',
    status: 'COMPLETED',
    createdAt: '2026-03-03T09:00:00Z',
    completedAt: '2026-03-03T09:01:00Z',
  },
]
