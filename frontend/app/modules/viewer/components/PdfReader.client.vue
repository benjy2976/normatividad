<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import rendererURL from 'pdfjs-dist/build/pdf.renderer.min.mjs?url'
import 'pdfjs-dist/web/pdf_viewer.css'
import PdfPage from './PdfPage.client.vue'
import { pdfPixelRatio } from '../utils/raster'
import { wheelPdfZoom } from '../utils/zoom'
import { layoutPdfPages, nearbyPdfPages, pdfPageAt, PDF_TO_CSS_UNITS, type PageSize } from '../utils/pages'

const props = defineProps<{ src: string, page: number, zoom: string }>()
const emit = defineEmits<{ pages: [count: number], pageChange: [page: number], pageVisible: [page: number], 'update:zoom': [zoom: string], scale: [scale: number] }>()
GlobalWorkerOptions.workerSrc = workerURL
GlobalWorkerOptions.rendererSrc = rendererURL
const container = ref<HTMLElement | null>(null)
const pdf = shallowRef<PDFDocumentProxy | null>(null)
const sizes = ref<PageSize[]>([])
const loading = ref(true)
const error = ref('')
const reload = ref(0)
const width = ref(0)
const nearby = ref<number[]>([])
const visible = ref<number[]>([])
const pixelRatio = ref(pdfPixelRatio(globalThis.devicePixelRatio))
const busyPages = ref(new Set<number>())
const layout = computed(() => layoutPdfPages(sizes.value, width.value, props.zoom, pixelRatio.value))
const pagesWidth = computed(() => layout.value.reduce((maximum, page) => Math.max(maximum, page.width), 0) + 32)
const pixelBudget = computed(() => Math.min(16_000_000, 32_000_000 / Math.max(1, nearby.value.length)))
const invalidPage = computed(() => pdf.value !== null && props.page > pdf.value.numPages)
const rendering = computed(() => [...busyPages.value].some(page => nearby.value.includes(page)))
let observer: InstanceType<typeof globalThis.ResizeObserver> | undefined
let densityQuery: ReturnType<typeof globalThis.matchMedia> | undefined
let scrollFrame = 0
let releaseFrame = 0
let navigating = false
let ready = false
let reportedPage = props.page
let anchor: { page: number, pageX: number, pageY: number, viewportX: number, viewportY: number } | undefined

