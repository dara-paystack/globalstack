import { useRef, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { STATS_HEADLINE, STATS } from '../data/copy'

const COL_PX = 'clamp(40px, 6vw, 120px)'

function StatItem({ value, label, numeric }) {
  const [displayed, setDisplayed] = useState(numeric ? '0' : value)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !started) setStarted(true) },
      { threshold: 0.4 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [started])

  useEffect(() => {
    if (!started || !numeric) return
    const cleaned = value.replace(/[^0-9.]/g, '')
    const target = parseFloat(cleaned)
    if (isNaN(target)) { setDisplayed(value); return }
    const prefix = value.match(/^[^0-9]*/)?.[0] || ''
    const suffix = value.match(/[^0-9.]*$/)?.[0] || ''
    const decimals = (value.match(/\.(\d+)/) || ['', ''])[1].length

    // Respect user's motion preference — skip animation and show final value immediately
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(value)
      return
    }

    const duration = 1400
    const t0 = performance.now()
    let rafId
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const cur = eased * target
      setDisplayed(prefix + (decimals ? cur.toFixed(decimals) : Math.floor(cur).toString()) + suffix)
      if (p < 1) rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [started, value, numeric])

  return (
    <div ref={ref}>
      <h3
        className="font-sans font-bold block"
        style={{ fontSize: 32, letterSpacing: '-0.03em', lineHeight: 1, color: 'rgba(255, 255, 255, 0.80)', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
      >
        {displayed}
      </h3>
      <div
        className="font-sans"
        style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, marginTop: 6 }}
      >
        {label}
      </div>
    </div>
  )
}

export default function StatsSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section
      className="min-h-screen flex flex-col justify-center"
      style={{ paddingLeft: COL_PX, paddingRight: '2rem', paddingTop: '5rem', paddingBottom: 'clamp(120px, 25dvh, 320px)' }}
    >
      {/* Label */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-mono text-[11px] uppercase mb-10"
        style={{ letterSpacing: '0.12em', color: 'rgba(255,255,255,0.50)' }}
      >
        [ BY THE NUMBERS ]
      </motion.div>

      {/* Intro line */}
      <motion.h2
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        whileInView={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="font-sans font-bold text-white mb-10"
        style={{ fontSize: 'clamp(28px, 3vw, 44px)', letterSpacing: '-0.03em', lineHeight: 1.05, maxWidth: 640 }}
      >
        {STATS_HEADLINE}
      </motion.h2>

      {/* Stats grid — dividers only, no cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          maxWidth: 520,
        }}
      >
        {STATS.map((stat, i) => {
          const isOdd = i % 2 === 0 // left column
          const hasTopBorder = i >= 2

          return (
            <motion.div
              key={stat.label}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.18 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              style={{
                padding: '20px 0',
                paddingRight: isOdd ? 32 : 0,
                paddingLeft: isOdd ? 0 : 32,
                borderRight: isOdd ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
                borderTop: hasTopBorder ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
              }}
            >
              <StatItem {...stat} />
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
