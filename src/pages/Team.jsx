// Team — shows who has access to the GlobalStack dashboard and what they can do.
//
// RBAC is informational only — roles are documented here but not enforced in
// the prototype. All users can see all pages regardless of their assigned role.
//
// Architecture: no custom hook — single one-shot fetch, no filters, no pagination.
// useState/useEffect inline is the right tool; a hook would be over-engineering.

import { useState, useEffect, useRef } from 'react'
import { Chip, Skeleton, Button, TextInput, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@paystack/pax'
import { X } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { formatDate, formatRelative } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'

const CURRENT_USER_NAME = 'Tolu Adeyinka'

const ROLE_LABEL = {
  admin:     'Admin',
  developer: 'Developer',
  finance:   'Finance',
}

// Permissions matrix data — RBAC informational only.
// ✓ uses success color; ✗ uses quaternary (absence is neutral, not an error).
const PERMISSIONS = [
  { label: 'Overview',     admin: true,  developer: true,  finance: true  },
  { label: 'Transactions', admin: true,  developer: true,  finance: true  },
  { label: 'Accounts',     admin: true,  developer: true,  finance: true  },
  { label: 'Recipients',   admin: true,  developer: true,  finance: true  },
  { label: 'Customers',    admin: true,  developer: true,  finance: true  },
  { label: 'API Key',      admin: true,  developer: true,  finance: false },
  { label: 'Webhooks',     admin: true,  developer: true,  finance: false },
  { label: 'Audit Log',    admin: true,  developer: false, finance: false },
  { label: 'Team',         admin: true,  developer: false, finance: false },
]

// ─────────────────────────────────────────────────────────────────────────────
// Modal shell — shared between InviteModal and PermissionsModal.
//
// Using a fixed-position overlay rather than a portal: the prototype has no
// createPortal setup, and fixed positioning achieves the same visual result
// without the extra DOM wiring. The backdrop click closes the modal —
// standard UX expectation for dismissible overlays.
//
// Focus trap is not implemented (out of scope for prototype). In production,
// use a library like @radix-ui/react-dialog (which Pax is built on) to
// handle focus management and keyboard navigation correctly.
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ onClose, children, width = 'max-w-md' }) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className={`relative z-10 w-full ${width} mx-4 bg-surface-primary rounded-2xl shadow-xl`}>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// InviteModal — form to invite a new team member.
//
// Fields: first name, last name, email, role (dropdown).
// On submit: shows a brief success state then closes. No real API call —
// the form captures the data but nothing is sent (prototype).
//
// Why split first + last name instead of a single "Full name" field:
// Two fields match what a real invite system needs (greeting the recipient
// by first name, generating initials, etc.). They're also less ambiguous
// for non-Western name conventions.
// ─────────────────────────────────────────────────────────────────────────────
function InviteModal({ onClose }) {
  const firstRef = useRef(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: '' })
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  // Focus first field on open
  useEffect(() => { firstRef.current?.focus() }, [])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    // Clear error on change
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim())  e.lastName  = 'Required'
    if (!form.email.trim())     e.email     = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.role)             e.role      = 'Select a role'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <Modal onClose={onClose}>
        <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-feedback-success-light flex items-center justify-center">
            <span className="text-feedback-success-main text-xl">✓</span>
          </div>
          <div>
            <p className="text-base font-semibold text-content-primary">Invitation sent</p>
            <p className="text-sm text-content-tertiary mt-1">
              {form.firstName} {form.lastName} will receive an email at{' '}
              <span className="font-medium text-content-secondary">{form.email}</span>.
            </p>
          </div>
          <Button variant="default" color="primary" onClick={onClose} className="mt-2">
            Done
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-primary-light">
        <div>
          <h2 className="text-base font-semibold text-content-primary">Invite team member</h2>
          <p className="text-xs text-content-tertiary mt-0.5">They'll receive an email invitation to join.</p>
        </div>
        <Button variant="ghost" color="secondary" size="sm" onClick={onClose} aria-label="Close" className="!size-8 !p-0">
          <X size={16} />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-6 py-5 space-y-4">
          {/* First + last name — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1.5">
                First name
              </label>
              <TextInput
                ref={firstRef}
                type="text"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Tolu"
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-xs text-feedback-danger-main mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1.5">
                Last name
              </label>
              <TextInput
                type="text"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Adeyinka"
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-xs text-feedback-danger-main mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1.5">
              Email address
            </label>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="tolu@acmecorp.io"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-feedback-danger-main mt-1">{errors.email}</p>
            )}
          </div>

          {/* Role dropdown */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-1.5">
              Role
            </label>
            {/* Role descriptions help the inviter pick the right scope without
                having to open the permissions reference first. */}
            <Select value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger
                className={[
                  'w-full h-10 rounded-xl border text-sm',
                  errors.role
                    ? '!border-feedback-danger-border'
                    : '',
                ].join(' ')}
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  Admin — full access
                </SelectItem>
                <SelectItem value="developer">
                  Developer — API &amp; technical access
                </SelectItem>
                <SelectItem value="finance">
                  Finance — operational access
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-feedback-danger-main mt-1">{errors.role}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-primary-light">
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="default" color="primary">
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PermissionsModal — the role permissions reference in a modal.
//
// Moving this from a collapsible section to a modal keeps the page scannable.
// Operators who need the reference can get it without the table appearing
// below the team list and pushing other content down.
// ─────────────────────────────────────────────────────────────────────────────
function PermissionsModal({ onClose }) {
  return (
    <Modal onClose={onClose} width="max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-primary-light">
        <div>
          <h2 className="text-base font-semibold text-content-primary">Role permissions</h2>
          <p className="text-xs text-content-tertiary mt-0.5">What each role can access in this dashboard.</p>
        </div>
        <Button variant="ghost" color="secondary" size="sm" onClick={onClose} aria-label="Close" className="!size-8 !p-0">
          <X size={16} />
        </Button>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary border-b border-border-primary-light">
              <th className="px-5 py-3 text-left text-xs font-medium text-content-tertiary">
                Page
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-content-tertiary">
                Admin
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-content-tertiary">
                Developer
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-content-tertiary">
                Finance
              </th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((row, i) => (
              <tr
                key={row.label}
                className={[
                  'border-b border-border-primary-light last:border-0',
                  i % 2 === 0 ? 'bg-surface-primary' : 'bg-surface-secondary',
                ].join(' ')}
              >
                <td className="px-5 py-2.5 text-content-secondary font-medium">
                  {row.label}
                </td>
                {['admin', 'developer', 'finance'].map((role) => (
                  <td key={role} className="px-4 py-2.5 text-center">
                    {row[role]
                      ? <span className="text-feedback-success-main font-medium">✓</span>
                      : <span className="text-content-quaternary">✗</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-border-primary-light">
        <p className="text-xs text-content-tertiary">
          Role permissions are set by GlobalStack. Contact your account manager to discuss custom access levels.
        </p>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MemberRow
// ─────────────────────────────────────────────────────────────────────────────
function MemberRow({ member }) {
  const isCurrentUser = member.name === CURRENT_USER_NAME
  const isSuspended   = member.status === 'suspended'
  const isInvited     = member.status === 'invited'

  let lastActive
  if (isInvited) {
    lastActive = <span className="text-content-tertiary">Never</span>
  } else if (member.lastActiveAt) {
    lastActive = (
      <span className={isSuspended ? 'text-content-tertiary' : 'text-content-secondary'}>
        {formatRelative(member.lastActiveAt)}
      </span>
    )
  } else {
    lastActive = <span className="text-content-tertiary">—</span>
  }

  let joined
  if (isInvited) {
    joined = (
      <span className="text-content-tertiary">
        Invited {formatDate(member.invitedAt)}
      </span>
    )
  } else if (member.joinedAt) {
    joined = (
      <span className={isSuspended ? 'text-content-tertiary' : 'text-content-secondary'}>
        {formatDate(member.joinedAt)}
      </span>
    )
  } else {
    joined = <span className="text-content-tertiary">—</span>
  }

  return (
    <tr className="border-b border-border-primary-light last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={[
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
            isSuspended
              ? 'bg-surface-tertiary text-content-tertiary'
              : 'bg-action-primary-light text-action-primary-main',
          ].join(' ')}>
            {member.avatarInitials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={[
                'text-sm font-medium',
                isSuspended ? 'text-content-tertiary' : 'text-content-primary',
              ].join(' ')}>
                {member.name}
              </span>
              {isCurrentUser && (
                <Chip variant="status" color="secondary" className="text-[10px] !px-1.5 !py-0">
                  You
                </Chip>
              )}
            </div>
            <div className={[
              'text-xs mt-0.5',
              isSuspended ? 'text-content-quaternary' : 'text-content-tertiary',
            ].join(' ')}>
              {member.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="type" value={member.role}>
          {ROLE_LABEL[member.role]}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant="status" value={member.status} />
      </td>
      <td className="px-4 py-3 text-sm">{lastActive}</td>
      <td className="px-4 py-3 text-sm">{joined}</td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function TeamSkeleton() {
  return (
    <div className="border border-border-primary-light rounded-xl overflow-hidden">
      <div className="bg-surface-secondary border-b border-border-primary-light">
        <div className="grid grid-cols-5 gap-4 px-4 py-2.5">
          {['Member', 'Role', 'Status', 'Last active', 'Joined'].map((col) => (
            <div key={col} className="text-xs font-medium text-content-tertiary">{col}</div>
          ))}
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border-primary-light last:border-0">
          <div className="grid grid-cols-5 gap-4 items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-2.5 w-32 rounded" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Team — main page component
// ─────────────────────────────────────────────────────────────────────────────
export default function Team() {
  usePageTitle('Team')

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showInvite, setShowInvite]           = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    fetch('/api/team')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load team')
        return r.json()
      })
      .then((json) => { setMembers(json.data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  return (
    <>
      {/* Modals — rendered outside the page flow so they sit above everything */}
      {showInvite      && <InviteModal      onClose={() => setShowInvite(false)} />}
      {showPermissions && <PermissionsModal onClose={() => setShowPermissions(false)} />}

      <div className="space-y-6">
        {/* Page header row — title/subtitle left, action buttons right, all center-aligned */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium text-content-primary">Team</h1>
            <p className="text-sm text-content-tertiary mt-0.5">
              People with access to this dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" color="secondary" size="sm" onClick={() => setShowPermissions(true)}>
              Role permissions
            </Button>
            <Button variant="default" color="primary" size="sm" onClick={() => setShowInvite(true)}>
              Invite member
            </Button>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <TeamSkeleton />
        ) : (
          <div className="border border-border-primary-light rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border-primary-light">
                  {['Member', 'Role', 'Status', 'Last active', 'Joined'].map((col) => (
                    <th key={col} className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
