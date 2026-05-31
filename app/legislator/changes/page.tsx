import { getAllFlatChanges, getIndex } from "@/lib/data"
import { ChangeFeed } from "@/components/change-feed"
import { LegislatorNav } from "@/components/legislator-nav"
import { JsonLd } from "@/components/json-ld"
import { createBreadcrumbList } from "@/lib/structured-data"

export const metadata = {
  title: "變動紀錄",
  description: "立法委員於申報期間內的股票交易異動紀錄。",
}

export default function ChangesPage() {
  const changes = getAllFlatChanges()
  const index = getIndex()
  const slugMap: Record<string, string> = {}
  for (const l of index.legislators) slugMap[l.name] = l.slug

  return (
    <div className="space-y-8">
      <JsonLd
        data={createBreadcrumbList([
          { name: "政治人物持股", path: "/" },
          { name: "立法委員", path: "/legislator" },
          { name: "變動紀錄", path: "/legislator/changes" },
        ])}
      />

      <div>
        <h1 className="font-heading text-3xl font-black tracking-tight sm:text-4xl">
          變動紀錄
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          立法委員於申報期間內的股票異動紀錄，可依立委姓名或股票名稱篩選。
        </p>
        <LegislatorNav current="changes" className="mt-5" />
      </div>

      <ChangeFeed changes={changes} slugMap={slugMap} />
    </div>
  )
}
