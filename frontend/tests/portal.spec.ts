import { expect, test } from '@playwright/test'
import { catalogs, collection, document, fileDetail, files, samplePdf } from './fixtures'

test.beforeEach(async ({ context }) => {
  await context.route('**/resources/v1/public/**', async route => {
    const url = new URL(route.request().url())
    const resource = url.pathname.split('/').pop()
    if (/\/archivos$/.test(url.pathname)) return route.fulfill({ json: collection(files) })
    if (url.pathname.includes('/representaciones/')) return route.fulfill({ contentType: 'application/pdf', body: samplePdf() })
    if (/\/archivos\/\d+$/.test(url.pathname)) {
      const file = files.find(item => String(item.id) === resource)!
      return route.fulfill({ json: { data: fileDetail(file) } })
    }
    if (resource === 'tipos-documento') return route.fulfill({ json: collection(catalogs.types) })
    if (resource === 'siglas') return route.fulfill({ json: collection(catalogs.acronyms) })
    if (resource === 'procesos') return route.fulfill({ json: collection(catalogs.processes) })
    if (resource === '42') return route.fulfill({ json: { data: document } })
    if (/^\d+$/.test(resource || '')) return route.fulfill({ status: 404, json: { message: 'Not Found' } })
    if (resource === 'documentos') {
      const pageNumber = Number(url.searchParams.get('pagina') || 1)
      return route.fulfill({ json: collection(url.searchParams.get('texto') === 'sin resultados' ? [] : [document], pageNumber, 30) })
    }
    throw new Error(`Solicitud no prevista en P7: ${url.pathname}`)
  })
})

test('hidrata sin discrepancias y permite reintentar después de una consulta sin respuesta', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', message => {
    if (/hydration/i.test(message.text())) hydrationErrors.push(message.text())
  })
  await page.clock.install()
  let requests = 0
  await page.route('**/resources/v1/public/documentos?**', () => { requests++ })
  const requested = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/v1/public/documentos'))
  await page.goto('/')
  await requested
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeDisabled()
  await expect(page.getByText('Consultando documentos…', { exact: true })).toBeVisible()
  await page.clock.fastForward(15_000)
  await expect(page.getByRole('heading', { name: 'No pudimos consultar los documentos' })).toBeVisible()
  expect(requests).toBe(1)
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeEnabled()
  await page.unroute('**/resources/v1/public/documentos?**')
  await page.getByRole('button', { name: 'Reintentar consulta' }).click()
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  expect(hydrationErrors).toEqual([])
})

