import type { FileDetail } from '../app/modules/documents/services/publicApi'
import { expect, test } from '@playwright/test'
import { document, fileDetail, files, samplePdf } from './fixtures'

test.beforeEach(async ({ context }) => {
  await context.route('**/resources/v1/public/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/representaciones/')) return route.fulfill({
      contentType : 'application/pdf',
      headers     : url.searchParams.get('disposition') === 'attachment' ? { 'Content-Disposition': 'attachment; filename="documento-sintetico.pdf"' } : {},
      body        : samplePdf()
    })
    if (url.pathname.endsWith('/archivos/501')) {
      const file = fileDetail(files[0]!)
      file.representaciones.representations.push({ ...file.representaciones.representations[0]!, tipo: 'original' })
      return route.fulfill({ json: { data: file } })
    }
    if (url.pathname === '/resources/v1/public/documentos/42') return route.fulfill({ json: { data: document } })
    return route.fulfill({ status: 404, json: {} })
  })
})

test('visor inicia al 75 %, conserva la escala al redimensionar y permite ajustar al ancho manualmente', async ({ page }) => {
  await page.goto('/documentos/42/archivos/501')
  const zoom = page.getByLabel('Zoom', { exact: true })
  const firstPage = page.locator('.pdf-page').first()
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await expect(zoom).toHaveValue('0.75')
  // At 75 %, 300 PDF points occupy 300 CSS pixels before device-pixel alignment.
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await expect.poll(async () => firstPage.evaluate(el => Math.abs(el.getBoundingClientRect().width - 300))).toBeLessThan(1)
    await expect(zoom).toHaveValue('0.75')
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  }
  await page.setViewportSize({ width: 1366, height: 844 })
  await zoom.selectOption('fit')
  await expect.poll(async () => firstPage.evaluate(el => el.clientWidth)).toBeGreaterThan(1000)
  const surface = page.locator('.pdf-viewport')
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  const fittedWidth = await firstPage.evaluate(el => el.clientWidth)
  await page.getByRole('button', { name: 'Aumentar zoom del documento' }).click()
  await expect.poll(async () => Number(await zoom.inputValue())).toBeCloseTo(fittedWidth / 400 * 1.1, 2)
  await expect.poll(async () => firstPage.evaluate(el => el.clientWidth)).toBeCloseTo(fittedWidth * 1.1, -1)
  await zoom.selectOption('fit')
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  await surface.evaluate(el => {
    const bounds = el.getBoundingClientRect()
    el.dispatchEvent(new globalThis.WheelEvent('wheel', { ctrlKey: true, deltaY: -120, clientX: bounds.left + el.clientWidth / 2, clientY: bounds.top + el.clientHeight / 2, bubbles: true, cancelable: true }))
  })
  await expect.poll(async () => Number(await zoom.inputValue())).toBeCloseTo(fittedWidth / 400 * Math.exp(0.18), 3)
  await page.getByLabel('Versión', { exact: true }).selectOption('original')
  await expect(zoom).toHaveValue('0.75')
  await expect.poll(async () => firstPage.evaluate(el => Math.abs(el.getBoundingClientRect().width - 300))).toBeLessThan(1)
  await page.reload()
  await expect(zoom).toHaveValue('0.75')
  await expect.poll(async () => firstPage.evaluate(el => Math.abs(el.getBoundingClientRect().width - 300))).toBeLessThan(1)
})

