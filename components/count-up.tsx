'use client'

import { useEffect, useState } from 'react'

interface CountUpOptions {
  /** Delay before counting begins, to sync with staggered entrances. */
  delayMs?: number
  durationMs?: number
  /** When false, skips animation entirely (no rAF scheduled). */
  enabled?: boolean
}

/**
 * Animates a number from 0 to `value` on mount. Returns the current frame's
 * value. Respects `prefers-reduced-motion` (jumps straight to `value`).
 */
export function useCountUp(value: number, { delayMs = 0, durationMs = 900, enabled = true }: CountUpOptions = {}) {
  const [display, setDisplay] = useState(enabled ? 0 : value)

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!enabled || reduced || value === 0) {
      setDisplay(value)
      return
    }

    let raf = 0
    let start = 0
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const tick = (now: number) => {
      if (!start) start = now
      const t = Math.min((now - start) / durationMs, 1)
      setDisplay(Math.round(easeOutCubic(t) * value))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick)
    }, delayMs)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [value, delayMs, durationMs, enabled])

  return display
}

interface CountUpProps extends CountUpOptions {
  value: number
  className?: string
}

export function CountUp({ value, delayMs, durationMs, className }: CountUpProps) {
  const display = useCountUp(value, { delayMs, durationMs })

  return (
    <span className={className} aria-label={String(value)}>
      {display}
    </span>
  )
}
