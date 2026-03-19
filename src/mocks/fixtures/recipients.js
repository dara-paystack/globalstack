// Recipients — saved payout destinations belonging to a customer.
//
// A recipient is an EXTERNAL destination the platform routes payments to but
// does not control or custody. Two types:
//
//   fiat   — bank account (accountNumber, routingNumber, bankName, rail: ach|wire|ach_same_day)
//   crypto — on-chain wallet (walletAddress, chain, rail matches chain)
//
// Cross-type transfers are supported: a USDC account can pay out to a fiat
// bank recipient (platform converts automatically), and a USD virtual account
// can pay out to a crypto wallet recipient.
//
// accountNumberMasked — display value (012****890), shown in table/panel
// accountNumber       — full number, only used for CopyButton (never displayed raw)
// walletAddress       — full address; truncated with ...truncate in UI
//
// status: active | archived
//   archived = recipient removed from active use; still shows in history
//
// Rail values match the payment rail used for the transfer:
//   fiat:   ach | ach_same_day | wire
//   crypto: solana | ethereum | base

export const recipients = [
  // ── John Adeyemi (cus_a1b2c3) ──────────────────────────────────────────────
  {
    id: 'rec_001',
    customerId: 'cus_a1b2c3',
    type: 'fiat',
    name: 'GTBank — John Adeyemi',
    accountOwnerName: 'John Adeyemi',
    accountNumber: '0124567890',
    accountNumberMasked: '012****890',
    routingNumber: '021000021',
    bankName: 'GTBank',
    accountType: 'checking',
    rail: 'wire',
    status: 'active',
    createdAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'rec_002',
    customerId: 'cus_a1b2c3',
    type: 'fiat',
    name: 'Zenith Bank — John Adeyemi',
    accountOwnerName: 'John Adeyemi',
    accountNumber: '2017834521',
    accountNumberMasked: '201****521',
    routingNumber: '021000021',
    bankName: 'Zenith Bank',
    accountType: 'savings',
    rail: 'ach',
    status: 'active',
    createdAt: '2026-02-12T00:00:00Z',
  },
  {
    id: 'rec_003',
    customerId: 'cus_a1b2c3',
    type: 'crypto',
    name: 'Solana Treasury — John Adeyemi',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA6yQEUQmxBauT4',
    chain: 'solana',
    rail: 'solana',
    status: 'active',
    createdAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 'rec_004',
    customerId: 'cus_a1b2c3',
    type: 'crypto',
    name: 'Ethereum Wallet — John Adeyemi',
    walletAddress: '0xA3F8B7C2E1D4A9F3B8C2E1D4A9F3B8C2E1D4A9F3',
    chain: 'ethereum',
    rail: 'ethereum',
    status: 'active',
    createdAt: '2026-02-20T00:00:00Z',
  },

  // ── Wanjiku Holdings (cus_b2c3d4) ──────────────────────────────────────────
  {
    id: 'rec_005',
    customerId: 'cus_b2c3d4',
    type: 'fiat',
    name: 'KCB Bank — Wanjiku Holdings',
    accountOwnerName: 'Wanjiku Holdings Ltd',
    accountNumber: '1023456789',
    accountNumberMasked: '102****789',
    routingNumber: '021000021',
    bankName: 'KCB Bank Kenya',
    accountType: 'checking',
    rail: 'wire',
    status: 'active',
    createdAt: '2026-02-08T00:00:00Z',
  },
  {
    id: 'rec_006',
    customerId: 'cus_b2c3d4',
    type: 'fiat',
    name: 'Equity Bank — Wanjiku Holdings',
    accountOwnerName: 'Wanjiku Holdings Ltd',
    accountNumber: '0034517824',
    accountNumberMasked: '003****824',
    routingNumber: '021000021',
    bankName: 'Equity Bank Kenya',
    accountType: 'checking',
    rail: 'ach_same_day',
    // ARCHIVED — operator removed this after switching banks.
    // Still visible in history so past transfers retain context.
    status: 'archived',
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'rec_007',
    customerId: 'cus_b2c3d4',
    type: 'crypto',
    name: 'Base Treasury — Wanjiku Holdings',
    walletAddress: '0xF2C9B4E7A1D3F8B5C4E9A2D6F1B3C8E7A4D2F9B6',
    chain: 'base',
    rail: 'base',
    status: 'active',
    createdAt: '2026-02-22T00:00:00Z',
  },

  // ── Cape Logistics Ltd (cus_c3d4e5) ────────────────────────────────────────
  {
    id: 'rec_008',
    customerId: 'cus_c3d4e5',
    type: 'fiat',
    name: 'Standard Bank — Cape Logistics',
    accountOwnerName: 'Cape Logistics Ltd',
    accountNumber: '4521678903',
    accountNumberMasked: '452****903',
    routingNumber: '021000021',
    bankName: 'Standard Bank',
    accountType: 'checking',
    rail: 'wire',
    status: 'active',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'rec_009',
    customerId: 'cus_c3d4e5',
    type: 'crypto',
    name: 'Ethereum Cold Wallet — Cape Logistics',
    walletAddress: '0xB7E4C1A9F2D6B3E8C4A1F9D2B7E3C8A4F1D9B2E6',
    chain: 'ethereum',
    rail: 'ethereum',
    status: 'active',
    createdAt: '2026-03-05T00:00:00Z',
  },

  // ── Kwame Asante (cus_d4e5f6) ───────────────────────────────────────────────
  {
    id: 'rec_010',
    customerId: 'cus_d4e5f6',
    type: 'fiat',
    name: 'GCB Bank — Kwame Asante',
    accountOwnerName: 'Kwame Asante',
    accountNumber: '7890123456',
    accountNumberMasked: '789****456',
    routingNumber: '021000021',
    bankName: 'GCB Bank Ghana',
    accountType: 'savings',
    rail: 'ach',
    status: 'active',
    createdAt: '2026-02-28T00:00:00Z',
  },
  {
    id: 'rec_011',
    customerId: 'cus_d4e5f6',
    type: 'crypto',
    name: 'Solana Wallet — Kwame Asante',
    walletAddress: 'DsRPcUFSe5k6mNbE8xGjRtQwV4pLfYzK3hT9vJoAcMn',
    chain: 'solana',
    rail: 'solana',
    status: 'active',
    createdAt: '2026-03-02T00:00:00Z',
  },

  // ── TechPay Solutions (cus_e5f6g7) ─────────────────────────────────────────
  // KYC rejected — recipients still exist; no new transfers should be initiated
  {
    id: 'rec_012',
    customerId: 'cus_e5f6g7',
    type: 'fiat',
    name: 'Access Bank — TechPay Solutions',
    accountOwnerName: 'TechPay Solutions Ltd',
    accountNumber: '3456789012',
    accountNumberMasked: '345****012',
    routingNumber: '021000021',
    bankName: 'Access Bank',
    accountType: 'checking',
    rail: 'ach_same_day',
    status: 'active',
    createdAt: '2026-03-06T00:00:00Z',
  },
  {
    id: 'rec_013',
    customerId: 'cus_e5f6g7',
    type: 'crypto',
    name: 'Base Wallet — TechPay Solutions',
    walletAddress: '0xC6A3F8E1B4D9C2F7A8E3B1D6C4F9A2E8B5D3C7F1',
    chain: 'base',
    rail: 'base',
    status: 'active',
    createdAt: '2026-03-07T00:00:00Z',
  },
]