test('visor prioriza las herramientas, alinea controles y enlaza explícitamente a la ficha', async ({ page }, testInfo) => {
  await page.goto('/documentos/42/archivos/501')
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  const toolbar = page.getByRole('banner', { name: 'Herramientas del visor' })
  await expect(toolbar.locator('.brand')).toHaveCount(0)
  const detail = toolbar.getByRole('link', { name: 'Ver ficha del documento' })
  await expect(detail).toHaveText('Ficha')
  await expect(detail).toHaveAttribute('href', '/documentos/42')
  for (const theme of ['claro', 'oscuro']) {
    if (theme === 'oscuro') await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
    for (const width of [1366, 947, 390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      const sizes = await toolbar.evaluate(el => {
        const theme = el.querySelector('.theme-toggle')!.getBoundingClientRect()
        const controls = [...el.querySelectorAll<HTMLElement>('.viewer-tool-button, select, input')].map(control => {
          const rect = control.getBoundingClientRect()
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, square: control.classList.contains('viewer-tool-button') && !control.classList.contains('viewer-document-link') }
        })
        return { target: window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches ? 44 : 36, themeY: theme.y, controls, toolbarHeight: el.getBoundingClientRect().height }
      })
      for (const control of sizes.controls) {
        expect(control.height).toBe(sizes.target)
        if (control.square) expect(control.width).toBe(sizes.target)
        if (width >= 1366) expect(Math.abs(control.y - sizes.themeY)).toBeLessThan(1)
      }
      if (width >= 1366) expect(sizes.toolbarHeight).toBeLessThanOrEqual(72)
      const actions = await toolbar.locator('.viewer-actions').evaluate(el => [...el.querySelectorAll('select, a, button')].map(child => child.getBoundingClientRect().y))
      expect(new Set(actions).size).toBe(1)
      expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
      if (width === 947 || width === 390) {
        await expect(page.locator('.pdf-viewport')).toHaveAttribute('aria-busy', 'false')
        await page.screenshot({ path: testInfo.outputPath(`visor-herramientas-${theme}-${width}.png`) })
      }
    }
  }
  await detail.focus()
  await expect(detail).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/documentos\/42$/)
  await expect(page.getByText(document.descripcion!, { exact: true })).toBeVisible()
})

test('visor alinea el canvas y el texto y aumenta resolución solo al entrar en pantalla', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1000, height: 768 })
  await page.route('**/representaciones/pdf-searchable', route => route.fulfill({ contentType: 'application/pdf', body: samplePdf(8).replaceAll('/MediaBox [0 0 300 200]', '/MediaBox [0 0 595 842]') }))
  await page.goto('/documentos/42/archivos/501')
  const surface = page.locator('.pdf-viewport')
  const first = page.locator('[data-page="1"]')
  await expect(first.locator('.textLayer')).toContainText('Pagina sintetica 1')
  await page.getByLabel('Zoom', { exact: true }).selectOption('0.75')
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  const assertRaster = async (number: number, highResolution: boolean) => {
    const sheet = page.locator(`[data-page="${number}"]`)
    await expect(sheet.locator('.textLayer')).toContainText(`Pagina sintetica ${number}`)
    const targetDensity = highResolution ? await page.evaluate(() => Math.max(2, window.devicePixelRatio)) : 1
    await expect.poll(async () => sheet.evaluate(el => {
      const canvas = el.querySelector('canvas')!
      return canvas.width / canvas.getBoundingClientRect().width
    })).toBeCloseTo(targetDensity, 2)
    await expect.poll(async () => sheet.evaluate(el => {
      const width = el.getBoundingClientRect().width * window.devicePixelRatio
      return Math.abs(width - Math.round(width))
    })).toBeLessThan(0.06)
    await expect(surface).toHaveAttribute('aria-busy', 'false')
    const size = await sheet.evaluate(el => {
      const canvas = el.querySelector('canvas')!
      const text = el.querySelector('.textLayer')!
      const bounds = canvas.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height, sheetWidth: el.getBoundingClientRect().width, textWidth: text.getBoundingClientRect().width, pixels: canvas.width * canvas.height, density: canvas.width / bounds.width, ratio: window.devicePixelRatio }
    })
    expect(Math.abs(size.width * size.ratio - Math.round(size.width * size.ratio))).toBeLessThan(0.06)
    expect(Math.abs(size.height * size.ratio - Math.round(size.height * size.ratio))).toBeLessThan(0.06)
    expect(size.width).toBeCloseTo(size.sheetWidth, 2)
    expect(size.width).toBeCloseTo(size.textWidth, 2)
    expect(size.pixels).toBeLessThanOrEqual(16_000_000)
    expect(size.density).toBeCloseTo(highResolution ? Math.max(2, size.ratio) : 1, 2)
  }
  await assertRaster(1, true)
  await assertRaster(2, false)
  await page.setViewportSize({ width: 1000, height: 1800 })
  await assertRaster(2, true)
  await page.setViewportSize({ width: 1000, height: 768 })
  await assertRaster(2, false)
  await surface.evaluate(el => {
    const target = el.querySelector('[data-page="2"]')!
    el.scrollTop += target.getBoundingClientRect().top - el.getBoundingClientRect().top - 16
  })
  await expect(page).toHaveURL(/pagina=2/)
  await assertRaster(2, true)
  await assertRaster(1, false)
  const pixels = await surface.evaluate(el => [...el.querySelectorAll('canvas')].reduce((total, canvas) => total + canvas.width * canvas.height, 0))
  expect(pixels).toBeLessThanOrEqual(32_000_000)
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('0.75')
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 768, deviceScaleFactor: 1.25, mobile: false })
  // CDP changes DPR without notifying resize or resolution listeners on desktop.
  await page.evaluate(() => window.dispatchEvent(new globalThis.Event('resize')))
  await expect.poll(async () => page.evaluate(() => window.devicePixelRatio)).toBe(1.25)
  await assertRaster(2, true)
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('0.75')
  await page.screenshot({ path: testInfo.outputPath('visor-resolucion-alineada.png') })
  await session.detach()
})