function updateWindow() {
  const surface = container.value
  if (!surface) return
  nearby.value = nearbyPdfPages(layout.value, surface.scrollTop, surface.clientHeight)
  visible.value = nearbyPdfPages(layout.value, surface.scrollTop, surface.clientHeight, 0)
}
function suppressScroll() {
  navigating = true
  globalThis.cancelAnimationFrame(releaseFrame)
  releaseFrame = globalThis.requestAnimationFrame(() => {
    releaseFrame = globalThis.requestAnimationFrame(() => { navigating = false })
  })
}
function captureAnchor(point?: { x: number, y: number }) {
  const surface = container.value
  if (!surface || !ready) return
  const bounds = surface.getBoundingClientRect()
  const x = point?.x ?? bounds.left + surface.clientLeft + surface.clientWidth / 2
  const y = point?.y ?? bounds.top + surface.clientTop + surface.clientHeight / 2
  // Use the existing DOM dimensions before changing scale or placeholder sizes.
  const sheets = [...surface.querySelectorAll<HTMLElement>('.pdf-page')]
  const sheet = sheets.find(el => el.getBoundingClientRect().bottom >= y) ?? sheets.at(-1)
  if (!sheet) return
  const pageBounds = sheet.getBoundingClientRect()
  anchor = { page: Number(sheet.dataset.page), pageX: (x - pageBounds.left) / pageBounds.width, pageY: (y - pageBounds.top) / pageBounds.height, viewportX: x - bounds.left - surface.clientLeft, viewportY: y - bounds.top - surface.clientTop }
}
function restoreAnchor() {
  const surface = container.value
  const position = anchor
  anchor = undefined
  const sheet = surface?.querySelector<HTMLElement>(`[data-page="${position?.page}"]`)
  if (!surface || !sheet || !position) return
  suppressScroll()
  const bounds = surface.getBoundingClientRect()
  const pageBounds = sheet.getBoundingClientRect()
  surface.scrollLeft += pageBounds.left + position.pageX * pageBounds.width - bounds.left - surface.clientLeft - position.viewportX
  surface.scrollTop += pageBounds.top + position.pageY * pageBounds.height - bounds.top - surface.clientTop - position.viewportY
}
function navigate(page: number) {
  anchor = undefined
  reportedPage = page
  const surface = container.value
  const target = layout.value[page - 1]
  if (!surface || !target || invalidPage.value) return
  suppressScroll()
  surface.scrollTop = target.top - 16
  updateWindow()
}
function onScroll() {
  globalThis.cancelAnimationFrame(scrollFrame)
  scrollFrame = globalThis.requestAnimationFrame(() => {
    updateWindow()
    if (navigating || !ready || invalidPage.value) return
    const surface = container.value
    if (!surface) return
    const page = pdfPageAt(layout.value, surface.scrollTop + Math.min(surface.clientHeight * 0.25, 160))
    if (page && page.number !== reportedPage) {
      reportedPage = page.number
      emit('pageVisible', page.number)
    }
  })
}
function onWheel(event: InstanceType<typeof globalThis.WheelEvent>) {
  if ((!event.ctrlKey && !event.metaKey) || !event.deltaY || !event.cancelable) return
  if (!pdf.value || loading.value || error.value || invalidPage.value) return
  event.preventDefault()
  captureAnchor({ x: event.clientX, y: event.clientY })
  const scale = (layout.value[(anchor?.page ?? props.page) - 1]?.scale ?? PDF_TO_CSS_UNITS) / PDF_TO_CSS_UNITS
  const next = wheelPdfZoom(scale, event.deltaY, event.deltaMode, container.value?.clientHeight ?? 0)
  if (next !== scale) {
    emit('update:zoom', String(next))
  } else anchor = undefined
}
function setSize(page: number, size: PageSize) {
  const old = sizes.value[page - 1]
  if (!old || (old.width === size.width && old.height === size.height)) return
  sizes.value = sizes.value.map((value, index) => index === page - 1 ? size : value)
}
function setBusy(page: number, busy: boolean) {
  if (busy) busyPages.value.add(page)
  else busyPages.value.delete(page)
}

watch(() => props.page, page => { if (page !== reportedPage) void nextTick(() => navigate(page)) })
watch([() => props.zoom, width, sizes, pixelRatio], async () => {
  if (!anchor) captureAnchor()
  await nextTick()
  restoreAnchor()
  updateWindow()
}, { flush: 'pre' })
watch(() => layout.value[props.page - 1]?.scale, scale => { if (scale) emit('scale', scale / PDF_TO_CSS_UNITS) }, { immediate: true })

watch([() => props.src, reload], async ([src], _previous, onCleanup) => {
  ready = false
  pdf.value = null
  sizes.value = []
  nearby.value = []
  visible.value = []
  busyPages.value.clear()
  error.value = ''
  loading.value = true
  const task = getDocument({ url: src, cMapUrl: '/pdf-assets/cmaps/', cMapPacked: true, standardFontDataUrl: '/pdf-assets/standard_fonts/', wasmUrl: '/pdf-assets/wasm/', enableXfa: false })
  let active = true
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined
  const renewTimeout = () => {
    globalThis.clearTimeout(timer)
    timer = globalThis.setTimeout(() => {
      if (!active) return
      error.value = 'La lectura del PDF dejó de responder. Puedes reintentar o descargar el archivo.'
      loading.value = false
      void task.destroy()
    }, 45_000)
  }
  renewTimeout()
  task.onProgress = renewTimeout
  onCleanup(() => {
    active = false
    ready = false
    globalThis.clearTimeout(timer)
    void task.destroy()
  })
  try {
    const document = await task.promise
    const first = await document.getPage(1)
    if (!active) return
    const base = first.getViewport({ scale: 1 })
    sizes.value = Array.from({ length: document.numPages }, () => ({ width: base.width, height: base.height }))
    pdf.value = document
    loading.value = false
    emit('pages', document.numPages)
    await nextTick()
    if (!active) return
    ready = true
    navigate(props.page)
  } catch {
    if (active && !error.value) error.value = 'No pudimos leer este PDF. Puedes reintentar o descargar el archivo.'
  } finally {
    globalThis.clearTimeout(timer)
    task.onProgress = () => {}
    if (active) loading.value = false
  }
}, { immediate: true })

