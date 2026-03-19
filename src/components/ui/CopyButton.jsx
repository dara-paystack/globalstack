import { useState } from 'react'

// CopyButton — copies text to clipboard and shows a tick confirmation.
// The confirmation auto-resets after 2 seconds.

export function CopyButton({ text, onCopy }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onCopy?.()
    } catch {
      // Silently fail — clipboard API may be unavailable in some contexts
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      className="ml-1.5 p-1 rounded text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary transition-colors cursor-pointer"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-feedback-success-main" fill="none" viewBox="0 0 16 16">
          <path
            d="M3 8l3.5 3.5L13 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
          <rect
            x="5"
            y="5"
            width="8"
            height="9"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v7A1.5 1.5 0 003.5 12H5"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}
