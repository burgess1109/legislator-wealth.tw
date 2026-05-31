import { ChangeFeed } from "@/components/change-feed"
import { CouncilorCityNav } from "@/components/councilor-city-nav"
import { JsonLd } from "@/components/json-ld"
import { getCouncilorCityName } from "@/lib/councilor-routes"
import { createOgImage } from "@/lib/metadata"
import { createBreadcrumbList } from "@/lib/structured-data"
import {
  getCouncilorCityStaticParams,
  getCouncilorFlatChanges,
  getCouncilorHrefMap,
  hasCouncilorCityDeclarations,
} from "@/lib/councilor-analytics"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

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
  const title = cityName
    ? `${cityName}議員股票變動紀錄`
    : "地方議員股票變動紀錄"
  const description = cityName
    ? `${cityName}議員於申報期間內的股票交易異動紀錄。`
    : "地方議員於申報期間內的股票交易異動紀錄。"
  const url = `/councilor/${citySlug}/changes/`
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

export default async function CouncilorChangesPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city: citySlug } = await params
  const cityName = getCouncilorCityName(citySlug)
  if (!cityName || !hasCouncilorCityDeclarations(citySlug)) notFound()

  const changes = getCouncilorFlatChanges(citySlug)
  const hrefMap = getCouncilorHrefMap(citySlug)

  return (
    <div className="space-y-8">
      <JsonLd
        data={createBreadcrumbList([
          { name: "政治人物持股", path: "/" },
          { name: "縣市議員", path: "/councilor" },
          { name: `${cityName}議員`, path: `/councilor/${citySlug}` },
          { name: "變動紀錄", path: `/councilor/${citySlug}/changes` },
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
            {cityName}議員變動紀錄
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cityName}
            議員於申報期間內的股票異動紀錄，可依議員姓名或股票名稱篩選。
          </p>
        </div>
        <CouncilorCityNav citySlug={citySlug} />
      </header>

      <ChangeFeed changes={changes} hrefMap={hrefMap} personLabel="議員" />
    </div>
  )
}