function updatePixelRatio() {
  const ratio = pdfPixelRatio(globalThis.devicePixelRatio)
  if (densityQuery && ratio === pixelRatio.value) return
  densityQuery?.removeEventListener('change', updatePixelRatio)
  pixelRatio.value = ratio
  densityQuery = globalThis.matchMedia(`(resolution: ${ratio}dppx)`)
  densityQuery.addEventListener('change', updatePixelRatio)
}
onMounted(() => {
  if (!container.value) return
  container.value.addEventListener('wheel', onWheel, { passive: false })
  updatePixelRatio()
  globalThis.addEventListener('resize', updatePixelRatio)
  observer = new globalThis.ResizeObserver(entries => {
    width.value = entries[0]?.contentRect.width ?? 0
    updateWindow()
  })
  observer.observe(container.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  densityQuery?.removeEventListener('change', updatePixelRatio)
  globalThis.removeEventListener('resize', updatePixelRatio)
  container.value?.removeEventListener('wheel', onWheel)
  globalThis.cancelAnimationFrame(scrollFrame)
  globalThis.cancelAnimationFrame(releaseFrame)
})
</script>

<template>
  <div class="pdf-reader">
    <div
      ref="container"
      class="pdf-viewport"
      tabindex="0"
      aria-label="Superficie del PDF"
      :aria-busy="loading || rendering"
      @scroll="onScroll">
      <div v-if="loading" class="viewer-state" role="status">
        Cargando PDF…
      </div>
      <div v-else-if="error" class="viewer-state" role="alert">
        <p>
          {{ error }}
        </p>
        <UButton color="neutral" variant="outline" @click="reload++">
          Reintentar PDF
        </UButton>
      </div>
      <div v-else-if="invalidPage" class="viewer-state" role="status">
        <p>
          La página solicitada no existe en este PDF.
        </p>
        <UButton color="neutral" variant="outline" @click="emit('pageChange', 1)">
          Ir a la primera página
        </UButton>
      </div>
      <div v-else-if="pdf" class="pdf-pages" :style="{ width: `${pagesWidth}px`, '--app-pdf-pixel-step': `${1 / pixelRatio}px` }">
        <section
          v-for="sheet in layout"
          :key="sheet.number"
          class="pdf-page"
          :data-page="sheet.number"
          :style="{ width: `${sheet.width}px`, height: `${sheet.height}px`, '--total-scale-factor': String(sheet.scale), '--scale-round-x': `${1 / pixelRatio}px`, '--scale-round-y': `${1 / pixelRatio}px`, '--app-pdf-page-width': `${sheet.width}px` }"
          role="group"
          :aria-label="`Página ${sheet.number} del PDF`">
          <PdfPage
            v-if="nearby.includes(sheet.number)"
            :pdf="pdf"
            :page="sheet.number"
            :scale="sheet.scale"
            :pixel-budget="pixelBudget"
            :pixel-ratio="pixelRatio"
            :visible="visible.includes(sheet.number)"
            @dimensions="setSize(sheet.number, $event)"
            @busy="setBusy(sheet.number, $event)" />
          <span v-else class="pdf-page-placeholder">Página {{ sheet.number }}</span>
        </section>
      </div>
    </div>
  </div>
</template>
