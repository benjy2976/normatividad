<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { clampPdfZoom, MAX_PDF_ZOOM, MIN_PDF_ZOOM } from '../utils/zoom'

const props = defineProps<{ page: number, pages: number, zoom: string, scale: number }>()
const emit = defineEmits<{ pageChange: [page: number], 'update:zoom': [zoom: string] }>()
const pageInput = ref('1')
const steps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5]
const numericZoom = computed(() => props.zoom === 'fit' ? props.scale : Number(props.zoom))
const customZoom = computed(() => props.zoom !== 'fit' && !steps.includes(Number(props.zoom)))
watch(() => props.page, page => { pageInput.value = String(page) }, { immediate: true })
function go() {
  const page = Number(pageInput.value)
  if (Number.isSafeInteger(page) && page > 0 && page <= props.pages) emit('pageChange', page)
  else pageInput.value = String(props.page)
}
function step(direction: number) {
  emit('update:zoom', String(clampPdfZoom(numericZoom.value * (direction > 0 ? 1.1 : 1 / 1.1))))
}
</script>

<template>
  <form class="viewer-pagination" aria-label="Navegación del PDF" @submit.prevent="go">
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      class="viewer-tool-button"
      :disabled="!pages || page <= 1"
      icon="i-lucide-chevron-left"
      aria-label="Página anterior del PDF"
      title="Página anterior"
      @click="emit('pageChange', page - 1)" />
    <label for="pdf-page" class="visually-hidden">Página</label>
    <input
      id="pdf-page"
      v-model="pageInput"
      type="number"
      min="1"
      :max="pages || undefined"
      class="viewer-page-input"
      inputmode="numeric"
      required
      :disabled="!pages"
      title="Página; pulsa Enter para ir"/>
    <span aria-live="polite">{{ pages ? `de ${pages}` : '…' }}</span>
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      class="viewer-tool-button"
      :disabled="!pages || page >= pages"
      icon="i-lucide-chevron-right"
      aria-label="Página siguiente del PDF"
      title="Página siguiente"
      @click="emit('pageChange', page + 1)" />
  </form>
  <div class="pdf-zoom-controls" role="group" aria-label="Zoom del documento">
    <label for="pdf-zoom" class="visually-hidden">Zoom</label>
    <UButton
      color="neutral"
      variant="outline"
      class="viewer-tool-button"
      icon="i-lucide-minus"
      aria-label="Reducir zoom del documento"
      title="Reducir zoom"
      :disabled="!pages || numericZoom <= MIN_PDF_ZOOM"
      @click="step(-1)" />
    <select id="pdf-zoom" class="viewer-select" :value="zoom" @change="emit('update:zoom', ($event.target as HTMLSelectElement).value)">
      <option value="fit">
        Ancho
      </option>
      <option v-if="customZoom" :value="zoom">
        {{ Math.round(numericZoom * 100) }} %
      </option>
      <option v-for="scaleValue in steps" :key="scaleValue" :value="String(scaleValue)">
        {{ scaleValue * 100 }} %
      </option>
    </select>
    <UButton
      color="neutral"
      variant="outline"
      class="viewer-tool-button"
      icon="i-lucide-plus"
      aria-label="Aumentar zoom del documento"
      title="Aumentar zoom"
      :disabled="!pages || numericZoom >= MAX_PDF_ZOOM"
      @click="step(1)" />
  </div>
</template>
