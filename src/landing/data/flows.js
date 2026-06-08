export const flows = [
  {
    id: '01',
    title: 'Send to Africa',
    description: 'Send USDC, deliver local currency via bank or mobile money.',
    code: `// Flow 01 — Send to Africa
{
  "flow": "send_to_africa",
  "amount": 10000,
  "currency": "USDC",
  "destination": {
    "country": "NG",
    "type": "bank_transfer",
    "account_number": "0123456789"
  }
}`,
  },
  {
    id: '02',
    title: 'Receive from Africa',
    description: 'Accept local currency payments, settle instantly as USDC.',
    code: `// Flow 02 — Receive from Africa
{
  "flow": "receive_from_africa",
  "source_country": "KE",
  "source_currency": "KES",
  "settlement": "USDC"
}`,
  },
  {
    id: '03',
    title: 'USD Account',
    description: 'Virtual USDC account with sweep to any African market.',
    code: `// Flow 03 — USD Account
{
  "flow": "usd_account",
  "action": "sweep",
  "destination_market": "GH"
}`,
  },
]
