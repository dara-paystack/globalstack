// Team fixture — operators with access to the GlobalStack dashboard.
//
// Each member has a role (admin | developer | finance) that describes their
// access level. See the Team page for the full permissions matrix.
//
// Status values:
//   active   — has accepted the invitation and can log in
//   invited  — invitation sent, not yet accepted (joinedAt is null)
//   suspended — access revoked; can no longer log in (lastActiveAt preserved)
//
// The current logged-in user is identified by name match ("Tolu Adeyinka").
// avatarInitials are derived from the first letter of each name component.
//
// Dates are anchored to 2026-03-19 (project fixture date).

export const team = [
  {
    id: 'user_001',
    name: 'Tolu Adeyinka',
    email: 'tolu@acmecorp.io',
    role: 'admin',
    status: 'active',
    avatarInitials: 'TA',
    joinedAt: '2025-11-03T09:00:00Z',
    invitedAt: '2025-11-01T14:00:00Z',
    lastActiveAt: '2026-03-19T13:47:00Z',  // matches apiKey.lastUsed — same session
  },
  {
    id: 'user_002',
    name: 'Amara Osei',
    email: 'amara@acmecorp.io',
    role: 'developer',
    status: 'active',
    avatarInitials: 'AO',
    joinedAt: '2025-11-10T11:00:00Z',
    invitedAt: '2025-11-08T10:00:00Z',
    lastActiveAt: '2026-03-19T09:22:00Z',
  },
  {
    id: 'user_003',
    name: 'Chisom Eze',
    email: 'chisom@acmecorp.io',
    role: 'finance',
    status: 'active',
    avatarInitials: 'CE',
    joinedAt: '2025-12-01T08:30:00Z',
    invitedAt: '2025-11-28T16:00:00Z',
    lastActiveAt: '2026-03-18T16:45:00Z',
  },
  {
    id: 'user_004',
    name: 'Bola Fashola',
    email: 'bola@acmecorp.io',
    role: 'developer',
    status: 'invited',
    avatarInitials: 'BF',
    joinedAt: null,          // not yet accepted
    invitedAt: '2026-03-17T11:00:00Z',
    lastActiveAt: null,      // never logged in
  },
  {
    id: 'user_005',
    name: 'Ngozi Okafor',
    email: 'ngozi@acmecorp.io',
    role: 'finance',
    status: 'active',
    avatarInitials: 'NO',
    joinedAt: '2026-01-15T10:00:00Z',
    invitedAt: '2026-01-13T09:00:00Z',
    lastActiveAt: '2026-03-17T14:10:00Z',
  },
  {
    id: 'user_006',
    name: 'Kweku Mensah',
    email: 'kweku@acmecorp.io',
    role: 'admin',
    status: 'suspended',
    avatarInitials: 'KM',
    joinedAt: '2025-11-03T09:00:00Z',
    invitedAt: '2025-11-01T14:00:00Z',
    lastActiveAt: '2026-02-28T17:30:00Z',  // preserved — last known session before suspension
  },
]