test('visor aplica Ctrl y rueda al documento y conserva el punto bajo el cursor', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 683, height: 844 })
  await page.route('**/representaciones/pdf-searchable', route => route.fulfill({ contentType: 'application/pdf', body: samplePdf().replaceAll('/MediaBox [0 0 300 200]', '/MediaBox [0 0 600 900]') }))
  await page.goto('/documentos/42/archivos/501')
  const surface = page.locator('.pdf-viewport')
  const zoom = page.getByLabel('Zoom', { exact: true })
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await zoom.selectOption('1.5')
  await expect(page.locator('.pdf-page').first()).toHaveCSS('width', '1200px')
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  await surface.evaluate(el => { el.scrollLeft = 100; el.scrollTop = 180 })
  const point = await surface.evaluate(el => {
    const rect = el.getBoundingClientRect()
    return { x: rect.left + el.clientWidth * 0.6, y: rect.top + el.clientHeight * 0.55 }
  })
  const before = await surface.evaluate((el, position) => {
    const sheet = el.querySelector('.pdf-page')!.getBoundingClientRect()
    return { x: (position.x - sheet.left) / sheet.width, y: (position.y - sheet.top) / sheet.height, browserWidth: window.innerWidth, ratio: window.devicePixelRatio }
  }, point)
  await page.mouse.move(point.x, point.y)
  await page.keyboard.down('Control')
  try { await page.mouse.wheel(0, -120) } finally { await page.keyboard.up('Control') }
  await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(1.5)
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  const after = await surface.evaluate((el, position) => {
    const sheet = el.querySelector('.pdf-page')!.getBoundingClientRect()
    return { x: (position.x - sheet.left) / sheet.width, y: (position.y - sheet.top) / sheet.height, browserWidth: window.innerWidth, ratio: window.devicePixelRatio }
  }, point)
  expect(Math.abs(after.x - before.x)).toBeLessThan(0.002)
  expect(Math.abs(after.y - before.y)).toBeLessThan(0.002)
  expect(after.browserWidth).toBe(before.browserWidth)
  expect(after.ratio).toBe(before.ratio)
  const enlarged = Number(await zoom.inputValue())
  await page.keyboard.down('Control')
  try { await page.mouse.wheel(0, 120) } finally { await page.keyboard.up('Control') }
  await expect.poll(async () => Number(await zoom.inputValue())).toBeLessThan(enlarged)
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  const beforeBurst = Number(await zoom.inputValue())
  await page.keyboard.down('Control')
  try {
    for (let index = 0; index < 3; index++) await page.mouse.wheel(0, -20)
  } finally { await page.keyboard.up('Control') }
  await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(beforeBurst)
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('alert')).toHaveCount(0)
  const scale = await zoom.inputValue()
  const scrollTop = await surface.evaluate(el => el.scrollTop)
  await page.mouse.wheel(0, 160)
  await expect.poll(async () => surface.evaluate(el => el.scrollTop)).toBeGreaterThan(scrollTop)
  await expect(zoom).toHaveValue(scale)
  await page.screenshot({ path: testInfo.outputPath('visor-zoom-local.png') })
})

