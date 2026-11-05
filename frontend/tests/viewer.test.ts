import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FileDetail } from '../app/modules/documents/services/publicApi'
import { alignPdfDimension, pdfRaster } from '../app/modules/viewer/utils/raster'
import { layoutPdfPages, nearbyPdfPages, pdfPageAt } from '../app/modules/viewer/utils/pages'
import { readJsonPage, readTextArtifact, JSON_SCAN_BYTES, TEXT_PREVIEW_BYTES } from '../app/modules/viewer/services/textArtifact'
import { fileDetail, files } from './fixtures'
import { renderMarkdown } from '../app/modules/viewer/utils/markdown'
import { clampPdfZoom, wheelPdfZoom } from '../app/modules/viewer/utils/zoom'
import { readViewerQuery, representationKind, selectRepresentation, availableRepresentations } from '../app/modules/viewer/utils/selection'

describe('selección pública del visor', () => {
  it('respeta la predeterminada y no convierte una representación ausente en otra', () => {
    const file = fileDetail(files[0]!)
    expect(selectRepresentation(file, 42, 501)?.tipo).toBe('pdf-searchable')
    expect(selectRepresentation(file, 42, 501, 'original')).toBeNull()
    expect(selectRepresentation({ ...file, representaciones: { ...file.representaciones, defaultRepresentation: null } }, 42, 501)).toBeNull()
  })
  it('rechaza archivos ajenos, IDs distintos y manifiestos no confiables', () => {
    const file = fileDetail(files[0]!)
    expect(availableRepresentations(file, 43, 501)).toEqual([])
    expect(availableRepresentations(file, 42, 502)).toEqual([])
    expect(availableRepresentations(fileDetail(files[0]!, 'original', false), 42, 501)).toEqual([])
  })
  it('no acepta entradas repetidas, páginas cero o no seguras ni versiones desconocidas', () => {
    expect(readViewerQuery({})).toEqual({ page: 1, representation: undefined, errors: [] })
    expect(readViewerQuery({ pagina: '2', representacion: 'original' }).errors).toEqual([])
    for (const pagina of ['0', '-1', '1.5', '9007199254740992', ['1', '2'], null]) expect(readViewerQuery({ pagina }).errors).toHaveLength(1)
    for (const representacion of ['otro', '../original', ['original', 'pdf-searchable']]) expect(readViewerQuery({ representacion }).errors).toHaveLength(1)
  })
  it('ofrece todos los artefactos declarados con elección explícita y nunca como fallback', () => {
    const file: FileDetail = fileDetail(files[0]!)
    file.representaciones.representations.push({ tipo: 'markdown', mimeType: 'text/markdown', tamano: 100, fuenteReutilizada: false }, { tipo: 'jsonl', mimeType: 'application/x-ndjson', tamano: 100, fuenteReutilizada: false })
    expect(availableRepresentations(file, 42, 501).map(item => item.tipo)).toEqual(['pdf-searchable', 'markdown', 'jsonl'])
    expect(selectRepresentation(file, 42, 501)?.tipo).toBe('pdf-searchable')
    expect(selectRepresentation(file, 42, 501, 'markdown')?.tipo).toBe('markdown')
    file.representaciones.defaultRepresentation = null
    expect(selectRepresentation(file, 42, 501)).toBeNull()
    for (const type of ['markdown', 'jsonl'] as const) {
      expect(readViewerQuery({ representacion: type }).errors).toEqual([])
      expect(representationKind(file.representaciones.representations.find(item => item.tipo === type)!)).toBe('text')
    }
  })
  it('solo incrusta PDF e imágenes seguras; HTML, SVG y TIFF se descargan', () => {
    const representation = { tipo: 'original' as const, mimeType: 'application/pdf', tamano: 123, fuenteReutilizada: false }
    expect(representationKind(representation)).toBe('pdf')
    expect(representationKind({ ...representation, mimeType: 'image/png' })).toBe('image')
    for (const mimeType of ['image/tiff', 'text/html', 'image/svg+xml', 'application/octet-stream']) expect(representationKind({ ...representation, mimeType })).toBe('download')
  })
})


