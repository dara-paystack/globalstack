import React, { useRef, useState, lazy, Suspense } from 'react'
import { useScroll, useTransform, useMotionValueEvent, motion, useReducedMotion } from 'framer-motion'
import { useScrollProgress } from './hooks/useScrollProgress'
import { useIsMobile } from './hooks/useIsMobile'
import { BG_BLUE_START, BG_BLUE_MID, BG_DARK_START, BG_DARK_MID } from './constants/scroll'
const GlobeCanvas = lazy(() => import('./components/GlobeCanvas'))
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import FloatingCodeBlock from './components/FloatingCodeBlock'
import DeveloperSection from './components/DeveloperSection'
import StatsSection from './components/StatsSection'
import Footer from './components/Footer'

class GlobeErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[GlobeCanvas] render error:', error, info.componentStack)
    }
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion()
  const scrollProgressRef = useScrollProgress()
  const { scrollYProgress } = useScroll()
  const [activeStep, setActiveStep] = useState(0)
  const [howItWorksVisible, setHowItWorksVisible] = useState(false)
  const globeScrollOverrideRef = useRef(null)
  const isMobile = useIsMobile(1024)

  // Background: #FFFFFF → #0C68EB → #0E0E0D
  // Measured page layout (800px viewport):
  //   Hero: 0–0.24  |  HowItWorks: 0.24–0.73  |  Dev: 0.73–0.87  |  Stats+Footer: 0.87–1.0
  // After StatsSection extra padding total ≈ 3675px scroll:
  //   Dev starts at 0.653, Stats at 0.871
  const bgColorAnimated = useTransform(
    scrollYProgress,
    [0, BG_BLUE_START, BG_BLUE_MID, BG_DARK_START, BG_DARK_MID, 1],
    ['#FFFFFF', '#FFFFFF', '#0C68EB', '#0C68EB', '#0E141B', '#0E141B']
  )
  // When motion is reduced, skip the scroll-driven colour transition and stay on the initial background
  const bgColor = shouldReduceMotion ? '#FFFFFF' : bgColorAnimated

  // Sync --focus-ring CSS variable: dark on light bg, white on blue/dark bg
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (!shouldReduceMotion) {
      document.documentElement.style.setProperty('--focus-ring', v >= BG_BLUE_START ? '#ffffff' : '#0E141B')
    }
  })

  return (
    <>
      {/* Skip navigation — visually hidden until focused, gives keyboard users a bypass route */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:font-sans focus:text-sm focus:font-medium focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-black"
      >
        Skip to main content
      </a>

      {/* Fixed full-screen background */}
      <motion.div
        className="fixed inset-0"
        style={{ backgroundColor: bgColor, zIndex: -1 }}
        aria-hidden="true"
      />

      {/* Fixed Three.js globe — right half, behind content (desktop only, not mounted on mobile) */}
      {!isMobile && (
        <GlobeErrorBoundary>
          <Suspense fallback={null}>
            <GlobeCanvas
              scrollProgressRef={scrollProgressRef}
              globeScrollOverrideRef={globeScrollOverrideRef}
            />
          </Suspense>
        </GlobeErrorBoundary>
      )}

      {/* Floating code block — overlays globe area, visible only during HowItWorks */}
      <FloatingCodeBlock activeStep={activeStep} visible={howItWorksVisible} />

      {/* Navbar — full width, above everything */}
      <Navbar scrollYProgress={scrollYProgress} />

      {/* Scrollable left-column content (padded right to leave room for globe) */}
      <main
        id="main-content"
        className="relative lg:[padding-right:clamp(0px,32vw,32vw)]"
        style={{ zIndex: 1, pointerEvents: 'none' }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <Hero />
          <HowItWorks
            activeStep={activeStep}
            onStepChange={setActiveStep}
            onVisibilityChange={setHowItWorksVisible}
            globeScrollOverrideRef={globeScrollOverrideRef}
          />
          <DeveloperSection />
          <StatsSection />
        </div>
      </main>

      {/* Footer — full page width, outside the padded column */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Footer />
      </div>
    </>
  )
}
