import { useRef, useEffect } from 'react'

// Returns a ref (not state) so Three.js can read it every frame without React re-renders
export function useScrollProgress() {
  const scrollProgressRef = useRef(0)

  useEffect(() => {
    let pending = false
    const onScroll = () => {
      if (!pending) {
        pending = true
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY
          const docHeight = document.body.scrollHeight - window.innerHeight
          scrollProgressRef.current = docHeight > 0 ? scrollTop / docHeight : 0
          pending = false
        })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    // Initialise without rAF since there is no scroll event yet
    const docHeight = document.body.scrollHeight - window.innerHeight
    scrollProgressRef.current = docHeight > 0 ? window.scrollY / docHeight : 0
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrollProgressRef
}