test('visor sincroniza trackpad, botones y límites sin capturar rueda fuera de la superficie', async ({ page }) => {
  await page.goto('/documentos/42/archivos/501')
  const surface = page.locator('.pdf-viewport')
  const zoom = page.getByLabel('Zoom', { exact: true })
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await zoom.selectOption('1')
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  const blocked = await surface.evaluate(el => {
    const event = new globalThis.WheelEvent('wheel', { ctrlKey: true, deltaY: -0.5, deltaMode: 0, bubbles: true, cancelable: true })
    el.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(blocked).toBe(true)
  await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(1)
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  const current = Number(await zoom.inputValue())
  await page.getByRole('button', { name: 'Aumentar zoom del documento' }).focus()
  await page.keyboard.press('Enter')
  await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(current)
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  await zoom.selectOption('5')
  await expect(page.getByRole('button', { name: 'Aumentar zoom del documento' })).toBeDisabled()
  await zoom.selectOption('0.25')
  await expect(page.getByRole('button', { name: 'Reducir zoom del documento' })).toBeDisabled()
  const outsideBlocked = await page.locator('.workspace-header').evaluate(el => {
    const event = new globalThis.WheelEvent('wheel', { ctrlKey: true, deltaY: -120, bubbles: true, cancelable: true })
    el.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(outsideBlocked).toBe(false)
  const oldSurface = (await surface.elementHandle())!
  await page.getByRole('link', { name: 'Ver ficha del documento' }).click()
  await expect(page).toHaveURL(/\/documentos\/42$/)
  await expect(page.locator('.pdf-reader')).toHaveCount(0)
  expect(await oldSurface.evaluate(el => {
    const event = new globalThis.WheelEvent('wheel', { ctrlKey: true, deltaY: -120, bubbles: true, cancelable: true })
    el.dispatchEvent(event)
    return event.defaultPrevented
  })).toBe(false)
})

test('visor diferencia la hoja blanca del fondo en ambos temas y conserva el marco al ampliar', async ({ page }, testInfo) => {
  await page.goto('/documentos/42/archivos/501')
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  const surface = page.locator('.pdf-viewport')
  for (const theme of ['claro', 'oscuro']) {
    if (theme === 'oscuro') await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
    for (const width of [1366, 1920, 683, 390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      await page.getByLabel('Zoom', { exact: true }).selectOption('fit')
      await expect(surface).toHaveAttribute('aria-busy', 'false')
      const contrast = await surface.evaluate(el => {
        const color = getComputedStyle(el).backgroundColor
        const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(value => Number(value) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        const luminance = rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722
        const sheet = getComputedStyle(el.querySelector('.pdf-page')!)
        return { ratio: 1.05 / (luminance + 0.05), background: sheet.backgroundColor, outline: sheet.outlineStyle, outlineWidth: parseFloat(sheet.outlineWidth) }
      })
      expect(contrast.ratio).toBeGreaterThanOrEqual(7)
      expect(contrast.background).toBe('rgb(255, 255, 255)')
      expect(contrast.outline).toBe('solid')
      expect(contrast.outlineWidth).toBeGreaterThanOrEqual(1)
      expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
      if (width === 1366 || width === 390) await page.screenshot({ path: testInfo.outputPath(`visor-contraste-${theme}-${width}.png`) })
    }
  }
})

test('visor público renderiza PDF, conserva página y representación en URL y permite descargar', async ({ page }, testInfo) => {
  const metadata: string[] = []
  const issues: string[] = []
  const external: string[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname === '/resources/v1/public/documentos/42/archivos/501') metadata.push(url.pathname)
    if (['http:', 'https:'].includes(url.protocol) && !['localhost', '127.0.0.1'].includes(url.hostname)) external.push(url.href)
  })
  page.on('pageerror', error => issues.push(error.message))
  page.on('console', message => { if (/hydration|failed to resolve component|failed to load icon/i.test(message.text())) issues.push(message.text()) })
  await page.goto('/documentos/42/archivos/501?pagina=2')
  await expect(page.locator('.textLayer[aria-label="Texto de la página 2"]')).toContainText('Pagina sintetica 2')
  await expect(page.getByLabel('Página', { exact: true })).toHaveValue('2')
  await expect(page.getByRole('button', { name: 'Página siguiente del PDF' })).toBeDisabled()
  await expect(page.getByLabel('Versión', { exact: true })).toHaveValue('pdf-searchable')
  await page.getByRole('button', { name: 'Página anterior del PDF' }).click()
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await expect(page).not.toHaveURL(/pagina=/)
  await page.goBack()
  await expect(page.locator('.textLayer[aria-label="Texto de la página 2"]')).toContainText('Pagina sintetica 2')
  await page.getByLabel('Versión', { exact: true }).selectOption('original')
  await expect(page).toHaveURL(/representacion=original/)
  await expect(page).not.toHaveURL(/pagina=/)
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  expect(metadata).toHaveLength(1)
  const downloaded = page.waitForEvent('download')
  await page.getByRole('link', { name: /^Descargar Documento/ }).click()
  expect((await downloaded).suggestedFilename()).toBe('documento-sintetico.pdf')
  await page.reload()
  await expect(page.getByLabel('Versión', { exact: true })).toHaveValue('original')
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  for (const width of [1366, 1920, 683, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.getByLabel('Zoom', { exact: true }).selectOption('fit')
    await expect(page.locator('.pdf-viewport')).toBeVisible()
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    const canvas = page.locator('.pdf-page canvas').first()
    await expect.poll(async () => canvas.evaluate(el => el.width)).toBeGreaterThan(0)
    const header = (await page.locator('.workspace-header').boundingBox())!
    expect(header.y).toBe(0)
    await page.screenshot({ path: testInfo.outputPath(`visor-claro-${width}.png`) })
  }
  await page.getByLabel('Zoom', { exact: true }).selectOption('2')
  await expect.poll(async () => page.locator('.pdf-viewport').evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)
  expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: testInfo.outputPath('visor-oscuro.png') })
  expect(issues).toEqual([])
  expect(external).toEqual([])
})

test('visor rechaza manifiestos ajenos o sin confianza y recupera un error transitorio', async ({ page }) => {
  await page.route('**/resources/v1/public/documentos/42/archivos/501', route => route.fulfill({ status: 503, json: {} }))
  await page.goto('/documentos/42/archivos/501')
  await expect(page.getByRole('heading', { name: 'No pudimos consultar el archivo' })).toBeVisible()
  await page.unroute('**/resources/v1/public/documentos/42/archivos/501')
  await page.getByRole('button', { name: 'Reintentar consulta' }).click()
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  for (const file of [fileDetail(files[0]!, 'original', false), { ...fileDetail(files[0]!), documentoId: 99 }, { ...fileDetail(files[0]!), id: 502 }]) {
    await page.route('**/resources/v1/public/documentos/42/archivos/501', route => route.fulfill({ json: { data: file } }))
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Archivo no disponible' })).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^Descargar/ })).toHaveCount(0)
    await page.unroute('**/resources/v1/public/documentos/42/archivos/501')
  }
  await page.goto('/documentos/42/archivos/999')
  await expect(page.getByRole('heading', { name: 'Archivo no disponible' })).toBeVisible()
})

test('visor conserva los errores de versión y página, y permite recuperar un PDF ilegible', async ({ page }) => {
  await page.goto('/documentos/42/archivos/501?pagina=0&representacion=markdown')
  await expect(page.getByRole('heading', { name: 'Revisa la dirección del visor' })).toBeVisible()
  await page.getByRole('link', { name: 'Usar la vista predeterminada' }).click()
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await page.goto('/documentos/42/archivos/501?pagina=99')
  await expect(page.getByText('La página solicitada no existe en este PDF.')).toBeVisible()
  await page.getByRole('button', { name: 'Ir a la primera página' }).click()
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await page.route('**/resources/v1/public/documentos/42/archivos/501', route => route.fulfill({ json: { data: fileDetail(files[0]!, 'original') } }))
  await page.goto('/documentos/42/archivos/501?representacion=pdf-searchable')
  await expect(page.getByRole('heading', { name: 'Representación no disponible' })).toBeVisible()
  await page.route('**/representaciones/original', route => route.fulfill({ contentType: 'application/pdf', body: 'Archivo ilegible sintético' }))
  await page.getByRole('link', { name: 'Usar la vista predeterminada' }).click()
  await expect(page.getByRole('alert')).toContainText('No pudimos leer este PDF.')
  await page.unroute('**/representaciones/original')
  await page.getByRole('button', { name: 'Reintentar PDF' }).click()
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
})

test('visor muestra imágenes y ofrece descarga sin incrustar formatos no admitidos', async ({ page }) => {
  const file = { ...files[0]!, nombre: '<img src=x onerror=alert(1)>.png', mimeType: 'image/png' }
  await page.route('**/resources/v1/public/documentos/42/archivos/501', route => route.fulfill({ json: { data: { ...fileDetail(file, 'original'), representaciones: { trusted: true, defaultRepresentation: 'original', representations: [{ tipo: 'original', mimeType: file.mimeType, tamano: 1, fuenteReutilizada: false }] } } } }))
  await page.route('**/representaciones/original', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }))
  await page.goto('/documentos/42/archivos/501')
  await expect(page.getByRole('heading', { name: file.nombre, exact: true })).toBeVisible()
  await expect(page.locator('.image-viewport img')).toBeVisible()
  await page.unroute('**/resources/v1/public/documentos/42/archivos/501')
  await page.route('**/resources/v1/public/documentos/42/archivos/501', route => route.fulfill({ json: { data: { ...fileDetail(files[0]!, 'original'), representaciones: { trusted: true, defaultRepresentation: 'original', representations: [{ tipo: 'original', mimeType: 'text/html', tamano: 1, fuenteReutilizada: false }] } } } }))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Vista previa no disponible para este formato' })).toBeVisible()
  await expect(page.locator('.image-viewport img, iframe, object, embed, canvas')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Descargar archivo', exact: true })).toHaveAttribute('href', /disposition=attachment$/)
})

test('visor integra una sola barra y permite recorrer todas las páginas con render cercano', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.route('**/representaciones/pdf-searchable', route => route.fulfill({ contentType: 'application/pdf', body: samplePdf(20).replaceAll('/MediaBox [0 0 300 200]', '/MediaBox [0 0 600 900]') }))
  await page.goto('/documentos/42/archivos/501')
  const surface = page.locator('.pdf-viewport')
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await expect(page.getByRole('banner')).toHaveCount(1)
  await expect(page.getByRole('main')).toHaveCount(1)
  for (const name of ['Navegación del PDF', 'Zoom del documento']) await expect(page.getByRole('banner').getByLabel(name, { exact: true })).toBeVisible()
  expect((await page.getByRole('banner').boundingBox())!.height).toBeLessThanOrEqual(90)
  await expect(page.locator('.pdf-page')).toHaveCount(20)
  expect(await page.locator('.pdf-page canvas').count()).toBeLessThan(10)
  await surface.evaluate(el => {
    const sheet = el.querySelector('[data-page="10"]')!
    el.scrollTop += sheet.getBoundingClientRect().top - el.getBoundingClientRect().top - 16
  })
  await expect(page).toHaveURL(/pagina=10/)
  await expect(page.locator('.textLayer[aria-label="Texto de la página 10"]')).toContainText('Pagina sintetica 10')
  await expect(page.locator('[data-page="1"] canvas')).toHaveCount(0)
  const input = page.getByLabel('Página', { exact: true })
  await expect(input).toHaveValue('10')
  await input.fill('18')
  await input.press('Enter')
  await expect(page.locator('.textLayer[aria-label="Texto de la página 18"]')).toContainText('Pagina sintetica 18')
  await expect(page).toHaveURL(/pagina=18/)
  await page.goBack()
  await expect(input).toHaveValue('10')
  await expect.poll(async () => surface.evaluate(el => {
    const sheet = el.querySelector('[data-page="10"]')!
    return Math.round(sheet.getBoundingClientRect().top - el.getBoundingClientRect().top)
  })).toBe(16)
  await page.getByLabel('Zoom', { exact: true }).selectOption('1')
  await expect(surface).toHaveAttribute('aria-busy', 'false')
  await page.screenshot({ path: testInfo.outputPath('visor-barra-unica-continuo.png') })
})

test('visor ofrece todos los artefactos confiables y solo carga el elegido sin ejecutar texto', async ({ page }) => {
  const file: FileDetail = fileDetail(files[0]!)
  file.representaciones.representations.push(
    { tipo: 'original', mimeType: 'application/pdf', tamano: 1234, fuenteReutilizada: false },
    { tipo: 'markdown', mimeType: 'text/markdown', tamano: 50, fuenteReutilizada: false },
    { tipo: 'jsonl', mimeType: 'application/x-ndjson', tamano: 50, fuenteReutilizada: false }
  )
  const loaded: string[] = []
  page.on('request', request => { if (request.url().includes('/representaciones/')) loaded.push(new URL(request.url()).pathname.split('/').at(-1)!) })
  await page.route('**/resources/v1/public/documentos/42/archivos/501', route => route.fulfill({ json: { data: file } }))
  await page.route('**/representaciones/markdown', route => route.fulfill({ contentType: 'text/markdown', body: '# Resolución <script>window.injected = true</script>' }))
  await page.route('**/representaciones/jsonl', route => route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ page_count: 1, pages: [{ page: 1, text: 'Ejemplo sintético' }] }) }))
  await page.goto('/documentos/42/archivos/501')
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  const version = page.getByLabel('Versión', { exact: true })
  await expect(version.locator('option')).toHaveText(['PDF con texto', 'Original', 'Texto (Markdown)', 'Datos OCR (JSONL)'])
  expect(loaded).not.toContain('markdown')
  expect(loaded).not.toContain('jsonl')
  await version.selectOption('markdown')
  await expect(page.getByRole('article', { name: 'Markdown renderizado' })).toContainText('<script>window.injected = true</script>')
  expect(await page.evaluate(() => 'injected' in window)).toBe(false)
  await expect(page.getByLabel('Página', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^Descargar Documento/ })).toHaveAttribute('href', /representaciones\/markdown\?disposition=attachment$/)
  await version.selectOption('jsonl')
  await expect(page.locator('.artifact-text')).toContainText('Ejemplo sintético')
  await expect(page).toHaveURL(/representacion=jsonl/)
  await page.reload()
  await expect(version).toHaveValue('jsonl')
  await expect(page.locator('.artifact-text')).toContainText('Ejemplo sintético')
  await page.route('**/representaciones/jsonl', route => route.fulfill({ status: 503, body: '' }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('No pudimos leer este artefacto.')
  await page.unroute('**/representaciones/jsonl')
  await page.route('**/representaciones/jsonl', route => route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ page_count: 1, pages: [{ page: 1, text: 'Recuperado' }] }) }))
  await page.getByRole('button', { name: 'Reintentar artefacto' }).click()
  await expect(page.locator('.artifact-text')).toContainText('Recuperado')
  await version.selectOption('pdf-searchable')
  await expect(page.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await page.route('**/resources/v1/public/documentos/42/archivos/501', route => route.fulfill({ json: { data: fileDetail(files[0]!, 'original') } }))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Representación no disponible' })).toBeVisible()
  await page.getByRole('link', { name: 'Usar la vista predeterminada' }).click()
  await expect(version.locator('option')).toHaveText(['Original'])
})

