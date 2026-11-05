import { expect, test } from '@playwright/test'
import { document, fileDetail, files } from './fixtures'

const markdown = '# Resolución de ejemplo\n\n**Artículo primero.**\nSegunda línea.\n\n- Disposición uno\n- Disposición dos\n\n| Dato | Valor |\n|---|---|\n| Año | 2026 |\n\n```json\n{"page":1}\n```\n\n<script>window.injected = true</script>\n\n![remota](https://externo.invalid/pixel.png)\n\n[Enlace inseguro](javascript:alert%281%29)'
const pages = [1, 2, 3].map(page => ({ page, text: `Contenido exclusivo de la página ${page}.\nOtra línea con acento: Huánuco.`, char_count: 75, word_count: 12, empty: false }))
const artifact = JSON.stringify({ schema: 'ocr-document', page_count: 3, metadata: { source_path: '/interno/no-mostrar' }, pages })

test.beforeEach(async ({ context }) => {
  await context.route('**/resources/v1/public/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/representaciones/jsonl')) return route.fulfill({ contentType: 'application/x-ndjson', headers: url.searchParams.has('disposition') ? { 'Content-Disposition': 'attachment; filename="ejemplo.jsonl"' } : {}, body: artifact })
    if (url.pathname.endsWith('/representaciones/markdown')) return route.fulfill({ contentType: 'text/markdown', body: markdown })
    if (url.pathname.endsWith('/archivos/501')) {
      const detail = fileDetail(files[0]!)
      detail.representaciones.representations.push(
        { tipo: 'jsonl', mimeType: 'application/x-ndjson', tamano: artifact.length, fuenteReutilizada: false },
        { tipo: 'markdown', mimeType: 'text/markdown', tamano: markdown.length, fuenteReutilizada: false }
      )
      return route.fulfill({ json: { data: detail } })
    }
    if (url.pathname.endsWith('/documentos/42')) return route.fulfill({ json: { data: document } })
    return route.fulfill({ status: 404, json: {} })
  })
})

test('JSON OCR muestra una página, conserva URL e historial, copia JSON válido y descarga todas', async ({ page }, testInfo) => {
  const messages: string[] = []
  page.on('pageerror', error => messages.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text } } })
  })
  await page.goto('/documentos/42/archivos/501?representacion=jsonl')
  const code = page.locator('.cm-content')
  await expect(code).toContainText('Contenido exclusivo de la página 1.')
  await expect(code).not.toContainText('Contenido exclusivo de la página 2.')
  await expect(code).not.toContainText('source_path')
  await expect(code).toHaveAttribute('aria-readonly', 'true')
  await expect(code.locator('span').first()).toBeVisible()
  await expect(page.locator('.cm-lineNumbers')).toBeVisible()
  await page.getByTitle('Plegar línea', { exact: true }).first().click()
  await expect(page.locator('.cm-foldPlaceholder')).toBeVisible()
  const copy = page.getByRole('button', { name: 'Copiar JSON de la página' })
  await copy.click()
  await expect(copy).toHaveText('Copiado')
  expect(JSON.parse(await page.evaluate(() => (window as unknown as { copied: string }).copied))).toEqual(pages[0])
  // CodeMirror also keeps an invisible closed-marker spacer to measure gutter width.
  await page.locator('.cm-foldGutter [title="Desplegar línea"]:visible').first().click()
  await expect(code).toContainText('Contenido exclusivo de la página 1.')
  await page.getByRole('button', { name: 'Página siguiente del JSON' }).click()
  await expect(page).toHaveURL(/pagina=2/)
  await expect(code).toContainText('Contenido exclusivo de la página 2.')
  await expect(code).not.toContainText('Contenido exclusivo de la página 1.')
  const number = page.getByLabel('Página JSON', { exact: true })
  await number.fill('3')
  await number.press('Enter')
  await expect(code).toContainText('Contenido exclusivo de la página 3.')
  await expect(page.getByRole('button', { name: 'Página siguiente del JSON' })).toBeDisabled()
  await page.goBack()
  await expect(code).toContainText('Contenido exclusivo de la página 2.')
  await page.reload()
  await expect(number).toHaveValue('2')
  await expect(code).toContainText('Contenido exclusivo de la página 2.')
  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: /^Descargar Documento/ }).click()
  const downloaded = await download
  const stream = (await downloaded.createReadStream())!
  let full = ''
  for await (const chunk of stream) full += chunk.toString()
  expect(JSON.parse(full).pages).toEqual(pages)
  for (const width of [1366, 1920, 683, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    await expect(copy).toBeVisible()
    await expect(code).toBeVisible()
    const bounds = await code.boundingBox()
    expect(bounds!.height).toBeGreaterThan(100)
  }
  await code.focus()
  await expect(code).toBeFocused()
  const beforeTyping = await code.textContent()
  await page.keyboard.press('A')
  await expect(code).toHaveText(beforeTyping!)
  await page.screenshot({ path: testInfo.outputPath('json-movil-claro.png') })
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.screenshot({ path: testInfo.outputPath('json-escritorio-oscuro.png') })
  expect(messages).toEqual([])
})

