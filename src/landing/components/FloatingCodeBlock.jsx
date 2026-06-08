import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Returns a single HTML string — avoids mixing React children + dangerouslySetInnerHTML
// on the same subtree, which React reconciliation can stomp during re-renders.
function highlightToHTML(code) {
  return code
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('//')) {
        return `<div class="line"><span style="color:#475569">${line}</span></div>`
      }
      const hl = line
        .replace(/"([^"]+)"(?=\s*:)/g, '<span style="color:#94a3b8">"$1"</span>')
        .replace(/:\s*"([^"]*)"/g, (_, v) => `: <span style="color:#7dd3fc">"${v}"</span>`)
        .replace(/:\s*(\d+)([,\s]|$)/g, (_, n, end) => `: <span style="color:#86efac">${n}</span>${end}`)
        .replace(/([{}[\]])/g, '<span style="color:#475569">$1</span>')
      return `<div class="line">${hl}</div>`
    })
    .join('')
}

const FLOWS = [
  {
    name: 'send_to_africa',
    code: `// send_to_africa
{
  "flow":            "send_to_africa",
  "amount":          10000,
  "currency":        "USDC",
  "destination": {
    "country":        "NG",
    "type":           "bank_transfer",
    "account_number": "0123456789"
  }
}`,
  },
  {
    name: 'receive_from_africa',
    code: `// receive_from_africa
{
  "flow":            "receive_from_africa",
  "source_country":  "KE",
  "source_currency": "KES",
  "settlement":      "USDC"
}`,
  },
  {
    name: 'usd_account',
    code: `// usd_account
{
  "flow":               "usd_account",
  "action":             "sweep",
  "destination_market": "GH"
}`,
  },
]

// Shared card — header + animated code body. Used by both FloatingCodeBlock
// (fixed desktop) and InlineCodeBlock (mobile, rendered in the content flow).
function CodeBlockCard({ activeStep }) {
  const flow = FLOWS[activeStep] ?? FLOWS[0]

  // Memoized HTML string — stable across parent re-renders caused by scroll events.
  // Only recomputes when activeStep actually changes.
  const codeHTML = useMemo(
    () => ({ __html: highlightToHTML(flow.code) }),
    [flow.code]
  )

  return (
    <div
      style={{
        background: 'rgba(14,13,12,0.88)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Header — updates immediately with activeStep, no animation needed */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: '#0C68EB',
            letterSpacing: '0.02em',
          }}
        >
          {flow.name}
        </span>
        <button
          type="button"
          disabled
          aria-label="Documentation link — coming soon"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.02em',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'default',
          }}
        >
          docs <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Code body — AnimatePresence with mode="wait" handles the swap cleanly:
          exit completes before the new content enters, eliminating the custom
          state machine (displayStep / animatingRef / pendingStep) that was the
          root cause of content disappearing mid-animation. */}
      <div style={{ padding: '14px 16px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              lineHeight: 1.7,
            }}
          >
            {/* Single dangerouslySetInnerHTML container — never mixed with
                React-managed children on the same node. Content is memoized
                so React sees a stable reference on scroll-driven re-renders. */}
            <div dangerouslySetInnerHTML={codeHTML} />
            <span
              className="cursor-blink inline-block align-middle"
              style={{ width: 6, height: 12, background: '#7dd3fc', borderRadius: 1, marginLeft: 2 }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// Mobile: inline card rendered in the content flow below the steps
export function InlineCodeBlock({ activeStep }) {
  return (
    <div
      style={{
        marginTop: 24,
        borderRadius: 8,
        overflow: 'hidden',
        border: '0.5px solid rgba(0,0,0,0.1)',
        width: '100%',
      }}
    >
      <CodeBlockCard activeStep={activeStep} />
    </div>
  )
}

// Desktop: fixed-position overlay over the globe canvas
export default function FloatingCodeBlock({ activeStep, visible }) {
  return (
    <div
      className="hidden lg:block"
      style={{
        position: 'fixed',
        // Globe spans 50vw → (100vw - 4rem). Center = 75vw - 2rem.
        // Code block is 60% of globe width = (50vw - 4rem) * 0.6 = 30vw - 2.4rem.
        // Left edge  = center - half width = 60vw - 0.8rem
        // Right edge = center + half width → right: 10vw + 3.2rem
        left: 'calc(60vw - 0.8rem)',
        right: 'calc(10vw + 3.2rem)',
        bottom: 32,
        zIndex: 2,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <CodeBlockCard activeStep={activeStep} />
    </div>
  )
}
