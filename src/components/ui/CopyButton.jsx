import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

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
        <Check className="w-3.5 h-3.5 text-feedback-success-main" strokeWidth={1.5} />
      ) : (
        <Copy className="w-3.5 h-3.5" strokeWidth={1.25} />
      )}
    </button>
  )
}