test('muestras de componentes reutilizan estados, paginación, diálogo y tema sin consultar API', async ({ page }, testInfo) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('/resources/')) requests.push(request.url()) })
  await page.goto('/muestras')
  await expect(page.getByRole('heading', { name: 'Muestras de componentes', exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(1)
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/pagina=2/)
  await expect(page.getByRole('heading', { name: 'Documento de ejemplo 06' })).toBeVisible()
  await page.getByLabel('Estado de la tabla').selectOption('loading')
  await expect(page.getByText('Consultando resultados…')).toBeVisible()
  await page.getByLabel('Estado de la tabla').selectOption('empty')
  await expect(page.getByRole('heading', { name: 'No se encontraron resultados' })).toBeVisible()
  await page.getByLabel('Estado de la tabla').selectOption('error')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Reintentar consulta' }).click()
  await page.getByRole('button', { name: 'Acción principal' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Acción principal' })).toBeFocused()
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
  await page.screenshot({ path: testInfo.outputPath('muestras-componentes-oscuro.png'), fullPage: true })
  expect(requests).toEqual([])
})

test('muestra administrativa usa un solo marco y sidebar accesible en escritorio y móvil', async ({ page }, testInfo) => {
  const issues: string[] = []
  page.on('pageerror', error => issues.push(error.message))
  page.on('console', message => { if (/hydration/i.test(message.text())) issues.push(message.text()) })
  await page.goto('/muestras/administracion')
  await expect(page.getByRole('heading', { name: 'Muestra de administración', exact: true })).toBeVisible()
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('banner')).toHaveCount(1)
  for (const width of [1366, 1920, 683, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    if (width >= 1024) {
      await expect(page.getByRole('complementary', { name: 'Panel lateral' })).toBeVisible()
      await page.getByRole('button', { name: 'Contraer navegación' }).click()
      await expect(page.getByRole('button', { name: 'Expandir navegación' })).toBeVisible()
      await page.getByRole('button', { name: 'Expandir navegación' }).click()
    } else {
      await expect(page.getByRole('complementary', { name: 'Panel lateral' })).not.toBeVisible()
      await page.getByRole('button', { name: 'Abrir navegación' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').getByRole('link', { name: 'Componentes', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Abrir navegación' })).toBeFocused()
    }
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    await page.screenshot({ path: testInfo.outputPath(`administracion-${width}.png`) })
  }
  expect(issues).toEqual([])
})
