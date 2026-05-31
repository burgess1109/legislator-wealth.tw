import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import type {
  CouncilorIndex,
  DeclarationIndexEntry,
  LegislatorDeclaration,
  LegislatorIndex,
  MayorIndex,
} from '../lib/types'

const DATA_DIR = path.join(process.cwd(), 'data')
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const OG_DIR = path.join(PUBLIC_DIR, 'og')
const COUNCILOR_OG_DIR = path.join(OG_DIR, 'councilors')
const MAYOR_OG_DIR = path.join(OG_DIR, 'mayors')

function formatNTD(amount: number): string {
  return new Intl.NumberFormat('zh-TW').format(amount)
}

interface TwsePriceRow {
  Name: string
  ClosingPrice: string
}

interface TpexPriceRow {
  CompanyName: string
  Close: string
}

interface EsbPriceRow {
  CompanyName: string
  LatestPrice: string
}

function calcMarketTotal(decl: LegislatorDeclaration, priceMap: Map<string, number>): number {
  let total = 0
  for (const s of decl.securities?.stocks?.items || []) {
    const p = priceMap.get(s.name)
    total += p ? Math.round(s.shares * p) : s.ntdTotal
  }
  for (const f of decl.securities?.funds?.items || []) {
    const p = priceMap.get(f.name)
    total += p ? Math.round(f.units * p) : f.ntdTotal
  }
  return total
}

