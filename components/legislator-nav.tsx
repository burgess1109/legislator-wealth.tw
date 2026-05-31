import Link from 'next/link'
import { cn } from '@/lib/utils'

const ITEMS = [
  { key: 'overview', href: '/legislator', label: '立委首頁' },
  { key: 'rankings', href: '/legislator/rankings', label: '排行榜' },
  { key: 'stocks', href: '/legislator/stocks', label: '持股總覽' },
  { key: 'changes', href: '/legislator/changes', label: '變動紀錄' },
] as const

type LegislatorNavKey = (typeof ITEMS)[number]['key']

export function LegislatorNav({
  current,
  className,
}: {
  current?: LegislatorNavKey
  className?: string
}) {
  return (
    <nav className={cn('flex flex-wrap gap-2', className)} aria-label="立委資料導覽">
      {ITEMS.map(item => {
        const isCurrent = item.key === current
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 items-center border px-3 text-xs font-medium hover:bg-muted',
              isCurrent && 'bg-foreground text-background hover:bg-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