describe('zoom del documento', () => {
  it('normaliza rueda en píxeles, líneas y páginas y conserva deltas pequeños de trackpad', () => {
    expect(wheelPdfZoom(1, -16, 0, 500)).toBe(wheelPdfZoom(1, -1, 1, 500))
    expect(wheelPdfZoom(1, -100, 0, 500)).toBe(wheelPdfZoom(1, -0.2, 2, 500))
    expect(wheelPdfZoom(1, -0.5, 0, 500)).toBeGreaterThan(1)
    expect(wheelPdfZoom(1, 0.5, 0, 500)).toBeLessThan(1)
    expect(wheelPdfZoom(1, 0, 0, 500)).toBe(1)
  })
  it('limita las escalas manuales sin invertir la dirección cuando ajustar al ancho supera el límite', () => {
    expect(clampPdfZoom(100)).toBe(5)
    expect(clampPdfZoom(0)).toBe(0.25)
    expect(clampPdfZoom(NaN)).toBe(1)
    expect(wheelPdfZoom(5, -120, 0, 500)).toBe(5)
    expect(wheelPdfZoom(0.25, 120, 0, 500)).toBe(0.25)
    expect(wheelPdfZoom(6, -120, 0, 500)).toBe(6)
    expect(wheelPdfZoom(0.1, 120, 0, 500)).toBe(0.1)
  })
})


describe('páginas continuas del PDF', () => {
  it('convierte puntos PDF a píxeles CSS una vez y conserva el ajuste al ancho', () => {
    const size = [{ width: 300, height: 200 }]
    expect(layoutPdfPages(size, 1000, '1')[0]?.width).toBe(400)
    expect(layoutPdfPages(size, 1000, '1.5')[0]?.width).toBe(600)
    expect(layoutPdfPages(size, 1000, '2')[0]?.width).toBe(800)
    expect(layoutPdfPages(size, 432, 'fit')[0]?.width).toBe(400)
  })
  it('calcula hojas de distintos tamaños y solo el rango próximo al área visible', () => {
    const pages = layoutPdfPages([{ width: 600, height: 900 }, { width: 300, height: 200 }, { width: 600, height: 900 }], 632, 'fit')
    expect(pages.map(page => [page.top, page.width, page.height])).toEqual([[16, 600, 900], [932, 600, 400], [1348, 600, 900]])
    expect(pdfPageAt(pages, 1000)?.number).toBe(2)
    expect(nearbyPdfPages(pages, 0, 400)).toEqual([1])
    expect(nearbyPdfPages(pages, 1400, 200)).toEqual([2, 3])
    expect(layoutPdfPages([{ width: 300, height: 200 }], 632, '2')[0]?.height).toBe(533)
  })
})

