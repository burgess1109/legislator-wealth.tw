'use client'

import { useCountUp } from '@/components/count-up'
import { useCurrencyFormat } from '@/components/currency-format-provider'
import { formatNTD, formatTaiwaneseNTD } from '@/lib/format'
import { cn } from '@/lib/utils'

export function CurrencyDisplay({
  amount,
  className,
  animate = false,
  animateDelayMs,
  animateDurationMs,
}: {
  amount: number | null
  className?: string
  /** Count up from 0 on mount. Reserve for prominent hero figures. */
  animate?: boolean
  animateDelayMs?: number
  animateDurationMs?: number
}) {
  const { format } = useCurrencyFormat()
  const animated = useCountUp(amount ?? 0, { delayMs: animateDelayMs, durationMs: animateDurationMs, enabled: animate })

  if (amount === null) return <span className={className}>--</span>

  const value = animate ? animated : amount
  const formatted = format === 'taiwanese'
    ? formatTaiwaneseNTD(value)
    : formatNTD(value)

  return (
    <span className={cn('font-heading', className)} aria-label={animate ? `NT$ ${amount}` : undefined}>
      NT$ {formatted}
    </span>
  )
}
