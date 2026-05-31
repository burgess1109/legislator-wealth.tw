"use client"

import { useEffect, useRef, useState } from "react"
import { RiCheckLine, RiDownloadLine } from "@remixicon/react"
import type { DeclarationPdfDownload } from "@/lib/data"
import { cn } from "@/lib/utils"

export function DeclarationDownloads({
  downloads,
}: {
  downloads: DeclarationPdfDownload[]
}) {
  const [confirmedHref, setConfirmedHref] = useState<string | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  if (downloads.length === 0) return null

  const confirmedDownload = downloads.find(
    (download) => download.href === confirmedHref
  )
  const statusMessage = confirmedDownload
    ? `已開始下載 ${confirmedDownload.label} PDF ${confirmedDownload.pdfId}`
    : ""

  function handleDownload(download: DeclarationPdfDownload) {
    setConfirmedHref(download.href)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setConfirmedHref(null), 1600)
  }

  return (
    <section
      aria-labelledby="declaration-downloads-title"
      className="border-y py-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="declaration-downloads-title" className="text-sm font-bold">
          申報表 PDF
        </h2>
        <div className="flex flex-wrap gap-2">
          {downloads.map((download) => {
            const isConfirmed = confirmedHref === download.href

            return (
              <a
                key={download.href}
                href={download.href}
                download={download.pdfFilename}
                onClick={() => handleDownload(download)}
                className={cn(
                  "group inline-flex h-8 items-center gap-1.5 border px-2.5 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:translate-y-px motion-safe:active:scale-[0.98]",
                  isConfirmed &&
                    "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                )}
                aria-label={
                  isConfirmed
                    ? `已開始下載 ${download.label} PDF ${download.pdfId}`
                    : `下載 ${download.label} PDF ${download.pdfId}`
                }
              >
                <span className="grid size-4 place-items-center">
                  <RiDownloadLine
                    className={cn(
                      "col-start-1 row-start-1 size-4 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isConfirmed
                        ? "scale-75 opacity-0"
                        : "scale-100 opacity-100"
                    )}
                    aria-hidden="true"
                  />
                  <RiCheckLine
                    className={cn(
                      "col-start-1 row-start-1 size-4 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isConfirmed
                        ? "download-confirm-icon scale-100 opacity-100"
                        : "scale-75 opacity-0"
                    )}
                    aria-hidden="true"
                  />
                </span>
                <span className="grid">
                  <span
                    className={cn(
                      "col-start-1 row-start-1 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isConfirmed
                        ? "-translate-y-0.5 opacity-0"
                        : "translate-y-0 opacity-100"
                    )}
                    aria-hidden={isConfirmed}
                  >
                    {download.label}
                  </span>
                  <span
                    className={cn(
                      "col-start-1 row-start-1 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isConfirmed
                        ? "translate-y-0 opacity-100"
                        : "translate-y-0.5 opacity-0"
                    )}
                    aria-hidden={!isConfirmed}
                  >
                    已開始下載
                  </span>
                </span>
              </a>
            )
          })}
        </div>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </span>
    </section>
  )
}
