// KYC status values (API) — 9 states, each requiring a different operator action:
//
//   not_started           — customer created but KYC not initiated
//   incomplete            — started but not submitted (missing documents)
//   awaiting_questionnaire — submitted, needs to complete a compliance questionnaire
//   awaiting_ubo          — business customer needs to disclose ultimate beneficial owner
//   under_review          — fully submitted, under compliance review
//   active                — KYC approved; customer can transact
//   rejected              — KYC failed; customer cannot transact
//   paused                — account temporarily suspended by operator
//   offboarded            — customer relationship ended
//
// Customer IDs use the cus_ prefix (not cust_) to match the API format.
//
// tosStatus: true = customer has accepted Terms of Service (required to transact)
// kycLink: share with customer to resume their KYC flow
// tosLink: share with customer to accept TOS
// country: ISO 3166-1 alpha-2 code, sourced from KYC submission — may be absent
//          for customers who haven't started KYC (not_started / incomplete states)

export const customers = [
  // ── Approved customers ──────────────────────────────────────────────────────
  {
    id: 'cus_a1b2c3',
    name: 'John Adeyemi',
    type: 'individual',
    country: 'NG',
    kycStatus: 'active',
    balance: 119550,
    currency: 'USDC',
    email: 'john.adeyemi@gmail.com',
    phone: '+234 802 345 6789',
    createdAt: '2026-02-15T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_john_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_john_kyc',
    kycLinkExpiresAt: '2026-03-17T00:00:00Z',  // 30d from createdAt; already expired — moot (kycStatus active)
  },
  {
    id: 'cus_b2c3d4',
    name: 'Wanjiku Holdings',
    type: 'business',
    country: 'KE',
    kycStatus: 'active',
    balance: 300080,
    currency: 'USDC',
    email: 'finance@wanjiku.co.ke',
    phone: '+254 712 345 678',
    createdAt: '2026-02-20T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_wanjiku_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_wanjiku_kyc',
    kycLinkExpiresAt: '2026-03-22T00:00:00Z',  // 30d from createdAt
  },

  // ── In-progress KYC ─────────────────────────────────────────────────────────
  {
    id: 'cus_c3d4e5',
    name: 'Cape Logistics Ltd',
    type: 'business',
    country: 'ZA',
    kycStatus: 'under_review',
    balance: 13850,
    currency: 'USDC',
    email: 'ops@capelogistics.co.za',
    phone: '+27 21 555 0192',
    createdAt: '2026-03-08T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_cape_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_cape_kyc',
    kycLinkExpiresAt: '2026-04-07T00:00:00Z',  // 30d from createdAt
  },
  {
    id: 'cus_d4e5f6',
    name: 'Kwame Asante',
    type: 'individual',
    country: 'GH',
    kycStatus: 'awaiting_ubo',
    balance: 46350,
    currency: 'USDC',
    email: 'kwame.asante@outlook.com',
    phone: '+233 24 567 8901',
    createdAt: '2026-03-01T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_kwame_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_kwame_kyc',
    kycLinkExpiresAt: '2026-03-31T00:00:00Z',  // 30d from createdAt — expires in 12 days
  },

  // ── Blocked customers ────────────────────────────────────────────────────────
  {
    id: 'cus_e5f6g7',
    name: 'TechPay Solutions',
    type: 'business',
    country: 'NG',
    kycStatus: 'rejected',
    balance: 2780,
    currency: 'USDC',
    email: 'hello@techpay.ng',
    phone: '+234 901 234 5678',
    createdAt: '2026-03-05T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_techpay_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_techpay_kyc',
    kycLinkExpiresAt: '2026-04-04T00:00:00Z',  // 30d from createdAt
  },

  // ── New customers — covering remaining KYC states ────────────────────────────
  {
    id: 'cus_f6g7h8',
    name: 'Emeka Okafor',
    type: 'individual',
    country: null,   // KYC not started — country not yet collected
    kycStatus: 'not_started',
    balance: 0,
    currency: 'USDC',
    email: 'emeka.okafor@gmail.com',
    phone: '+234 803 456 7890',
    createdAt: '2026-03-18T00:00:00Z',
    tosStatus: false,
    tosLink: 'https://app.globalstack.co/terms?token=tok_emeka_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_emeka_kyc',
    kycLinkExpiresAt: '2026-04-17T00:00:00Z',  // 30d from createdAt — expires in 29 days
  },
  {
    id: 'cus_g7h8i9',
    name: 'Amara Mensah',
    type: 'individual',
    country: 'GH',
    kycStatus: 'incomplete',
    balance: 750,
    currency: 'USDC',
    email: 'amara.mensah@yahoo.com',
    phone: '+233 20 345 6789',
    createdAt: '2026-03-15T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_amara_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_amara_kyc',
    kycLinkExpiresAt: '2026-04-14T00:00:00Z',  // 30d from createdAt — expires in 26 days
  },
  {
    id: 'cus_h8i9j0',
    name: 'Priya Capital Ltd',
    type: 'business',
    country: 'KE',
    kycStatus: 'awaiting_questionnaire',
    balance: 0,
    currency: 'USDC',
    email: 'admin@priyacapital.co.ke',
    phone: '+254 722 345 678',
    createdAt: '2026-03-12T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_priya_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_priya_kyc',
    kycLinkExpiresAt: '2026-04-11T00:00:00Z',  // 30d from createdAt — expires in 23 days
  },
  {
    id: 'cus_i9j0k1',
    name: 'Delta Freight Co',
    type: 'business',
    country: 'ZA',
    kycStatus: 'paused',
    balance: 4200,
    currency: 'USDC',
    email: 'accounts@deltafreight.co.za',
    phone: '+27 11 555 0340',
    createdAt: '2026-02-28T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_delta_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_delta_kyc',
    kycLinkExpiresAt: '2026-03-29T00:00:00Z',  // 30d from createdAt — expires in 10 days
  },
  {
    id: 'cus_j0k1l2',
    name: 'MobiPay Ltd',
    type: 'business',
    country: 'NG',
    kycStatus: 'offboarded',
    balance: 0,
    currency: 'USDC',
    email: 'ops@mobipay.ng',
    phone: '+234 902 345 6789',
    createdAt: '2026-01-10T00:00:00Z',
    tosStatus: true,
    tosLink: 'https://app.globalstack.co/terms?token=tok_mobipay_tos',
    kycLink: 'https://kyc.globalstack.co/start?token=tok_mobipay_kyc',
    kycLinkExpiresAt: '2026-02-09T00:00:00Z',  // 30d from createdAt — expired (offboarded)
  },
]
