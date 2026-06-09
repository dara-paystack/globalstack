// This file is the single source of truth for all page copy.
// llms.txt is auto-generated from this file via scripts/generate-llms.js
// Run `npm run generate-llms` to update llms.txt manually.
// Never edit public/llms.txt directly.

// ── Product / Hero ────────────────────────────────────────────────────────
export const HERO_HEADLINE = 'Move money across Africa and the world. In seconds.'
export const HERO_BODY = 'One API to accept, hold, convert, and pay out funds across 12 currencies in 18 African markets, powered by stablecoin infrastructure.'

// ── How It Works ──────────────────────────────────────────────────────────
export const HOW_HEADLINE = 'One API. Every direction money moves.'
export const HOW_SUBHEAD = 'Send, receive, or hold — GlobalStack handles the conversion, routing, and settlement. You just call the API.'

export const STEPS = [
  {
    num: '01',
    title: 'Send to Africa',
    endpoint: 'POST /v1/send',
    desc: 'Initiate in stablecoins. It arrives as NGN, KES, GHS, or mobile money in a few minutes — no FX desks, no correspondent delays.',
  },
  {
    num: '02',
    title: 'Receive from Africa',
    endpoint: 'POST /v1/receive',
    desc: 'Accept local currency payments across 18 markets. Settlement hits your wallet as stablecoins, instantly.',
  },
  {
    num: '03',
    title: 'USD account',
    endpoint: 'POST /v1/account',
    desc: 'Hold stablecoins in a programmable account. Sweep to any supported market on demand, at any time.',
  },
]

// ── Developer ─────────────────────────────────────────────────────────────
export const DEV_HEADLINE = 'Built API-first. Documented for humans.'
export const DEV_BODY = 'One integration gives you full coverage: OpenAPI spec, a sandbox that mirrors production, and real-time webhook events from day one.'

export const FEATURES = [
  { title: 'Single unified API', desc: 'One integration covers all three flows. No separate SDKs, no per-country endpoints.' },
  { title: 'Webhook events', desc: 'Get notified the moment a payment moves. Build reactive logic without polling.' },
  { title: 'Production-grade sandbox', desc: 'A full mirror of production. Test every flow before you ship a single line to live.' },
  { title: 'OpenAPI spec', desc: 'Download the spec and generate typed clients in any language, instantly.' },
]

// ── Stats ─────────────────────────────────────────────────────────────────
export const STATS_HEADLINE = 'Built to handle volume. Designed to stay out of your way.'

export const STATS = [
  { value: '18', label: 'African markets, live', numeric: true },
  { value: 'Minutes', label: 'From initiation to local delivery', numeric: false },
  { value: 'Stablecoins', label: 'Native — no conversion middlemen', numeric: false },
  { value: '24/7', label: 'Always on, no settlement windows', numeric: false },
]

// ── Markets ───────────────────────────────────────────────────────────────
export const MARKETS = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
  { code: 'SN', name: 'Senegal', currency: 'XOF' },
  { code: 'CI', name: 'Ivory Coast', currency: 'XOF' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN' },
  { code: 'AO', name: 'Angola', currency: 'AOA' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'MA', name: 'Morocco', currency: 'MAD' },
  { code: 'TN', name: 'Tunisia', currency: 'TND' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD' },
]

// ── Settlement ────────────────────────────────────────────────────────────
export const SETTLEMENT = {
  currency: 'Stablecoins (ERC-20 compatible)',
  time: 'A few minutes',
}

// ── Status ────────────────────────────────────────────────────────────────
export const STATUS = 'Now in private beta'
