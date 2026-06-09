import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { HERO_HEADLINE, HERO_BODY, HERO_STATUS } from '../data/copy'

const COL_PX = 'clamp(40px, 6vw, 120px)'

const FLAGS = [
  { code: 'za', name: 'South Africa' },
  { code: 'ke', name: 'Kenya' },
  { code: 'sn', name: 'Senegal' },
  { code: 'gh', name: 'Ghana' },
  { code: 'rw', name: 'Rwanda' },
  { code: 'cm', name: 'Cameroon' },
  { code: 'zm', name: 'Zambia' },
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
]

const MORE_COUNTRIES = [
  'Tanzania', 'Uganda', 'Côte d\'Ivoire', 'Ethiopia',
  'Egypt', 'Morocco', 'Mozambique', 'Madagascar', 'UAE',
]

const TOOLTIP_STYLE = {
  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
  marginBottom: 6, background: '#0a0a09', color: '#fff',
  fontSize: 11, fontWeight: 500, fontFamily: 'Inter',
  padding: '3px 7px', borderRadius: 5, whiteSpace: 'nowrap',
  pointerEvents: 'none', zIndex: 100, letterSpacing: '-0.01em',
}

function FlagCircle({ code, name, style }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      tabIndex={0}
      role="img"
      aria-label={name}
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, outline: 'none', ...style }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {/* alt="" — the wrapper span carries the accessible name; empty alt avoids double-announcement */}
      <img
        src={`https://hatscripts.github.io/circle-flags/flags/${code}.svg`}
        alt=""
        width={24}
        height={24}
        style={{ display: 'block', borderRadius: '50%', border: '1.5px solid #fff', boxSizing: 'border-box' }}
      />
      {visible && <span aria-hidden="true" style={TOOLTIP_STYLE}>{name}</span>}
    </span>
  )
}

function MoreChip({ style }) {
  const [tooltipPos, setTooltipPos] = useState(null)
  const ref = useRef(null)

  const showTooltip = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 6 })
    }
  }

  return (
    <span
      ref={ref}
      tabIndex={0}
      role="img"
      aria-label={`9 more countries: ${MORE_COUNTRIES.join(', ')}`}
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, outline: 'none', ...style }}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setTooltipPos(null)}
      onFocus={showTooltip}
      onBlur={() => setTooltipPos(null)}
    >
      <span aria-hidden="true" style={{
        width: 24, height: 24, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a09', color: '#fff', border: '1.5px solid #fff',
        fontSize: 8, fontWeight: 700, fontFamily: 'Inter', letterSpacing: '-0.01em',
      }}>
        +9
      </span>
      {tooltipPos && createPortal(
        <span style={{
          position: 'fixed',
          left: tooltipPos.x, top: tooltipPos.y,
          transform: 'translate(-50%, -100%)',
          background: '#0a0a09', color: '#fff',
          fontSize: 11, fontWeight: 500, fontFamily: 'Inter', letterSpacing: '-0.01em',
          padding: '6px 10px', borderRadius: 5, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left',
        }}>
          {MORE_COUNTRIES.map(c => <span key={c}>{c}</span>)}
        </span>,
        document.body
      )}
    </span>
  )
}

export default function Hero() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section
      className="min-h-screen flex flex-col justify-center"
      style={{ paddingLeft: COL_PX, paddingRight: '2rem', paddingTop: '7rem', paddingBottom: '4rem' }}
    >
      {/* Flag row */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}
      >
        {FLAGS.map(({ code, name }, i) => (
          <FlagCircle
            key={code}
            code={code}
            name={name}
            style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: FLAGS.length - i }}
          />
        ))}
        <MoreChip style={{ marginLeft: '-8px', zIndex: 0 }} />
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="font-sans font-bold text-[#0E141B]"
        style={{ fontSize: 'clamp(42px, 4.5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1.05, maxWidth: 640, textWrap: 'pretty' }}
      >
        {HERO_HEADLINE}
      </motion.h1>

      {/* Body */}
      <motion.p
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="font-sans text-base mt-5"
        style={{ color: '#6B6B65', maxWidth: 640, lineHeight: 1.65 }}
      >
        {HERO_BODY}</motion.p>

      {/* CTAs */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-5 mt-8"
      >
        {/* Primary button — Sign up (the new onboarding CTA, leads the row) */}
        <a
          href="/signup"
          className="inline-flex items-center font-sans font-medium text-sm text-white hover:opacity-80 transition-opacity"
          style={{
            background: '#0E141B',
            padding: '10px 12px',
            borderRadius: 12,
            letterSpacing: '-0.01em',
          }}
        >
          Sign up
        </a>

        {/* Sign in — outline/secondary. padding is 9px (vs Sign up's 10px) to
            offset the 1px border, so both buttons render the same height. */}
        <a
          href="/dashboard"
          className="inline-flex items-center font-sans font-medium text-sm hover:opacity-80 transition-opacity"
          style={{
            color: '#0E141B',
            background: 'transparent',
            border: '1px solid #0E141B',
            padding: '9px 12px',
            borderRadius: 12,
            letterSpacing: '-0.01em',
          }}
        >
          Sign in
        </a>

        {/* Secondary text link */}
        {/* TODO: Update href to live docs URL before launch */}
        <a
          href="https://docs.globalstack.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-sans text-sm hover:opacity-70 transition-opacity"
          style={{ color: '#6B6B65' }}
        >
          Read the docs
          <span aria-hidden="true">→</span>
        </a>
      </motion.div>

      {/* Section label */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="font-mono text-[11px] uppercase"
        style={{ letterSpacing: '0.12em', color: '#C8420E', marginTop: '10rem' }}
      >
        [ {HERO_STATUS} ]
      </motion.div>
    </section>
  )
}