test('Markdown alterna lectura renderizada y código sin recargar, copia la fuente y bloquea contenido activo', async ({ page }, testInfo) => {
  const requests: string[] = []
  const errors: string[] = []
  page.on('request', request => requests.push(request.url()))
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text } } })
  })
  await page.goto('/documentos/42/archivos/501?representacion=markdown')
  const rendered = page.getByRole('article', { name: 'Markdown renderizado' })
  await expect(rendered.getByRole('heading', { name: 'Resolución de ejemplo' })).toBeVisible()
  await expect(rendered.locator('strong')).toHaveText('Artículo primero.')
  await expect(rendered.getByRole('listitem')).toHaveCount(2)
  await expect(rendered.getByRole('table')).toHaveCount(1)
  await expect(rendered.locator('pre code')).toContainText('{"page":1}')
  await expect(rendered.locator('script, img, iframe, style, svg, a[href^="javascript:"]')).toHaveCount(0)
  expect(await page.evaluate(() => 'injected' in window)).toBe(false)
  await page.getByRole('button', { name: 'Copiar código Markdown visible' }).click()
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(markdown)
  const sourceButton = page.getByRole('button', { name: 'Código MD', exact: true })
  await sourceButton.focus()
  await sourceButton.press('Enter')
  await expect(sourceButton).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Código Markdown', { exact: true })).toHaveText(markdown)
  await page.getByRole('button', { name: 'Renderizado', exact: true }).click()
  await expect(rendered).toBeVisible()
  expect(requests.filter(url => new URL(url).pathname.endsWith('/representaciones/markdown'))).toHaveLength(1)
  expect(requests.filter(url => url.startsWith('https://externo.invalid'))).toEqual([])
  for (const theme of ['claro', 'oscuro']) {
    if (theme === 'oscuro') await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
    for (const width of [1366, 1920, 683, 390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => window.document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
      await expect(sourceButton).toBeVisible()
      if (width === 1366 || width === 390) await page.screenshot({ path: testInfo.outputPath(`markdown-${theme}-${width}.png`) })
    }
  }
  expect(errors).toEqual([])
})

test('artefactos recuperan páginas ausentes, JSON ilegible y portapapeles denegado', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denegado') } } })
  })
  await page.goto('/documentos/42/archivos/501?representacion=jsonl&pagina=99')
  await expect(page.locator('.artifact-viewport .viewer-state')).toContainText('No se encontró esta página')
  await page.getByRole('button', { name: 'Volver a la primera página JSON' }).click()
  await expect(page.locator('.cm-content')).toContainText('Contenido exclusivo de la página 1.')
  await page.getByRole('button', { name: 'Copiar JSON de la página' }).click()
  const fallback = page.getByLabel(/No se pudo acceder al portapapeles/)
  await expect(fallback).toBeFocused()
  expect(JSON.parse(await fallback.inputValue())).toEqual(pages[0])
  expect(await fallback.evaluate(el => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart)).toBe((await fallback.inputValue()).length)
  await page.route('**/representaciones/jsonl', route => route.fulfill({ contentType: 'application/x-ndjson', body: '{"pages":[invalid]}' }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('No pudimos leer este artefacto.')
  await page.unroute('**/representaciones/jsonl')
  await page.getByRole('button', { name: 'Reintentar artefacto' }).click()
  await expect(page.locator('.cm-content')).toContainText('Contenido exclusivo de la página 1.')
  await page.getByLabel('Versión', { exact: true }).selectOption('markdown')
  await expect(page.getByRole('article', { name: 'Markdown renderizado' })).toBeVisible()
  await page.getByRole('button', { name: 'Copiar código Markdown visible' }).click()
  await expect(fallback).toHaveValue(markdown)
})
