export const webhooks = [
  {
    id: 'wh_01',
    url: 'https://api.acme.com/webhooks/gs',
    status: 'active',
    events: ['CONVERSION', 'TRANSFER', 'INDEXED_DEPOSIT'],
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'wh_02',
    url: 'https://api.acme.com/webhooks/backup',
    status: 'inactive',
    events: ['CONVERSION'],
    createdAt: '2026-02-01T14:30:00Z',
  },
]