describe('resolución y alineación del PDF', () => {
  it('alinea el tamaño a píxeles de pantalla incluso con densidad fraccionaria', () => {
    for (const ratio of [1, 1.25, 2, 2.625, 3]) {
      const aligned = alignPdfDimension(595.28, ratio)
      expect(aligned * ratio).toBeCloseTo(Math.round(aligned * ratio), 8)
      expect(595.28 - aligned).toBeGreaterThanOrEqual(0)
      expect(595.28 - aligned).toBeLessThan(1 / ratio)
      const page = layoutPdfPages([{ width: 595.28, height: 841.89 }], 1000, '0.75', ratio)[0]!
      const raster = pdfRaster(595.28, 841.89, ratio, true, 16_000_000)
      expect(page.width).toBe(raster.cssWidth)
      expect(page.height).toBe(raster.cssHeight)
      expect(raster.scaleX * raster.cssWidth).toBeCloseTo(raster.canvasWidth)
      expect(raster.scaleY * raster.cssHeight).toBeCloseTo(raster.canvasHeight)
    }
  })
  it('mejora las hojas visibles, conserva la densidad alta y abarata las vecinas', () => {
    const visible = pdfRaster(595, 842, 1, true, 16_000_000)
    const neighbour = pdfRaster(595, 842, 1, false, 16_000_000)
    expect(visible.canvasWidth).toBe(1190)
    expect(visible.canvasHeight).toBe(1684)
    expect(neighbour.canvasWidth).toBe(595)
    expect(pdfRaster(595, 842, 3, true, 16_000_000).canvasWidth).toBe(1785)
    expect(neighbour.cssWidth).toBe(visible.cssWidth)
  })
  it('limita píxeles y dimensiones en hojas grandes y muy alargadas', () => {
    for (const [width, height] of [[20_000, 20_000], [1_000_000, 1], [1, 1_000_000]]) {
      const raster = pdfRaster(width!, height!, 3, true, 100_000)
      expect(raster.canvasWidth * raster.canvasHeight).toBeLessThanOrEqual(100_000)
      expect(Math.max(raster.canvasWidth, raster.canvasHeight)).toBeLessThanOrEqual(32767)
      expect(Math.min(raster.canvasWidth, raster.canvasHeight)).toBeGreaterThanOrEqual(1)
    }
    const group = Array.from({ length: 3 }, () => pdfRaster(5000, 6000, 3, true, 32_000_000 / 3))
    expect(group.reduce((pixels, page) => pixels + page.canvasWidth * page.canvasHeight, 0)).toBeLessThanOrEqual(32_000_000)
  })
})

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('lectura acotada de artefactos', () => {
  it('conserva texto UTF-8 sin interpretarlo como HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('# Resolución <script>alert(1)</script>')))
    expect(await readTextArtifact('/representacion', new AbortController().signal)).toEqual({ text: '# Resolución <script>alert(1)</script>', truncated: false })
  })
  it('limita la vista previa y cancela el stream restante', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('x'.repeat(TEXT_PREVIEW_BYTES + 1))) }, cancel })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)))
    const result = await readTextArtifact('/representacion', new AbortController().signal)
    expect(result.text.length).toBe(TEXT_PREVIEW_BYTES)
    expect(result.truncated).toBe(true)
    expect(cancel).toHaveBeenCalledOnce()
  })
  it('rechaza errores HTTP y retira su temporizador', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(readTextArtifact('/representacion', new AbortController().signal)).rejects.toThrow('Artefacto no disponible')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('conserva la cancelación al abandonar y agota el límite de espera', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn().mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(new Error('Cancelado'))) }))
    vi.stubGlobal('fetch', fetcher)
    const controller = new AbortController()
    const request = readTextArtifact('/representacion', controller.signal)
    const rejected = expect(request).rejects.toThrow('Cancelado')
    controller.abort()
    await rejected
    const timed = readTextArtifact('/representacion', new AbortController().signal)
    const expired = expect(timed).rejects.toThrow('Cancelado')
    await vi.advanceTimersByTimeAsync(15_000)
    await expired
    expect(vi.getTimerCount()).toBe(0)
  })
})


