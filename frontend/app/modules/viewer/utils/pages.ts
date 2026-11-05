import { alignPdfDimension } from './raster'

// PDF points use 72 units/inch; CSS uses 96 pixels/inch. Keep zoom in CSS convention.
export const PDF_TO_CSS_UNITS = 96 / 72

export type PageSize = { width: number, height: number }
export type PageLayout = PageSize & { number: number, top: number, scale: number }

export function layoutPdfPages(sizes: PageSize[], width: number, zoom: string, pixelRatio = 1): PageLayout[] {
  let top = 16
  return sizes.map((size, index) => {
    const scale = zoom === 'fit' ? Math.max(0.1, (width - 32) / size.width) : Number(zoom) * PDF_TO_CSS_UNITS
    const page = { number: index + 1, top, scale, width: alignPdfDimension(size.width * scale, pixelRatio), height: alignPdfDimension(size.height * scale, pixelRatio) }
    top += page.height + 16
    return page
  })
}

export function pdfPageAt(pages: PageLayout[], position: number) {
  return pages.find(page => page.top + page.height + 8 >= position) ?? pages.at(-1)
}

export function nearbyPdfPages(pages: PageLayout[], top: number, height: number, overscan = 1) {
  return pages.filter(page => page.top + page.height > top - height * overscan && page.top < top + height * (1 + overscan)).map(page => page.number)
}
