import { AlertTriangle } from 'lucide-react'

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full bg-feedback-danger-light flex items-center justify-center mb-4">
        <AlertTriangle className="w-5 h-5 text-feedback-danger-main" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-content-primary">Something went wrong</p>
      {message && (
        <p className="text-sm text-content-tertiary mt-1 font-mono">{message}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm font-medium text-action-primary-main hover:text-action-primary-dark transition-colors cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  )
}