function loadPriceMap(): Map<string, number> {
  const map = new Map<string, number>()
  try {
    const entries = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'STOCK_DAY_ALL.json'), 'utf-8')) as TwsePriceRow[]
    for (const e of entries) {
      const p = parseFloat(e.ClosingPrice)
      if (p && !isNaN(p)) map.set(e.Name, p)
    }
  } catch {}
  try {
    const entries = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tpex_mainboard_quotes.json'), 'utf-8')) as TpexPriceRow[]
    for (const e of entries) {
      if (map.has(e.CompanyName)) continue
      const p = parseFloat(e.Close)
      if (p && !isNaN(p)) map.set(e.CompanyName, p)
    }
  } catch {}
  try {
    const entries = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tpex_esb_latest_statistics.json'), 'utf-8')) as EsbPriceRow[]
    for (const e of entries) {
      if (map.has(e.CompanyName)) continue
      const p = parseFloat(e.LatestPrice)
      if (p && !isNaN(p)) map.set(e.CompanyName, p)
    }
  } catch {}
  return map
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function svgToPng(svg: string, outPath: string) {
  await sharp(Buffer.from(svg)).png().toFile(outPath)
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function getDeclarationFromEntry(entry: DeclarationIndexEntry, dir: string): LegislatorDeclaration | null {
  const [filename] = entry.declarations
  if (!filename) return null

  const declPath = path.join(dir, filename)
  if (!fs.existsSync(declPath)) return null

  return JSON.parse(fs.readFileSync(declPath, 'utf-8')) as LegislatorDeclaration
}

function mergeDeclarations(declarations: LegislatorDeclaration[]): LegislatorDeclaration | null {
  const [base, ...rest] = declarations
  if (!base) return null

  const stocks = declarations.flatMap(d => d.securities.stocks.items)
  const funds = declarations.flatMap(d => d.securities.funds.items)
  const declarationDate = declarations.reduce(
    (latest, d) => d.declarationDate > latest ? d.declarationDate : latest,
    base.declarationDate
  )
  const stockTotal = stocks.reduce((sum, item) => sum + item.ntdTotal, 0)
  const fundTotal = funds.reduce((sum, item) => sum + item.ntdTotal, 0)
  const notes = [base.notes, ...rest.map(d => d.notes)]
    .filter((note): note is string => Boolean(note))
    .filter((note, index, all) => all.indexOf(note) === index)

  return {
    ...base,
    declarationForm: declarations.length > 1 ? 'merged' : base.declarationForm,
    declarationDate,
    securities: {
      totalNTD: stockTotal + fundTotal,
      stocks: {
        totalNTD: stockTotal,
        items: stocks,
      },
      funds: {
        totalNTD: fundTotal,
        items: funds,
      },
    },
    notes: notes.length > 0 ? notes.join('\n') : undefined,
  }
}

function declarationFormOf(declaration: LegislatorDeclaration): 'asset' | 'trust' {
  if (declaration.declarationForm === 'trust') return 'trust'
  if (/信託財產申報/.test(declaration.declarationType)) return 'trust'
  return 'asset'
}

function latestDeclarationsByForm(
  declarations: LegislatorDeclaration[],
  form: 'asset' | 'trust'
): LegislatorDeclaration[] {
  const matching = declarations.filter(d => declarationFormOf(d) === form)
  const latestDate = matching.reduce(
    (latest, d) => d.declarationDate > latest ? d.declarationDate : latest,
    ''
  )
  return latestDate ? matching.filter(d => d.declarationDate === latestDate) : []
}

function hasSecurityItems(declaration: LegislatorDeclaration): boolean {
  return declaration.securities.stocks.items.length > 0 || declaration.securities.funds.items.length > 0
}

function latestMayorTrustDeclarations(declarations: LegislatorDeclaration[]): LegislatorDeclaration[] {
  const trustDeclarations = declarations.filter(d => declarationFormOf(d) === 'trust')
  const trustWithHoldings = trustDeclarations.filter(hasSecurityItems)
  return latestDeclarationsByForm(
    trustWithHoldings.length > 0 ? trustWithHoldings : trustDeclarations,
    'trust'
  )
}

function getMergedMayorLatestDeclaration(entry: DeclarationIndexEntry): LegislatorDeclaration | null {
  const declarations = entry.declarations
    .map(filename => path.join(DATA_DIR, 'mayors', filename))
    .filter(filePath => fs.existsSync(filePath))
    .map(filePath => JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LegislatorDeclaration)

  const selected = [
    ...latestDeclarationsByForm(declarations, 'asset'),
    ...latestMayorTrustDeclarations(declarations),
  ].sort((a, b) => b.declarationDate.localeCompare(a.declarationDate))

  return mergeDeclarations(selected)
}

function generateSiteSvg(
  title = '政治人物持股',
  subtitle = '台灣民意代表與地方首長持股資料入口',
  note = '資料來源：監察院公報與政府公開資料'
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fafafa"/>
  <rect x="0" y="0" width="6" height="630" fill="#1a1a1a"/>
  <text x="80" y="240" font-family="serif" font-size="96" font-weight="900" fill="#1a1a1a">${escapeXml(title)}</text>
  <text x="80" y="320" font-family="sans-serif" font-size="32" fill="#666666">${escapeXml(subtitle)}</text>
  <text x="80" y="520" font-family="sans-serif" font-size="24" fill="#999999">legislator-wealth.tw</text>
  <text x="80" y="560" font-family="sans-serif" font-size="20" fill="#bbbbbb">${escapeXml(note)}</text>
</svg>`
}

function getNameFontSize(name: string): number {
  if (name.length <= 3) return 88
  if (name.length <= 5) return 80
  if (name.length <= 8) return 66
  return 54
}

async function generatePersonSvg({
  name,
  party,
  role,
  amount,
  avatarPath,
}: {
  name: string
  party: string
  role: string
  amount: number
  avatarPath: string
}): string {
  const amountText = amount > 0 ? `NT$ ${formatNTD(amount)}` : '未持有股票'
  const stockLabel = amount > 0 ? '股票及基金市值，以台股最新收盤價計算' : ''
  const badgeText = party || role
  const nameFontSize = getNameFontSize(name)

  const partyColors: Record<string, string> = {
    '中國國民黨': '#1a5ccc',
    '民主進步黨': '#1B9431',
    '台灣民眾黨': '#28C8C8',
    '無黨籍': '#999999',
  }
  const barColor = partyColors[party] || '#cccccc'

  const fullAvatarPath = path.join(PUBLIC_DIR, avatarPath.replace(/^\//, ''))
  let avatarEmbed = ''
  if (avatarPath && fs.existsSync(fullAvatarPath)) {
    try {
      const avatarData = await sharp(fullAvatarPath)
        .resize(240, 240, { fit: 'cover' })
        .jpeg({ quality: 84 })
        .toBuffer()
      const b64 = avatarData.toString('base64')
      avatarEmbed = `<image x="60" y="100" width="240" height="240" href="data:image/jpeg;base64,${b64}" clip-path="url(#avatarClip)"/>`
    } catch {}
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <clipPath id="avatarClip"><rect x="60" y="100" width="240" height="240"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="#fafafa"/>
  <!-- Bold top band -->
  <rect x="0" y="0" width="1200" height="12" fill="${barColor}"/>
  <!-- Avatar -->
  ${avatarEmbed || `<rect x="60" y="100" width="240" height="240" fill="#e5e5e5"/><text x="180" y="245" font-family="serif" font-size="80" font-weight="900" fill="#999" text-anchor="middle">${escapeXml(name.charAt(0))}</text>`}
  <!-- Party color dot -->
  <circle cx="350" cy="165" r="10" fill="${barColor}"/>
  <text x="370" y="175" font-family="sans-serif" font-size="28" fill="#666666">${escapeXml(badgeText)}</text>
  <!-- Name -->
  <text x="340" y="260" font-family="serif" font-size="${nameFontSize}" font-weight="900" fill="#1a1a1a">${escapeXml(name)}</text>
  <!-- Amount -->
  <text x="340" y="330" font-family="sans-serif" font-size="28" fill="#666666">${escapeXml(role)}</text>
  <text x="340" y="380" font-family="sans-serif" font-size="22" fill="#999999">${escapeXml(stockLabel)}</text>
  <text x="340" y="440" font-family="serif" font-size="56" font-weight="900" fill="#1a1a1a">${escapeXml(amountText)}</text>
  <!-- Site -->
  <text x="60" y="580" font-family="sans-serif" font-size="22" fill="#bbbbbb">legislator-wealth.tw</text>
</svg>`
}

async function main() {
  fs.mkdirSync(OG_DIR, { recursive: true })
  fs.mkdirSync(COUNCILOR_OG_DIR, { recursive: true })
  fs.mkdirSync(MAYOR_OG_DIR, { recursive: true })

  const index = readJson<LegislatorIndex>(path.join(DATA_DIR, 'index.json'), { legislators: [], lastUpdated: '' })
  const councilorIndex = readJson<CouncilorIndex>(path.join(DATA_DIR, 'councilors-index.json'), { councilors: [], lastUpdated: '' })
  const mayorIndex = readJson<MayorIndex>(path.join(DATA_DIR, 'mayors-index.json'), { mayors: [], lastUpdated: '' })
  const priceMap = loadPriceMap()

  let metaRaw: Record<string, { party: string; avatar: string }> = {}
  try {
    metaRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'legislators-meta.json'), 'utf-8'))
  } catch {}
  const councilorMetaRaw = readJson<{ councilors?: Record<string, { name: string; party: string; avatar: string; city: string; title: string }> }>(
    path.join(DATA_DIR, 'councilors-meta.json'),
    {}
  ).councilors ?? {}
  const mayorMetaRaw = readJson<{ mayors?: Record<string, { name: string; party: string; avatar: string; city: string; title: string }> }>(
    path.join(DATA_DIR, 'mayors-meta.json'),
    {}
  ).mayors ?? {}

  // Site OG
  await svgToPng(generateSiteSvg(), path.join(PUBLIC_DIR, 'og.png'))
  console.log('Generated og.png')
  await svgToPng(
    generateSiteSvg(
      '地方議員持股',
      '縣市議員財產申報、股票基金市值排行與個別明細',
      '資料來源：監察院公報與內政部地方公職人員資訊'
    ),
    path.join(OG_DIR, 'councilor.png')
  )
  await svgToPng(
    generateSiteSvg(
      '縣市首長持股',
      '直轄市長與縣市長財產申報、持股排行與個別明細',
      '資料來源：監察院公報與內政部地方公職人員資訊'
    ),
    path.join(OG_DIR, 'mayor.png')
  )

  // Per-legislator OG
  let count = 0
  for (const leg of index.legislators) {
    if (leg.declarations.length === 0) continue
    const decl = getDeclarationFromEntry(leg, path.join(DATA_DIR, 'legislators'))
    if (!decl) continue

    const amount = calcMarketTotal(decl, priceMap)
    const meta = metaRaw[leg.name]

    const svg = await generatePersonSvg({
      name: leg.name,
      party: meta?.party || '',
      role: '第十一屆立法委員',
      amount,
      avatarPath: meta?.avatar || '',
    })
    await svgToPng(svg, path.join(OG_DIR, `${leg.slug}.png`))
    count++
  }

  let councilorCount = 0
  for (const councilor of councilorIndex.councilors) {
    if (councilor.declarations.length === 0) continue
    const decl = getDeclarationFromEntry(councilor, path.join(DATA_DIR, 'councilors'))
    if (!decl) continue

    const amount = calcMarketTotal(decl, priceMap)
    const meta = councilorMetaRaw[councilor.slug]
    const city = meta?.city ?? councilor.organization.replace(/議會$/g, '')
    const title = meta?.title ?? councilor.title
    const svg = await generatePersonSvg({
      name: meta?.name ?? councilor.name,
      party: meta?.party || '',
      role: `${city}${title}`,
      amount,
      avatarPath: meta?.avatar || '',
    })
    await svgToPng(svg, path.join(COUNCILOR_OG_DIR, `${councilor.slug}.png`))
    councilorCount++
  }

  let mayorCount = 0
  for (const mayor of mayorIndex.mayors) {
    if (mayor.declarations.length === 0) continue
    const decl = getMergedMayorLatestDeclaration(mayor)
    if (!decl) continue

    const amount = calcMarketTotal(decl, priceMap)
    const meta = mayorMetaRaw[mayor.slug]
    const city = meta?.city ?? mayor.organization.replace(/政府$/g, '')
    const title = meta?.title ?? mayor.title
    const svg = await generatePersonSvg({
      name: meta?.name ?? mayor.name,
      party: meta?.party || '',
      role: `${city}${title}`,
      amount,
      avatarPath: meta?.avatar || '',
    })
    await svgToPng(svg, path.join(MAYOR_OG_DIR, `${mayor.slug}.png`))
    mayorCount++
  }

  // Clean up old SVGs
  for (const f of fs.readdirSync(OG_DIR).filter(f => f.endsWith('.svg'))) {
    fs.unlinkSync(path.join(OG_DIR, f))
  }
  const siteSvg = path.join(PUBLIC_DIR, 'og.svg')
  if (fs.existsSync(siteSvg)) fs.unlinkSync(siteSvg)

  console.log(`Generated ${count} legislator OG images (PNG)`)
  console.log(`Generated ${councilorCount} councilor OG images (PNG)`)
  console.log(`Generated ${mayorCount} mayor OG images (PNG)`)
}

main()
