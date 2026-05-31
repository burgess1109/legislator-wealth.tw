import fs from "fs"
import path from "path"
import { getSourcePdfFilename, type DeclarationPdfGroup } from "../lib/data"
import type { DeclarationIndexEntry } from "../lib/types"

type IndexKey = "legislators" | "councilors" | "mayors"

interface GroupConfig {
  group: DeclarationPdfGroup
  indexPath: string
  indexKey: IndexKey
  sourceDir: string
}

const ROOT_DIR = process.cwd()
const PUBLIC_DIR = path.join(ROOT_DIR, "public")
const OUTPUT_ROOT = path.join(PUBLIC_DIR, "declaration-pdfs")

const GROUPS: GroupConfig[] = [
  {
    group: "legislators",
    indexPath: path.join(ROOT_DIR, "data", "index.json"),
    indexKey: "legislators",
    sourceDir: path.join(ROOT_DIR, "raw-pdfs"),
  },
  {
    group: "councilors",
    indexPath: path.join(ROOT_DIR, "data", "councilors-index.json"),
    indexKey: "councilors",
    sourceDir: path.join(ROOT_DIR, "raw-pdfs", "councilors"),
  },
  {
    group: "mayors",
    indexPath: path.join(ROOT_DIR, "data", "mayors-index.json"),
    indexKey: "mayors",
    sourceDir: path.join(ROOT_DIR, "raw-pdfs", "mayors"),
  },
]

function assertPublicOutputPath(outputPath: string) {
  const relative = path.relative(PUBLIC_DIR, outputPath)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside public/: ${outputPath}`)
  }
}

function readEntries(config: GroupConfig): DeclarationIndexEntry[] {
  if (!fs.existsSync(config.indexPath)) {
    throw new Error(
      `Missing index file: ${path.relative(ROOT_DIR, config.indexPath)}`
    )
  }

  const raw = fs.readFileSync(config.indexPath, "utf-8")
  const index = JSON.parse(raw) as Record<IndexKey, DeclarationIndexEntry[]>
  return index[config.indexKey] ?? []
}

function collectReferencedPdfs(
  entries: DeclarationIndexEntry[]
): Map<string, string[]> {
  const references = new Map<string, string[]>()

  for (const entry of entries) {
    for (const filename of [...entry.declarations, ...(entry.changes ?? [])]) {
      const pdfFilename = getSourcePdfFilename(filename)
      if (!pdfFilename) continue

      const current = references.get(pdfFilename) ?? []
      current.push(filename)
      references.set(pdfFilename, current)
    }
  }

  return references
}

function linkOrCopyFile(
  sourcePath: string,
  outputPath: string
): "linked" | "copied" {
  try {
    fs.linkSync(sourcePath, outputPath)
    return "linked"
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (!code || !["EXDEV", "EPERM", "EOPNOTSUPP"].includes(code)) {
      throw error
    }

    fs.copyFileSync(sourcePath, outputPath)
    return "copied"
  }
}

function exportGroup(config: GroupConfig): {
  group: DeclarationPdfGroup
  linked: number
  copied: number
  missing: string[]
} {
  const entries = readEntries(config)
  const references = collectReferencedPdfs(entries)
  const outputDir = path.join(OUTPUT_ROOT, config.group)
  assertPublicOutputPath(outputDir)
  fs.mkdirSync(outputDir, { recursive: true })

  let linked = 0
  let copied = 0
  const missing: string[] = []

  for (const [pdfFilename, sourceFilenames] of references) {
    const sourcePath = path.join(config.sourceDir, pdfFilename)
    const outputPath = path.join(outputDir, pdfFilename)

    if (!fs.existsSync(sourcePath)) {
      missing.push(
        `${config.group}/${pdfFilename} referenced by ${sourceFilenames[0]}`
      )
      continue
    }

    const result = linkOrCopyFile(sourcePath, outputPath)
    if (result === "linked") linked++
    else copied++
  }

  return { group: config.group, linked, copied, missing }
}

function main() {
  assertPublicOutputPath(OUTPUT_ROOT)
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true })
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })

  const results = GROUPS.map(exportGroup)
  const missing = results.flatMap((result) => result.missing)

  for (const result of results) {
    console.log(
      `${result.group}: exported ${result.linked + result.copied} PDF(s) ` +
        `(${result.linked} hard-linked, ${result.copied} copied)`
    )
  }

  if (missing.length > 0) {
    console.error(`Missing ${missing.length} referenced PDF(s):`)
    for (const item of missing) console.error(`  - ${item}`)
    process.exitCode = 1
  }
}

main()
