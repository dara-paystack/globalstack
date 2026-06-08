import { motion, useReducedMotion } from 'framer-motion'
import { DEV_HEADLINE, DEV_BODY, FEATURES } from '../data/copy'

const COL_PX = 'clamp(40px, 6vw, 120px)'

export default function DeveloperSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="relative min-h-screen flex flex-col justify-center">
      {/* Left-column content */}
      <div
        className="relative flex flex-col"
        style={{ paddingLeft: COL_PX, paddingRight: '2rem', paddingTop: '5rem', paddingBottom: '5rem' }}
      >
        {/* Label */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.95)',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          [ FOR DEVELOPERS ]
        </motion.div>

        {/* Heading — two lines */}
        <motion.h2
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="font-sans font-bold text-white"
          style={{ fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: 12 }}
        >
          {DEV_HEADLINE}
        </motion.h2>

        {/* Body */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="font-sans"
          style={{ fontSize: 14, color: 'rgba(255,255,255,0.95)', maxWidth: 400, lineHeight: 1.65, marginBottom: 40 }}
        >
          {DEV_BODY}
        </motion.p>

        {/* Features grid — dividers only, no cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
            maxWidth: 520,
            marginBottom: 32,
          }}
        >
          {FEATURES.map((feat, i) => {
            const isOdd = i % 2 === 0 // left column
            const hasTopBorder = i >= 2

            return (
              <motion.div
                key={feat.title}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                whileInView={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.18 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  padding: '20px 0',
                  paddingRight: isOdd ? 32 : 0,
                  paddingLeft: isOdd ? 0 : 32,
                  borderRight: isOdd ? '0.5px solid rgba(255,255,255,0.15)' : 'none',
                  borderTop: hasTopBorder ? '0.5px solid rgba(255,255,255,0.15)' : 'none',
                }}
              >
                <div
                  className="font-sans font-semibold text-white"
                  style={{ fontSize: 16, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.01em', marginBottom: 5 }}
                >
                  {feat.title}
                </div>
                <div
                  className="font-sans"
                  style={{ fontSize: 14, color: 'rgba(255,255,255,0.95)', lineHeight: 1.6 }}
                >
                  {feat.desc}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* CTA */}
        {/* TODO: Update href to live docs URL before launch */}
        <motion.a
          href="https://docs.globalstack.com"
          target="_blank"
          rel="noopener noreferrer"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          whileInView={shouldReduceMotion ? false : { opacity: 1 }}
          viewport={{ once: true }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.4 }}
          className="inline-flex items-center gap-2 font-sans font-medium text-sm text-white hover:bg-white/100 hover:text-black transition-colors self-start"
          style={{
            border: '1px solid rgba(255,255,255,0.35)',
            padding: '10px 12px',
            borderRadius: 12,
            letterSpacing: '-0.01em',
          }}
        >
          Read the docs <span aria-hidden="true">→</span>
        </motion.a>
      </div>
    </section>
  )
}
