import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion'
import { InlineCodeBlock } from './FloatingCodeBlock'
import { HOW_HEADLINE, HOW_SUBHEAD, STEPS } from '../data/copy'
import { useIsMobile } from '../hooks/useIsMobile'
import { BG_BLUE_START } from '../constants/scroll'

const COL_PX = 'clamp(40px, 6vw, 120px)'

// Globe scroll values that activate the matching arc state for each step
const STEP_GLOBE_SCROLL = [0.26, 0.43, 0.58]

export default function HowItWorks({
  activeStep,
  onStepChange,
  onVisibilityChange,
  globeScrollOverrideRef,
}) {
  const shouldReduceMotion = useReducedMotion()
  const sectionRef = useRef(null)
  const pausedRef = useRef(false)
  const pauseTimerRef = useRef(null)
  const scrollTimerRef = useRef(null)
  // Ref tracks current step to avoid stale closure inside the debounce timeout
  const activeStepRef = useRef(activeStep)
  const [hoveredStep, setHoveredStep] = useState(null)
  const [isOnBlue, setIsOnBlue] = useState(false)
  const isMobile = useIsMobile(768)

  // Keep activeStepRef in sync with the prop
  useEffect(() => {
    activeStepRef.current = activeStep
  }, [activeStep])

  // Clear pending timeouts on unmount to prevent stale callback fires
  useEffect(() => {
    return () => {
      clearTimeout(scrollTimerRef.current)
      clearTimeout(pauseTimerRef.current)
    }
  }, [])

  const { scrollYProgress: sectionProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const { scrollYProgress: globalProgress } = useScroll()

  // Track blue background transition for text color adaptation
  useMotionValueEvent(globalProgress, 'change', (v) => {
    setIsOnBlue(v >= BG_BLUE_START)
  })

  // Scroll → step sync + visibility
  // Visibility responds immediately; step updates are debounced 50ms so rapid
  // scroll events don't outpace React's render cycle and leave the code block
  // in an intermediate empty state.
  useMotionValueEvent(sectionProgress, 'change', (v) => {
    onVisibilityChange?.(v > 0.02 && v < 0.98)

    if (pausedRef.current) return

    clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      const newStep = v < 0.35 ? 0 : v < 0.68 ? 1 : 2
      if (newStep !== activeStepRef.current) {
        onStepChange(newStep)
      }
    }, 50)
  })

  function handleStepKeyDown(e, i) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleStepClick(i)
    }
  }

  function handleStepClick(i) {
    onStepChange(i)

    // Override globe to show matching arc state
    if (globeScrollOverrideRef) {
      globeScrollOverrideRef.current = STEP_GLOBE_SCROLL[i]
    }

    // Pause scroll-driven sync for 3s
    pausedRef.current = true
    clearTimeout(pauseTimerRef.current)
    pauseTimerRef.current = setTimeout(() => {
      pausedRef.current = false
      if (globeScrollOverrideRef) globeScrollOverrideRef.current = null
    }, 3000)
  }

  return (
    <section ref={sectionRef} style={{ height: '200dvh' }}>
      <div
        className="sticky top-0 h-screen flex flex-col justify-center"
        style={{ paddingLeft: COL_PX, paddingRight: '2rem', paddingTop: '5rem', paddingBottom: '4rem' }}
      >
        {/* Label */}
        <div
          className="font-mono text-[11px] uppercase mb-5"
          style={{ letterSpacing: '0.12em', color: isOnBlue ? 'rgba(255,255,255,0.95)' : '#767672', transition: 'color 0.4s ease' }}
        >
          [ HOW IT WORKS ]
        </div>

        {/* Heading */}
        <h2
          className="font-sans font-bold mb-2"
          style={{ fontSize: 'clamp(28px, 3vw, 42px)', letterSpacing: '-0.03em', lineHeight: 1.05, maxWidth: 640, color: isOnBlue ? '#ffffff' : '#0E141B', transition: 'color 0.4s ease' }}
        >
          {HOW_HEADLINE}
        </h2>

        {/* Subhead */}
        <p className="font-sans text-[15px] mb-3" style={{ color: isOnBlue ? 'rgba(255,255,255,0.65)' : '#6B6B65', maxWidth: 640, lineHeight: 1.65, transition: 'color 0.4s ease' }}>
          {HOW_SUBHEAD}
        </p>

        {/* Stat row */}
        <div
          className="flex items-center gap-3 mb-8 font-sans font-semibold text-[13px]"
          style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', color: isOnBlue ? '#ffffff' : '#0E141B', transition: 'color 0.4s ease' }}
        >
          <span>18 markets</span>
          <span aria-hidden="true" style={{ color: isOnBlue ? 'rgba(255,255,255,0.35)' : '#A3A39A' }}>·</span>
          <span>Minutes to settle</span>
          <span aria-hidden="true" style={{ color: isOnBlue ? 'rgba(255,255,255,0.35)' : '#A3A39A' }}>·</span>
          <span>Stablecoin native</span>
        </div>

        {/* Steps */}
        <div className="flex flex-col" style={{ maxWidth: isMobile ? '100%' : 480 }}>
          {STEPS.map((step, i) => {
            const isActive = i === activeStep
            const isHovered = hoveredStep === i && !isActive
            return (
              <motion.div
                key={step.num}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`Step ${step.num}: ${step.title}`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleStepClick(i)}
                onKeyDown={(e) => handleStepKeyDown(e, i)}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `0.5px solid ${isActive ? 'rgba(0,0,0,0.08)' : 'transparent'}`,
                  background: isActive
                    ? '#ffffff'
                    : isHovered
                    ? isOnBlue ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.025)'
                    : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease, border-color 0.2s ease',
                }}
              >
                {/* Step header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Left: number + title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 14,
                        color: isActive ? '#b0aea6' : isOnBlue ? 'rgba(255,255,255,0.4)' : '#b0aea6',
                        fontVariantNumeric: 'tabular-nums',
                        transition: 'color 0.4s ease',
                      }}
                    >
                      {step.num}
                    </span>
                    <span
                      style={{
                        fontFamily: '"Inter Variable", Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: 16,
                        color: isActive ? '#0E141B' : isOnBlue ? '#ffffff' : '#0E141B',
                        transition: 'color 0.4s ease',
                      }}
                    >
                      {step.title}
                    </span>
                  </div>

                  {/* Right: endpoint badge — visible only on active step */}
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      color: '#0C68EB',
                      background: 'rgba(12,104,235,0.08)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      opacity: isActive ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {step.endpoint}
                  </span>
                </div>

                {/* Description — expands on active step */}
                <div
                  style={{
                    fontSize: 12,
                    color: '#6b6b65',
                    lineHeight: 1.6,
                    paddingLeft: 22,
                    maxHeight: isActive ? 60 : 0,
                    opacity: isActive ? 1 : 0,
                    overflow: 'hidden',
                    marginTop: isActive ? 4 : 0,
                    transition: 'max-height 0.25s ease, opacity 0.2s ease, margin-top 0.2s ease',
                  }}
                >
                  {step.desc}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Mobile only — inline code block below the steps */}
        {isMobile && <InlineCodeBlock activeStep={activeStep} />}
      </div>
    </section>
  )
}
