<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { TextLayer, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import { pdfRaster } from '../utils/raster'

const props = defineProps<{ pdf: PDFDocumentProxy, page: number, scale: number, pixelBudget: number, pixelRatio: number, visible: boolean }>()
const emit = defineEmits<{ dimensions: [size: { width: number, height: number }], busy: [busy: boolean] }>()
const canvas = ref<InstanceType<typeof globalThis.HTMLCanvasElement> | null>(null)
const text = ref<HTMLElement | null>(null)
const error = ref(false)
const retry = ref(0)
let renderTask: RenderTask | undefined
let layer: TextLayer | undefined
let generation = 0

watch([() => props.pdf, () => props.page, () => props.scale, () => props.pixelBudget, () => props.pixelRatio, () => props.visible, retry], async (_values, _previous, onCleanup) => {
  const current = ++generation
  const previous = renderTask
  previous?.cancel()
  layer?.cancel()
  error.value = false
  emit('busy', true)
  onCleanup(() => { generation++; renderTask?.cancel(); layer?.cancel() })
  try {
    await previous?.promise.catch(() => {})
    const page = await props.pdf.getPage(props.page)
    if (current !== generation || !canvas.value || !text.value) return
    const base = page.getViewport({ scale: 1 })
    emit('dimensions', { width: base.width, height: base.height })
    const viewport = page.getViewport({ scale: props.scale })
    const raster = pdfRaster(viewport.width, viewport.height, props.pixelRatio, props.visible, props.pixelBudget)
    const context = canvas.value.getContext('2d')
    if (!context) throw new Error('Canvas no disponible')
    canvas.value.width = raster.canvasWidth
    canvas.value.height = raster.canvasHeight
    canvas.value.style.width = `${raster.cssWidth}px`
    canvas.value.style.height = `${raster.cssHeight}px`
    text.value.replaceChildren()
    renderTask = page.render({ canvas: canvas.value, canvasContext: context, viewport, transform: [raster.scaleX, 0, 0, raster.scaleY, 0, 0] })
    await renderTask.promise
    if (current !== generation) return
    layer = new TextLayer({ textContentSource: page.streamTextContent(), container: text.value, viewport })
    text.value.style.width = `${raster.cssWidth}px`
    text.value.style.height = `${raster.cssHeight}px`
    await layer.render()
  } catch {
    if (current === generation) error.value = true
  } finally {
    if (current === generation) emit('busy', false)
  }
}, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { emit('busy', false) })
</script>

<template>
  <div v-if="error" class="viewer-state" role="alert">
    <p>
      No pudimos mostrar la página {{ page }}.
    </p>
    <UButton color="neutral" variant="outline" @click="retry++">
      Reintentar página {{ page }}
    </UButton>
  </div>
  <canvas ref="canvas" v-show="!error" aria-hidden="true"></canvas>
  <div ref="text" v-show="!error" class="textLayer" :aria-label="`Texto de la página ${page}`"></div>
</template>