describe('JSON OCR por página', () => {
  it('lee la estructura real y conserva solo la página solicitada, sin metadatos raíz', async () => {
    const page = { page: 2, text: 'Resolución\nSegunda línea', char_count: 30, empty: false }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ page_count: 3, metadata: { source_path: '/interno/no-publicar' }, pages: [{ page: 1, text: 'Otra página' }, page, { page: 3, text: 'Tercera' }] }))))
    const result = await readJsonPage('/jsonl', 2, new AbortController().signal)
    expect(result).toEqual({ text: JSON.stringify(page, null, 2), pages: 3 })
    expect(result.text).not.toContain('source_path')
    expect(result.text).not.toContain('Otra página')
  })
  it('interrumpe el stream al terminar la página sin esperar el resto del documento', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"page_count":9999,"pages":[{"page":1,"text":"Primera"},')) }, cancel })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)))
    const result = await readJsonPage('/jsonl', 1, new AbortController().signal)
    expect(JSON.parse(result.text!).text).toBe('Primera')
    expect(result.pages).toBe(9999)
    expect(cancel).toHaveBeenCalledOnce()
  })
  it('conserva UTF-8 entre chunks y reconoce páginas numeradas desde cero', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ page_count: 2, pages: [{ page: 0, text: 'Primera' }, { page: 1, text: 'Huánuco 🏛️' }] }))
    let offset = 0
    const stream = new ReadableStream({ pull(controller) { if (offset === bytes.length) controller.close(); else controller.enqueue(bytes.subarray(offset, ++offset)) } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)))
    const result = await readJsonPage('/jsonl', 2, new AbortController().signal)
    expect(JSON.parse(result.text!)).toEqual({ page: 1, text: 'Huánuco 🏛️' })
  })
  it('distingue una página ausente de un JSON corrupto y rechaza entradas inválidas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"page_count":1,"pages":[{"page":1}]}')).mockResolvedValueOnce(new Response('{"pages":[malformado]}')))
    expect(await readJsonPage('/jsonl', 2, new AbortController().signal)).toEqual({ text: null, pages: 1 })
    await expect(readJsonPage('/jsonl', 1, new AbortController().signal)).rejects.toThrow()
    expect(() => readJsonPage('/jsonl', 0, new AbortController().signal)).toThrow('Página inválida')
  })
  it('limita una página grande sin presentar JSON cortado como válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ pages: [{ page: 1, text: 'x'.repeat(TEXT_PREVIEW_BYTES) }] }))))
    await expect(readJsonPage('/jsonl', 1, new AbortController().signal)).rejects.toThrow('Esta página supera el límite')
  })
  it('limita el recorrido y cancela sin conservar páginas anteriores', async () => {
    let bytes = 0
    const cancel = vi.fn()
    const chunk = new TextEncoder().encode(' '.repeat(65536))
    const stream = new ReadableStream({ pull(controller) { bytes += chunk.length; controller.enqueue(chunk) }, cancel })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)))
    await expect(readJsonPage('/jsonl', 9999, new AbortController().signal)).rejects.toThrow('límite de lectura')
    expect(bytes).toBeLessThanOrEqual(JSON_SCAN_BYTES + 2 * chunk.length)
    expect(cancel).toHaveBeenCalledOnce()
  })
  it('no inicia una lectura ya cancelada', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const controller = new AbortController()
    controller.abort()
    await expect(readJsonPage('/jsonl', 1, controller.signal)).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('Markdown legible y sanitizado', () => {
  it('presenta títulos, énfasis, listas, tablas, saltos y bloques de código', () => {
    const html = renderMarkdown('# Título\n\n**Texto**\nsegunda línea\n\n- Uno\n- Dos\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```json\n{"page":1}\n```')
    // Happy DOM and DOMPurify remove heading nodes; Chromium coverage checks semantic headings.
    expect(html).toContain('Título')
    const host = document.createElement('div')
    host.innerHTML = html
    for (const selector of ['strong', 'br', 'ul', 'table', 'pre > code']) expect(host.querySelector(selector)).not.toBeNull()
  })
  it('no ejecuta HTML, estilos, imágenes ni enlaces peligrosos', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n<img src="https://externo.test/pixel" onerror="alert(1)">\n\n[malicioso](javascript:alert%281%29)\n\n![imagen](https://externo.test/otro.png)')
    const host = document.createElement('div')
    host.innerHTML = html
    expect(host.querySelector('script, img, iframe, style, svg, math, [onerror]')).toBeNull()
    expect(host.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(host.textContent).toContain('<script>')
  })
})
