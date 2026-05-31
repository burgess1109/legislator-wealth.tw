export const SITE_URL = "https://legislator-wealth.tw"
export const SITE_NAME = "政治人物持股"
export const SITE_DESCRIPTION =
  "台灣民意代表與地方首長持股資料入口，分類瀏覽立法委員、縣市議員與縣市首長資料。"

export interface BreadcrumbItem {
  name: string
  path: string
}

export function pageUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path

  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  if (normalizedPath === "/") return `${SITE_URL}/`

  return `${SITE_URL}${
    normalizedPath.endsWith("/") ? normalizedPath : `${normalizedPath}/`
  }`
}

export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export function createWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ["立委持股", "政治人物財產申報", "legislator-wealth.tw"],
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "zh-TW",
  }
}

export function createBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: pageUrl(item.path),
    })),
  }
}