test('muestra resultados pronto, conserva controles táctiles y aprovecha el ancho', async ({ page }, testInfo) => {
  for (const [width, height] of [[1366, 768], [1920, 1080], [390, 844], [320, 568], [683, 384]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Directivas 2.0', exact: true })).toBeAttached()
    const geometry = await page.evaluate(() => {
      const first = window.document.querySelector('.app-table tbody tr')!.getBoundingClientRect()
      const title = window.document.querySelector('.app-table tbody tr h3')!.getBoundingClientRect()
      return {
        firstRowTop : first.top,
        titleBottom : title.top + Math.min(24, title.height),
        mainWidth   : window.document.querySelector('main')!.getBoundingClientRect().width,
        overflow    : window.document.documentElement.scrollWidth > window.innerWidth,
        controls    : [...window.document.querySelectorAll('.compact-actions button, .compact-search input, .compact-search select, .results-options select')].map(el => el.getBoundingClientRect().height)
      }
    })
    await testInfo.attach(`densidad-${width}`, { body: JSON.stringify(geometry), contentType: 'application/json' })
    expect(geometry.overflow).toBe(false)
    if (width >= 1024) {
      expect(geometry.firstRowTop).toBeLessThan(400)
      if (width < 1600) expect(geometry.mainWidth).toBeGreaterThan(width - 64)
      else {
        expect(geometry.mainWidth).toBeGreaterThanOrEqual(1500)
        expect(geometry.mainWidth).toBeLessThanOrEqual(1600)
      }
    } else {
      expect(Math.min(...geometry.controls)).toBeGreaterThanOrEqual(44)
      if (width <= 390) expect(geometry.titleBottom).toBeLessThan(height)
    }
    const lastShortcut = page.getByRole('button', { name: 'Directivas 2.0', exact: true })
    await lastShortcut.focus()
    await expect(lastShortcut).toBeFocused()
    const visibleShortcut = await lastShortcut.evaluate(el => {
      const strip = el.parentElement!.getBoundingClientRect()
      const button = el.getBoundingClientRect()
      return button.left >= strip.left && button.right <= strip.right
    })
    expect(visibleShortcut).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`densidad-${width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/documentos?anio=2026')
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  expect((await page.locator('.app-table tbody tr').first().boundingBox())!.y).toBeLessThan(440)
})

test('filtros activos y resultados comparten fila y se redistribuyen al faltar ancho', async ({ page }, testInfo) => {
  for (const width of [1920, 1366, 900, 683, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/documentos?tipoDocumentoId=1&anio=2026')
    await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
    const geometry = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const rect = window.document.querySelector(selector)!.getBoundingClientRect()
        return { top: rect.top, bottom: rect.bottom, height: rect.height }
      }
      return {
        filters  : bounds('.active-filters button'),
        title    : bounds('.results-title'),
        options  : bounds('.results-options'),
        toolbar  : bounds('.section-heading'),
        table    : bounds('.app-table'),
        controls : [...window.document.querySelectorAll('.compact-fields input, .compact-fields select, .compact-actions button, .results-options select')].map(el => el.getBoundingClientRect().height),
        overflow : window.document.documentElement.scrollWidth > window.innerWidth
      }
    })
    expect(geometry.overflow).toBe(false)
    if (width >= 1366) {
      expect(geometry.filters.top).toBeLessThan(geometry.title.bottom)
      expect(geometry.options.top).toBeLessThan(geometry.title.bottom)
      expect(geometry.toolbar.height).toBeLessThanOrEqual(testInfo.project.name === 'mobile' ? 48 : 34)
      expect(geometry.table.top).toBeLessThan(300)
      if (testInfo.project.name === 'desktop') expect(Math.max(...geometry.controls)).toBeLessThanOrEqual(30)
    }
    if (width < 1024 || testInfo.project.name === 'mobile') expect(Math.min(...geometry.controls)).toBeGreaterThanOrEqual(44)
    await testInfo.attach(`franja-${width}`, { body: JSON.stringify(geometry), contentType: 'application/json' })
    await page.screenshot({ path: testInfo.outputPath(`franja-${width}.png`) })
  }
  await page.goto(`/documentos?texto=${encodeURIComponent('Referencia extensa '.repeat(12))}&tipoDocumentoId=1&anio=2026&numero=45&siglaId=2&procesoId=3&desde=2020-01-01&hasta=2026-10-30`)
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  await expect(page.locator('.active-filters button')).toHaveCount(8)
  expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  await page.getByRole('button', { name: 'Quitar Año: 2026', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page).not.toHaveURL(/anio=2026/)
  await page.goto('/documentos?anio=abc')
  await expect(page.getByRole('heading', { name: 'Revisa los filtros de la dirección' })).toBeVisible()
  await expect(page.getByLabel('Tipo de documento', { exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Quitar Año: abc', exact: true }).click()
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
})

test('etiquetas del documento al final, tipo condicional y proceso sin líneas redundantes', async ({ page }, testInfo) => {
  await page.goto('/documentos')
  const row = page.locator('.document-content').first()
  await expect(row.getByRole('link', { name: document.titulo!, exact: true })).toBeVisible()
  for (const width of [1366, 1920, 683, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(row.locator('.document-bottom .type-label')).toHaveText(['Tipo: Resolución ejecutiva regional', 'Proceso: Gestión institucional'])
    const geometry = await row.evaluate(el => {
      const heading = el.querySelector('h3')!.getBoundingClientRect()
      const tags = [...el.querySelectorAll('.type-label')].map(tag => tag.getBoundingClientRect())
      const link = el.querySelector('.document-bottom a')!.getBoundingClientRect()
      return { headingTop: heading.top, tags: tags.map(tag => ({ top: tag.top, bottom: tag.bottom })), linkTop: link.top, linkBottom: link.bottom }
    })
    expect(geometry.tags.every(tag => tag.top > geometry.headingTop)).toBe(true)
    if (width >= 1366) {
      expect(geometry.tags[0]!.top).toBeLessThan(geometry.tags[1]!.bottom)
      expect(geometry.linkTop).toBeLessThan(geometry.tags[0]!.bottom)
      expect(geometry.linkBottom).toBeGreaterThan(geometry.tags[0]!.top)
    }
    await expect(row.locator('.document-bottom')).not.toContainText('N.° 125')
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    await page.screenshot({ path: testInfo.outputPath(`etiquetas-${width}.png`) })
  }
  await page.getByLabel('Tipo de documento', { exact: true }).selectOption('1')
  await expect(page).toHaveURL(/tipoDocumentoId=1/)
  await expect(row.locator('.document-bottom .type-label')).toHaveText(['Proceso: Gestión institucional'])
  await page.getByLabel('Tipo de documento', { exact: true }).selectOption('')
  await expect(row.locator('.document-bottom .type-label')).toHaveText(['Tipo: Resolución ejecutiva regional', 'Proceso: Gestión institucional'])
  await page.route('**/resources/v1/public/documentos?**', route => route.fulfill({ json: collection([{ ...document, proceso: null }]) }))
  await page.getByLabel('Año', { exact: true }).selectOption('2026')
  await expect(row.locator('.document-bottom .type-label')).toHaveText(['Tipo: Resolución ejecutiva regional'])
  await page.getByLabel('Tipo de documento', { exact: true }).selectOption('1')
  await expect(row.locator('.document-bottom .type-label')).toHaveCount(0)
  await expect(row.getByRole('link', { name: `Consultar ${document.titulo}`, exact: true })).toBeVisible()
  await expect(row.getByRole('link', { name: document.titulo!, exact: true })).toHaveAttribute('href', '/documentos/42')
})

test('búsqueda compartible, paginación, historial y ficha estable', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Documentos normativos', exact: true })).toBeVisible()
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  await page.getByLabel('Búsqueda', { exact: true }).fill('gestión')
  await page.getByLabel('Tipo de documento', { exact: true }).selectOption('1')
  await page.getByLabel('Año', { exact: true }).selectOption('2026')
  const request = page.waitForRequest(req => req.url().includes('/resources/v1/public/documentos?') && req.url().includes('texto='))
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  expect(new URL((await request).url()).searchParams.get('texto')).toBe('gestión')
  await expect(page).toHaveURL(/anio=2026/)
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/pagina=2/)
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Año', { exact: true })).toHaveValue('2026')
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  const restored = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname.endsWith('/v1/public/documentos') && url.searchParams.get('pagina') !== '2'
  })
  await page.goBack()
  await restored
  await expect(page.locator('.results-section')).toHaveAttribute('aria-busy', 'false')
  await expect(page).not.toHaveURL(/pagina=2/)
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  await page.locator('.attachments').scrollIntoViewIfNeeded()
  await expect(page.getByRole('link', { name: /Abrir Documento-tomo/ })).toHaveCount(2)
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(el => el.clientWidth))
  await page.screenshot({ path: testInfo.outputPath('buscador.png'), fullPage: true })
  await page.getByRole('link', { name: document.titulo!, exact: true }).click()
  await expect(page).toHaveURL(/\/documentos\/42$/)
  await expect(page.getByRole('heading', { name: document.titulo!, exact: true })).toBeVisible()
  await expect(page.getByText('Gestión institucional', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('ficha.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('tipo y año filtran al seleccionar sin enviar texto pendiente ni perder criterios', async ({ page }) => {
  const nextRequest = () => page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/v1/public/documentos'))
  await page.goto('/documentos?texto=vigente&pagina=2&orden=fechaAsc&porPagina=20&siglaId=2&procesoId=3')
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  await page.getByLabel('Búsqueda', { exact: true }).fill('nuevo borrador')
  let requested = nextRequest()
  await page.getByLabel('Tipo de documento', { exact: true }).selectOption('1')
  let query = new URL((await requested).url()).searchParams
  expect(Object.fromEntries(query)).toMatchObject({ tipoDocumentoId: '1', texto: 'vigente', orden: 'fechaAsc', porPagina: '20', procesoId: '3' })
  expect(query.has('siglaId')).toBe(false)
  await expect(page).not.toHaveURL(/pagina=2/)
  await expect(page.getByLabel('Búsqueda', { exact: true })).toHaveValue('nuevo borrador')
  requested = nextRequest()
  await page.getByLabel('Año', { exact: true }).selectOption('2025')
  query = new URL((await requested).url()).searchParams
  expect(Object.fromEntries(query)).toMatchObject({ anio: '2025', tipoDocumentoId: '1', texto: 'vigente', orden: 'fechaAsc', porPagina: '20' })
  await expect(page).toHaveURL(/anio=2025/)
  await expect(page.getByLabel('Búsqueda', { exact: true })).toHaveValue('nuevo borrador')
  requested = nextRequest()
  await page.getByLabel('Año', { exact: true }).selectOption('')
  expect(new URL((await requested).url()).searchParams.has('anio')).toBe(false)
  await expect(page).not.toHaveURL(/anio=/)
  requested = nextRequest()
  await page.getByLabel('Tipo de documento', { exact: true }).selectOption('')
  expect(new URL((await requested).url()).searchParams.has('tipoDocumentoId')).toBe(false)
  await expect(page.getByLabel('Búsqueda', { exact: true })).toHaveValue('nuevo borrador')
  requested = nextRequest()
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  expect(new URL((await requested).url()).searchParams.get('texto')).toBe('nuevo borrador')
  await expect(page).toHaveURL(/texto=nuevo/)
  await page.goBack()
  await expect(page.getByLabel('Búsqueda', { exact: true })).toHaveValue('vigente')
  await page.reload()
  await expect(page.getByLabel('Ordenar por', { exact: true })).toHaveValue('fechaAsc')
  await expect(page.getByLabel('Resultados por página', { exact: true })).toHaveValue('20')
  await page.goto('/documentos?numero=45&anio=2026')
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  await expect(page.getByLabel('Búsqueda', { exact: true })).toHaveValue('45-2026')
  requested = nextRequest()
  await page.getByLabel('Año', { exact: true }).selectOption('2024')
  expect(Object.fromEntries(new URL((await requested).url()).searchParams)).toMatchObject({ numero: '45', anio: '2024' })
  await expect(page.getByLabel('Búsqueda', { exact: true })).toHaveValue('45-2024')
})

test('encabezado público permanece arriba sin ocultar foco ni destinos de navegación', async ({ page }, testInfo) => {
  const records = Array.from({ length: 20 }, (_, index) => ({ ...document, id: index === 0 ? 42 : 100 + index, titulo: `Documento de prueba ${index + 1}` }))
  await page.route('**/resources/v1/public/documentos?**', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('pagina') || 1)
    return route.fulfill({ json: collection(records, current, 40) })
  })
  await page.route('**/resources/v1/public/documentos/*/archivos?**', route => route.fulfill({ json: collection([]) }))
  for (const [width, height] of [[1366, 768], [1920, 1080], [390, 844], [320, 568], [683, 384]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto('/documentos?porPagina=20')
    await expect(page.locator('.app-table tbody tr')).toHaveCount(20)
    await page.locator('.app-table tbody tr').last().scrollIntoViewIfNeeded()
    const header = page.locator('.site-header')
    await expect(header).toBeInViewport()
    expect((await header.boundingBox())!.y).toBe(0)
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    expect((await header.boundingBox())!.y).toBe(0)
    const firstLink = page.getByRole('link', { name: 'Documento de prueba 1', exact: true })
    await firstLink.focus()
    await firstLink.evaluate(el => el.scrollIntoView({ block: 'start' }))
    await expect(firstLink).toBeFocused()
    let bounds = (await header.boundingBox())!
    expect((await firstLink.boundingBox())!.y).toBeGreaterThanOrEqual(bounds.y + bounds.height)
    await page.getByRole('link', { name: 'Siguiente' }).click()
    await expect(page).toHaveURL(/#results-heading$/)
    await expect(page.locator('.results-section')).toHaveAttribute('aria-busy', 'false')
    bounds = (await header.boundingBox())!
    expect((await page.locator('#results-heading').boundingBox())!.y).toBeGreaterThanOrEqual(bounds.y + bounds.height)
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    await page.screenshot({ path: testInfo.outputPath(`header-fijo-${width}.png`) })
    await page.getByRole('button', { name: 'Cambiar a modo claro' }).click()
  }
  await page.locator('.header-content').evaluate(el => { (el as HTMLElement).style.minHeight = '96px' })
  await expect.poll(() => page.locator('html').evaluate(el => el.style.getPropertyValue('--public-header-height').trim())).toBe('103px')
  await page.locator('#results-heading').evaluate(el => el.scrollIntoView({ block: 'start' }))
  expect((await page.locator('#results-heading').boundingBox())!.y).toBeGreaterThanOrEqual(103)
  await page.getByRole('link', { name: 'Documento de prueba 1', exact: true }).click()
  await expect(page).toHaveURL(/\/documentos\/42$/)
  await expect(page.getByRole('heading', { name: document.titulo!, exact: true })).toBeVisible()
  await expect(page.locator('.site-header')).toBeInViewport()
  await page.keyboard.press('Tab')
  await page.getByRole('link', { name: 'Saltar al contenido' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  const main = (await page.locator('main').boundingBox())!
  const header = (await page.locator('.site-header').boundingBox())!
  expect(main.y).toBeGreaterThanOrEqual(header.y + header.height)
})

test('accesos rápidos, controles conservados y varios iconos para abrir archivos exactos', async ({ page, context }) => {
  await page.goto('/documentos?pagina=2')
  await page.getByRole('button', { name: 'Resoluciones Gerenciales (RGR)', exact: true }).click()
  await expect(page).toHaveURL(/tipoDocumentoId=7/)
  await expect(page).not.toHaveURL(/pagina=2/)
  await page.getByLabel('Ordenar por', { exact: true }).selectOption('fechaAsc')
  await expect(page).toHaveURL(/orden=fechaAsc/)
  await page.getByLabel('Resultados por página', { exact: true }).selectOption('20')
  await expect(page).toHaveURL(/porPagina=20/)
  await page.getByLabel('Búsqueda', { exact: true }).fill('045-2026')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page).toHaveURL(/numero=45/)
  await expect(page).toHaveURL(/anio=2026/)
  await page.locator('.attachments').scrollIntoViewIfNeeded()
  const links = page.getByRole('link', { name: /Abrir Documento-tomo/ })
  await expect(links).toHaveCount(2)
  await expect(links.nth(0)).toHaveAttribute('href', '/documentos/42/archivos/501')
  await expect(links.nth(1)).toHaveAttribute('href', '/documentos/42/archivos/502')
  const opened = context.waitForEvent('page')
  await links.nth(1).click()
  const filePage = await opened
  await expect(filePage).toHaveURL(/\/documentos\/42\/archivos\/502$/)
  await expect(filePage.locator('.textLayer[aria-label="Texto de la página 1"]')).toContainText('Pagina sintetica 1')
  await filePage.close()
})

test('PDF compactos, tomos cero y uno y fecha centrada sin cambiar enlaces', async ({ page }, testInfo) => {
  const grouped = new Map<number, typeof files>([
    [42, files.map((file, index) => ({ ...file, tomo: index }))],
    [43, [{ ...files[0]!, id: 601, documentoId: 43, tomo: 0 }]],
    [44, [{ ...files[0]!, id: 701, documentoId: 44, tomo: 0, nombre: 'Imagen.jpg', mimeType: 'image/jpeg' }]],
    [45, [{ ...files[0]!, id: 801, documentoId: 45, tomo: 0, nombre: 'Digitalizado.tiff', mimeType: 'image/tiff' }]]
  ])
  const records = [...grouped.keys()].map(id => ({ ...document, id, titulo: `Documento de prueba ${id}`, descripcion: 'Descripción institucional extensa para comprobar la alineación vertical. '.repeat(6) }))
  await page.route('**/resources/v1/public/documentos?**', route => route.fulfill({ json: collection(records) }))
  await page.route('**/resources/v1/public/documentos/*/archivos?**', route => {
    const id = Number(new URL(route.request().url()).pathname.split('/').at(-2))
    return route.fulfill({ json: collection(grouped.get(id)!) })
  })
  await page.route('**/resources/v1/public/documentos/*/archivos/*', route => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop())
    const file = [...grouped.values()].flat().find(item => item.id === id)!
    return route.fulfill({ json: { data: fileDetail(file, id === 601 || id === 701 ? 'original' : 'pdf-searchable') } })
  })
  await page.goto('/documentos')
  const rows = page.locator('.app-table tbody tr')
  await expect(rows).toHaveCount(4)
  for (const width of [1366, 1920, 683, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    for (let index = 0; index < 4; index++) {
      await rows.nth(index).scrollIntoViewIfNeeded()
      await expect(rows.nth(index).locator('.attachment-icons a')).toHaveCount(index === 0 ? 2 : 1)
    }
    const geometry = await page.evaluate(() => ({
      heights : [...window.document.querySelectorAll('.file-icon')].map(el => el.getBoundingClientRect().height),
      rows    : [...window.document.querySelectorAll('.app-table tbody tr')].map(row => {
        const cell = row.getBoundingClientRect()
        const date = row.querySelector('time')!.getBoundingClientRect()
        return { middle: cell.top + cell.height / 2, dateMiddle: date.top + date.height / 2 }
      }),
      pairedTops : [...window.document.querySelectorAll('.app-table tbody tr:first-child .file-icon')].map(el => el.getBoundingClientRect().top),
      overflow   : window.document.documentElement.scrollWidth > window.innerWidth
    }))
    expect(geometry.heights).toEqual([44, 44, 44, 44, 44])
    expect(geometry.overflow).toBe(false)
    if (width >= 640) for (const row of geometry.rows) expect(Math.abs(row.middle - row.dateMiddle)).toBeLessThan(3)
    if (width >= 1024) expect(geometry.pairedTops[0]).toBe(geometry.pairedTops[1])
    await rows.first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`pdf-compactos-${width}.png`) })
  }
  await expect(rows.first().locator('.file-volume')).toHaveText(['T. 0', 'T. 1'])
  await expect(rows.first().locator('a.file-icon')).toHaveText(['T. 0', 'T. 1'])
  await expect(rows.nth(1).locator('.file-volume')).toHaveCount(0)
  await expect(rows.nth(1).locator('a.file-icon')).toHaveText('PDF')
  await expect(rows.nth(1).locator('a.file-icon')).toHaveClass(/pdf-file/)
  await expect(rows.nth(2).locator('a.file-icon')).not.toHaveClass(/pdf-file/)
  await expect(rows.nth(2).locator('a.file-icon')).toHaveText('Archivo')
  await expect(rows.nth(3).locator('a.file-icon')).toHaveClass(/pdf-file/)
  await expect(rows.nth(3).locator('a.file-icon')).toHaveText('PDF')
  const first = rows.first().locator('a.file-icon').first()
  await expect(first).toHaveAttribute('aria-label', /tomo 0 \(nueva pestaña\)/)
  await expect(first).toHaveAttribute('href', '/documentos/42/archivos/501')
  await first.focus()
  await expect(first).toBeFocused()
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: testInfo.outputPath('pdf-compactos-oscuro.png') })
  expect(await first.evaluate(el => getComputedStyle(el).color)).toBe('rgb(253, 164, 175)')
})

test('ficha con archivos, tomos y metadatos antes de la descripción', async ({ page, context }, testInfo) => {
  const detailFiles = [
    { ...files[0]!, tomo: 0, nombre: `${'Documento-institucional-extenso-'.repeat(4)}<img src=x onerror=alert(1)>.pdf` },
    { ...files[1]!, tomo: 0, nombre: 'Digitalizado.tiff', mimeType: 'image/tiff', cantidadPaginas: null },
    { ...files[0]!, id: 503, tomo: 1, nombre: 'Anexo.jpg', mimeType: 'image/jpeg', cantidadPaginas: 1, tamano: 0 }
  ]
  await page.route('**/resources/v1/public/documentos/42/archivos?**', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('pagina'))
    const response = collection(current === 1 ? detailFiles.slice(0, 2) : detailFiles.slice(2), current, 3)
    response.meta.ultimaPagina = 2
    return route.fulfill({ json: response })
  })
  await page.route('**/resources/v1/public/documentos/42/archivos/*', route => {
    const file = detailFiles.find(item => String(item.id) === new URL(route.request().url()).pathname.split('/').pop())!
    return route.fulfill({ json: { data: fileDetail(file, file.id === 503 ? 'original' : 'pdf-searchable') } })
  })
  const issues: string[] = []
  page.on('pageerror', error => issues.push(error.message))
  page.on('console', message => { if (/hydration/i.test(message.text())) issues.push(message.text()) })
  await page.goto('/documentos/42')
  const section = page.getByRole('region', { name: 'Archivos disponibles', exact: true })
  const rows = section.locator('.app-table tbody tr')
  await expect(rows).toHaveCount(3)
  await expect(section.getByRole('table', { name: 'Archivos asociados al documento' })).toHaveCount(1)
  await expect(section.getByRole('columnheader')).toHaveText(['Archivo y detalles', 'Acceso'])
  await expect(rows.locator('strong')).toHaveText(['Tomo 0', 'Tomo 0', 'Tomo 1'])
  await expect(rows.first().locator('.detail-file-name')).toHaveText(detailFiles[0]!.nombre)
  await expect(rows.first().locator('.detail-file-metadata')).toContainText('Original: PDF · 5 páginas · 123.5 kB')
  await expect(rows.nth(1).locator('.detail-file-metadata')).toContainText('Original: TIFF')
  await expect(rows.nth(1).locator('.detail-file-metadata')).not.toContainText('páginas')
  await expect(rows.nth(2).locator('.detail-file-metadata')).toContainText('Original: JPEG · 1 página · 0 B')
  await expect(section.locator('img')).toHaveCount(0)
  await expect(rows.nth(2).getByRole('link', { name: /^Abrir archivo/ })).toHaveAttribute('href', '/documentos/42/archivos/503')
  for (const width of [1366, 1920, 683, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await section.scrollIntoViewIfNeeded()
    const fileSection = (await section.boundingBox())!
    const description = (await page.getByRole('heading', { name: 'Descripción', exact: true }).boundingBox())!
    expect(fileSection.y + fileSection.height).toBeLessThanOrEqual(description.y)
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    for (const link of await section.getByRole('link').all()) {
      const size = (await link.boundingBox())!
      expect(size.height).toBeGreaterThanOrEqual(44)
      expect(size.width).toBeGreaterThanOrEqual(44)
      const cell = (await link.locator('..').boundingBox())!
      expect(size.x).toBeGreaterThanOrEqual(cell.x)
      expect(size.x + size.width).toBeLessThanOrEqual(cell.x + cell.width)
    }
    if (width < 640) {
      for (const row of await rows.all()) {
        const info = (await row.locator('.detail-file-info').boundingBox())!
        const action = (await row.getByRole('link').boundingBox())!
        expect(action.y).toBeGreaterThanOrEqual(info.y + info.height)
      }
    }
    await page.screenshot({ path: testInfo.outputPath(`ficha-archivos-${width}.png`), fullPage: true })
  }
  const link = rows.nth(1).getByRole('link', { name: /^Ver PDF/ })
  await link.focus()
  await expect(link).toBeFocused()
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  const opened = context.waitForEvent('page')
  await link.click()
  const filePage = await opened
  await expect(filePage).toHaveURL(/\/documentos\/42\/archivos\/502$/)
  await filePage.close()
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.mouse.move(0, 0)
  await link.blur()
  expect(await rows.first().evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(await rows.nth(1).evaluate(el => getComputedStyle(el).backgroundColor))
  expect(await rows.first().evaluate(el => getComputedStyle(el).borderBottomStyle)).toBe('solid')
  await page.screenshot({ path: testInfo.outputPath('ficha-archivos-oscuro.png'), fullPage: true })
  expect(issues).toEqual([])
})

test('ficha compacta sus metadatos y usa la tabla compartida sin duplicar consultas', async ({ page }, testInfo) => {
  const requests = new Map<string, number>()
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname.includes('/documentos/42/archivos')) requests.set(url.href, (requests.get(url.href) || 0) + 1)
  })
  await page.route('**/resources/v1/public/documentos/42/archivos?**', route => route.fulfill({ json: collection([files[0]!]) }))
  await page.goto('/documentos/42')
  const table = page.getByRole('table', { name: 'Archivos asociados al documento' })
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Archivos disponibles', exact: true }).getByText('1 archivo', { exact: true })).toBeVisible()
  for (const theme of ['claro', 'oscuro']) {
    if (theme === 'oscuro') await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
    for (const width of [1366, 1920, 683, 390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      await page.evaluate(() => window.scrollTo(0, 0))
      const metadata = (await page.locator('.metadata-grid').boundingBox())!
      // En 320 px el nombre del proceso ocupa dos líneas; se conserva completo.
      expect(metadata.height).toBeLessThanOrEqual(width < 640 ? 178 : 108)
      const firstRow = (await table.locator('tbody tr').boundingBox())!
      expect(firstRow.y).toBeLessThan(width < 640 ? 590 : 400)
      expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
      await expect(table.getByRole('link', { name: /^Ver PDF/ })).toHaveCount(1)
      if (width === 1366 || width === 390) {
        await page.screenshot({ path: testInfo.outputPath(`ficha-compacta-${theme}-${width}.png`), fullPage: true })
      }
    }
  }
  expect([...requests.values()]).toEqual([1, 1])
})

test('ficha mantiene metadatos durante carga y recupera errores de archivos', async ({ page }) => {
  let release: () => void = () => {}
  const waiting = new Promise<void>(resolve => { release = resolve })
  await page.route('**/resources/v1/public/documentos/42/archivos?**', async route => {
    await waiting
    return route.fulfill({ status: 503, json: {} })
  })
  await page.goto('/documentos/42')
  const section = page.getByRole('region', { name: 'Archivos disponibles', exact: true })
  await expect(section.getByText('Cargando archivos…')).toBeVisible()
  await expect(page.getByText(document.descripcion!, { exact: true })).toBeVisible()
  release()
  await expect(section.getByRole('alert')).toContainText('No se pudieron cargar los archivos.')
  await page.unroute('**/resources/v1/public/documentos/42/archivos?**')
  await page.route('**/resources/v1/public/documentos/42/archivos/501', route => route.fulfill({ json: { data: fileDetail(files[0]!, 'original', false) } }))
  await page.route('**/resources/v1/public/documentos/42/archivos/502', route => route.fulfill({ status: 503, json: {} }))
  await section.getByRole('button', { name: 'Reintentar archivos' }).click()
  await expect(section.getByRole('img', { name: /no disponible/ })).toHaveCount(2)
  await expect(section.getByRole('link')).toHaveCount(0)
  await page.unroute('**/resources/v1/public/documentos/42/archivos/502')
  await section.getByRole('button', { name: 'Reintentar archivos' }).click()
  await expect(section.getByRole('link', { name: /^Ver PDF Documento-tomo-2/ })).toBeVisible()
  await expect(section.getByRole('img', { name: /no disponible/ })).toHaveCount(1)
})

test('ficha sin archivos muestra vacío explícito y un 404 no consulta adjuntos', async ({ page }) => {
  await page.route('**/resources/v1/public/documentos/42/archivos?**', route => route.fulfill({ json: collection([]) }))
  await page.goto('/documentos/42')
  const section = page.getByRole('region', { name: 'Archivos disponibles', exact: true })
  await expect(section.getByRole('status')).toHaveText('No hay archivos asociados a este documento.')
  await expect(section.getByRole('link')).toHaveCount(0)
  const requests: string[] = []
  page.on('request', request => { if (new URL(request.url()).pathname.includes('/999/archivos')) requests.push(request.url()) })
  await page.goto('/documentos/999')
  await expect(page.getByRole('heading', { name: 'Documento no encontrado' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Archivos disponibles', exact: true })).toHaveCount(0)
  expect(requests).toEqual([])
})

test('no abre archivos no disponibles y permite recuperar la consulta de adjuntos', async ({ page }) => {
  await page.route('**/archivos/501', route => route.fulfill({ json: { data: fileDetail(files[0]!, 'original', false) } }))
  await page.route('**/archivos/502', route => route.fulfill({ status: 503, json: {} }))
  await page.goto('/documentos')
  await page.locator('.attachments').scrollIntoViewIfNeeded()
  await expect(page.getByRole('img', { name: /no disponible/ })).toHaveCount(2)
  await expect(page.getByRole('link', { name: /Abrir Documento-tomo/ })).toHaveCount(0)
  await page.unroute('**/archivos/502')
  await page.getByRole('button', { name: 'Reintentar archivos' }).click()
  await expect(page.getByRole('link', { name: /Abrir Documento-tomo-2/ })).toBeVisible()
})

test('vacío, recuperación de errores y documento no disponible', async ({ page }) => {
  await page.goto('/documentos?texto=sin%20resultados')
  await expect(page.getByRole('heading', { name: 'No se encontraron documentos' })).toBeVisible()
  await page.route('**/resources/v1/public/documentos?**', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }))
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.getByRole('heading', { name: 'No pudimos consultar los documentos' })).toBeVisible()
  await page.unroute('**/resources/v1/public/documentos?**')
  await page.getByRole('button', { name: 'Reintentar consulta' }).click()
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  await page.goto('/documentos/999')
  await expect(page.getByRole('heading', { name: 'Documento no encontrado' })).toBeVisible()
})

test('teclado, carga, catálogos recuperables y filtros inválidos', async ({ page }) => {
  let release: () => void = () => {}
  const waiting = new Promise<void>(resolve => { release = resolve })
  await page.route('**/resources/v1/public/documentos?**', async route => {
    await waiting
    await route.fulfill({ json: collection([document]) })
  })
  await page.route('**/resources/v1/public/tipos-documento?**', route => route.fulfill({ status: 503, json: {} }))
  await page.goto('/')
  await expect(page.getByText('Consultando documentos…', { exact: true })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  release()
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  await expect(page.getByText('No pudimos cargar los catálogos.', { exact: false })).toBeVisible()
  await page.unroute('**/resources/v1/public/tipos-documento?**')
  await page.getByRole('button', { name: 'Reintentar catálogos' }).click()
  await expect(page.getByLabel('Tipo de documento', { exact: true })).toBeEnabled()
  await page.goto('/documentos?pagina=-1')
  await expect(page.getByRole('heading', { name: 'Revisa los filtros de la dirección' })).toBeVisible()
})

test('tema claro inicial, oscuro recordado y layout compartido sin avisos de hidratación', async ({ page, context }, testInfo) => {
  const issues: string[] = []
  const unexpectedResources: string[] = []
  page.on('pageerror', error => issues.push(error.message))
  page.on('console', message => {
    if (/hydration|failed to resolve component|failed to load icon/i.test(message.text())) issues.push(message.text())
  })
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') unexpectedResources.push(request.url())
    if (url.pathname.includes('_nuxt_icon')) unexpectedResources.push(request.url())
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.getByText(document.titulo!, { exact: true })).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.locator('main')).toHaveCount(1)
  await expect(page.locator('header.site-header')).toHaveCount(1)
  const lightBackground = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect.poll(async () => (await context.cookies()).find(cookie => cookie.name === 'normatividad-theme')?.value).toBe('dark')
  const darkBackground = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)
  expect(darkBackground).not.toBe(lightBackground)
  await page.screenshot({ path: testInfo.outputPath('buscador-oscuro.png'), fullPage: true })
  await page.getByRole('link', { name: document.titulo!, exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('main')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('heading', { name: document.titulo!, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cambiar a modo claro' })).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: testInfo.outputPath('ficha-oscura.png'), fullPage: true })
  await page.getByRole('button', { name: 'Cambiar a modo claro' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Cambiar a modo oscuro' })).toBeVisible()
  expect(issues).toEqual([])
  expect(unexpectedResources).toEqual([])
})

test('cabecera ordena remotamente y el reflujo conserva una instancia de cada adjunto', async ({ page }) => {
  const counts = new Map<string, number>()
  page.on('request', request => {
    const path = new URL(request.url()).pathname
    if (path.includes('/documentos/42/archivos')) counts.set(path, (counts.get(path) || 0) + 1)
  })
  await page.goto('/documentos?anio=2026&porPagina=20')
  await page.locator('.attachments').scrollIntoViewIfNeeded()
  await expect(page.getByRole('link', { name: /Abrir Documento-tomo/ })).toHaveCount(2)
  for (const width of [1366, 390, 320, 1920]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.locator('.attachments')).toHaveCount(1)
    await expect(page.getByRole('link', { name: /Abrir Documento-tomo/ })).toHaveCount(2)
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  }
  expect([...counts.values()]).toEqual([1, 1, 1])
  const ordered = page.waitForRequest(request => {
    const url = new URL(request.url())
    return url.pathname.endsWith('/documentos') && url.searchParams.get('orden') === 'fechaAsc'
  })
  await page.getByRole('button', { name: /^Fecha/ }).focus()
  await page.keyboard.press('Enter')
  await ordered
  await expect(page.getByLabel('Ordenar por', { exact: true })).toHaveValue('fechaAsc')
  await expect(page).toHaveURL(/anio=2026/)
  await expect(page).toHaveURL(/porPagina=20/)
  await expect(page.locator('th[aria-sort="ascending"]')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /^Fecha/ })).toBeFocused()
})


test('tabla compartida distingue filas y resalta hover y foco sin cambiar su geometría', async ({ page }, testInfo) => {
  const records = Array.from({ length: 4 }, (_, index) => ({
    ...document,
    id          : 100 + index,
    titulo      : `Norma de prueba ${index + 1}`,
    descripcion : index % 2 ? 'Descripción institucional breve.' : 'Descripción institucional extensa. '.repeat(12)
  }))
  await page.route('**/resources/v1/public/documentos?**', route => route.fulfill({ json: collection(records) }))
  await page.route('**/resources/v1/public/documentos/*/archivos?**', route => route.fulfill({ json: collection([]) }))
  await page.goto('/documentos')
  const rows = page.locator('.app-table tbody tr')
  await expect(rows).toHaveCount(4)
  for (const theme of ['claro', 'oscuro']) {
    if (theme === 'oscuro') {
      await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
      await expect(page.locator('html')).toHaveClass(/dark/)
    }
    for (const width of [1366, 1920, 683, 390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      await page.getByLabel('Búsqueda', { exact: true }).focus()
      await page.mouse.move(0, 0)
      const before = await rows.evaluateAll(elements => elements.map(el => {
        const style = getComputedStyle(el)
        return { background: style.backgroundColor, height: el.getBoundingClientRect().height, border: style.borderBottomWidth, borderStyle: style.borderBottomStyle, borderColor: style.borderBottomColor }
      }))
      expect(before[0]!.background).toBe(before[2]!.background)
      expect(before[1]!.background).toBe(before[3]!.background)
      expect(before[0]!.background).not.toBe(before[1]!.background)
      for (const row of before.slice(0, -1)) {
        expect(row.border).toBe('1px')
        expect(row.borderStyle).toBe('solid')
      }
      const headerColor = await page.locator('.app-table th').first().evaluate(el => getComputedStyle(el).backgroundColor)
      const firstLink = rows.first().locator('h3 a')
      await firstLink.focus()
      await expect(firstLink).toBeFocused()
      const focused = await rows.first().evaluate(el => ({ background: getComputedStyle(el).backgroundColor, height: el.getBoundingClientRect().height }))
      expect(focused.background).not.toBe(before[0]!.background)
      expect(focused.height).toBe(before[0]!.height)
      await page.getByLabel('Búsqueda', { exact: true }).focus()
      expect(await rows.first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe(before[0]!.background)
      if (await page.evaluate(() => matchMedia('(hover: hover)').matches)) {
        await rows.nth(1).hover()
        const hovered = await rows.nth(1).evaluate(el => ({ background: getComputedStyle(el).backgroundColor, height: el.getBoundingClientRect().height }))
        expect(hovered.background).toBe(focused.background)
        expect(hovered.height).toBe(before[1]!.height)
        await page.mouse.move(0, 0)
        expect(await rows.nth(1).evaluate(el => getComputedStyle(el).backgroundColor)).toBe(before[1]!.background)
      }
      expect(await page.locator('.app-table th').first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe(headerColor)
      expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
      await page.screenshot({ path: testInfo.outputPath(`filas-${theme}-${width}.png`), fullPage: true })
    }
  }
  await expect(rows.first().locator('h3 a')).toHaveAttribute('href', '/documentos/100')
})

test('página completa y metadatos extensos conservan acciones y ancho', async ({ page }, testInfo) => {
  const records = Array.from({ length: 20 }, (_, index) => ({
    ...document,
    id          : 100 + index,
    titulo      : `Norma ${index + 1}: ${'título-institucional-extenso-'.repeat(8)}`,
    descripcion : 'Descripción extensa de prueba. '.repeat(30)
  }))
  await page.route('**/resources/v1/public/documentos?**', route => route.fulfill({ json: collection(records, 1, 500) }))
  await page.route('**/resources/v1/public/documentos/*/archivos?**', route => route.fulfill({ json: collection([]) }))
  await page.goto('/documentos?porPagina=20')
  await expect(page.locator('.app-table tbody tr')).toHaveCount(20)
  await page.locator('.app-table tbody tr').last().scrollIntoViewIfNeeded()
  await expect(page.getByRole('link', { name: /Consultar Norma 20:/ })).toBeVisible()
  expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  await page.locator('.app-table tbody tr').first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('metadatos-extensos.png') })
})
