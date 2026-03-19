// EmptyState — shown when a filtered list has no results or a section has no data.
// Includes a message and an optional action (e.g. "Clear filters").

export function EmptyState({ title = 'No results', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full bg-surface-tertiary flex items-center justify-center mb-4">
        <svg
          className="w-5 h-5 text-content-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
          />
        </svg>
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
