// EmptyState — shown when a filtered list has no results or a section has no data.
// Includes a message and an optional action (e.g. "Clear filters").

import { EyeOff } from 'lucide-react'

export function EmptyState({ title = 'No results', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full bg-surface-tertiary flex items-center justify-center mb-4">
        <EyeOff className="w-5 h-5 text-content-tertiary" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-content-primary">{title}</p>
      {description && (
        <p className="text-sm text-content-tertiary mt-1">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 text-sm font-medium text-action-primary-main hover:text-action-primary-dark transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
