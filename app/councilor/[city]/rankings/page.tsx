import { CouncilorCityNav } from "@/components/councilor-city-nav"
import { CurrencyDisplay } from "@/components/currency-display"
import { JsonLd } from "@/components/json-ld"
import { getCouncilorCityName } from "@/lib/councilor-routes"
import { createOgImage } from "@/lib/metadata"
import { createBreadcrumbList } from "@/lib/structured-data"
import {
  buildCouncilorRows,
  getCouncilorCityStaticParams,
  getCouncilorPartyStats,
  hasCouncilorCityDeclarations,
} from "@/lib/councilor-analytics"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
/* eslint-disable @next/next/no-img-element */

const PARTY_BAR: Record<string, string> = {
  中國國民黨: "bar-kmt",
  民主進步黨: "bar-dpp",
  台灣民眾黨: "bar-tpp",
  無黨籍: "bar-ind",
}

const PARTY_BORDER: Record<string, string> = {
  中國國民黨: "border-l-[#1a5ccc]",
  民主進步黨: "border-l-[#1B9431]",
  台灣民眾黨: "border-l-[#28C8C8]",
  無黨籍: "border-l-[#999999]",
}

export async function generateStaticParams() {
  return getCouncilorCityStaticParams()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}): Promise<Metadata> {
  const { city: citySlug } = await params
  const cityName = getCouncilorCityName(citySlug)
  const title = cityName ? `${cityName}議員持股排行榜` : "地方議員持股排行榜"
  const description = cityName
    ? `${cityName}議員依持股市值排序的完整排行榜。`
    : "地方議員持股市值排行榜。"
  const url = `/councilor/${citySlug}/rankings/`
  const image = "/og/councilor.png"

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      images: [createOgImage(image, title)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export default async function CouncilorRankingsPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: citySlug } = await params
  const cityName = getCouncilorCityName(citySlug)
  if (!cityName || !hasCouncilorCityDeclarations(citySlug)) notFound()

  const rows = buildCouncilorRows(citySlug)

  const ranked = rows
    .filter((row) => row.hasDeclaration)
    .sort((a, b) => b.amount - a.amount)
  const partyStats = getCouncilorPartyStats(rows)
  const maxAmount = ranked[0]?.amount ?? 0

  const listItems = ranked.map((row, i) => ({
    "@type": "ListItem" as const,
    position: i + 1,
    item: {
      "@type": "Person" as const,
      name: row.name,
      url: `https://legislator-wealth.tw${row.href}/`,
    },
  }))

  return (
    <div className="space-y-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${cityName}議員持股市值排行榜`,
          numberOfItems: ranked.length,
          itemListElement: listItems,
        }}
      />
      <JsonLd
        data={createBreadcrumbList([
          { name: "政治人物持股", path: "/" },
          { name: "縣市議員", path: "/councilor" },
          { name: `${cityName}議員`, path: `/councilor/${citySlug}` },
          { name: "持股市值排行榜", path: `/councilor/${citySlug}/rankings` },
        ])}
      />

      <header className="space-y-3 pt-4">
        <Link
          href={`/councilor/${citySlug}`}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          {cityName}議員
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight sm:text-4xl">
            {cityName}議員持股排行榜
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ranked.length} 位已有申報資料的{cityName}
            議員，依股票與基金市值由高至低排列。
          </p>
        </div>
        <CouncilorCityNav citySlug={citySlug} />
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">各黨持股市值合計</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {partyStats.map(([party, stats]) => (
            <div key={party} className="border p-3">
              <p className="text-sm font-medium">{party}</p>
              <p className="text-xs text-muted-foreground">
                {stats.count} 位議員 · {stats.declarations} 份申報
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums">
                <CurrencyDisplay amount={stats.total} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="divide-y border-y">
        {ranked.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            尚未建立排行榜。放入{cityName}議員申報 PDF
            並重新解析後，這裡會列出完整排名。
          </p>
        ) : (
          ranked.map((row, index) => {
            const pct =
              maxAmount > 0 ? Math.max((row.amount / maxAmount) * 100, 2) : 0
            const barClass = row.party
              ? PARTY_BAR[row.party] || "bg-foreground/10"
              : "bg-foreground/10"
            const borderClass = row.party ? PARTY_BORDER[row.party] || "" : ""
            return (
              <Link
                key={row.slug}
                href={row.href}
                className="row-hover relative grid grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 hover:bg-muted/50 sm:px-4"
              >
                <div
                  className={`absolute inset-y-0 left-0 ${barClass}`}
                  style={{ width: `${pct}%` }}
                />
                <span className="relative text-right text-lg font-black text-muted-foreground/25 tabular-nums">
                  #{index + 1}
                </span>
                <div
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-l-2 bg-muted text-sm font-bold text-muted-foreground ${borderClass}`}
                >
                  {row.avatar ? (
                    <img
                      src={row.avatar}
                      alt={row.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    row.name.charAt(0)
                  )}
                </div>
                <div className="relative min-w-0">
                  <span className="font-bold">{row.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {row.party || "未標示"}
                  </span>
                </div>
                <div className="relative shrink-0 text-right">
                  <span className="font-bold tracking-tight tabular-nums">
                    <CurrencyDisplay amount={row.amount} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {row.stockCount} 檔
                  </span>
                </div>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
