// API key fixture — a single record since merchants have one live secret key.
// Keeping this as a separate fixture file (not inlined in handlers.js) so it
// can be extended or overridden without touching handler logic.

export const apiKey = {
  id: 'key_01HXYZ1234567890',
  key: 'sk_live_••••••••••••••••••••••••••••••••',
  status: 'active',
  created: '2026-01-15T00:00:00Z',
  lastUsed: '2026-03-19T13:47:00Z',
  totalRequests: 12847,
  requestsToday: 143,
  errorsToday: 2,
  lastIp: '41.190.3.xxx',
  // Realistic operator key: full transaction + account access, customer read-only,
  // no webhook management. Produces a balanced 5-granted / 3-denied two-column layout.
  permissions: [
    'transactions:read',
    'transactions:write',
    'accounts:read',
    'accounts:write',
    'customers:read',
  ],
  // Daily request counts for the last 7 days (index 6 = today, partial count).
  // These feed the sparkline on the Usage card.
  requestVolume: [843, 921, 1102, 987, 1243, 1891, 143],
}
