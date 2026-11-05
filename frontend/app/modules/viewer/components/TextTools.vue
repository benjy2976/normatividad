<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ type: 'jsonl' | 'markdown', page: number, pages: number | null, ready: boolean, source: boolean, copied: boolean }>()
const emit = defineEmits<{ pageChange: [page: number], 'update:source': [source: boolean], copy: [] }>()
const pageInput = ref(props.page)
watch(() => props.page, page => { pageInput.value = page })
function submit() {
  if (Number.isSafeInteger(pageInput.value) && pageInput.value > 0) emit('pageChange', pageInput.value)
}
</script>

<template>
  <form v-if="type === 'jsonl'" class="viewer-pagination" aria-label="Navegación del JSON" @submit.prevent="submit">
    <UButton
      class="viewer-tool-button"
      icon="i-lucide-chevron-left"
      color="neutral"
      variant="outline"
      aria-label="Página anterior del JSON"
      :disabled="!ready || page <= 1"
      @click="emit('pageChange', page - 1)" />
    <label for="json-page" class="visually-hidden">Página JSON</label>
    <input
      id="json-page"
      v-model.number="pageInput"
      class="viewer-page-input"
      type="number"
      min="1"
      step="1"
      inputmode="numeric"
      required />
    <span class="viewer-page-total">de {{ pages ?? '—' }}</span>
    <UButton
      class="viewer-tool-button"
      icon="i-lucide-chevron-right"
      color="neutral"
      variant="outline"
      aria-label="Página siguiente del JSON"
      :disabled="!ready || (pages !== null && page >= pages)"
      @click="emit('pageChange', page + 1)" />
  </form>
  <div v-else class="artifact-mode" role="group" aria-label="Presentación Markdown">
    <UButton class="viewer-tool-button viewer-text-button" color="neutral" variant="outline" :aria-pressed="!source" @click="emit('update:source', false)">
      Renderizado
    </UButton>
    <UButton class="viewer-tool-button viewer-text-button" color="neutral" variant="outline" :aria-pressed="source" @click="emit('update:source', true)">
      Código MD
    </UButton>
  </div>
  <UButton
    class="viewer-tool-button viewer-text-button"
    color="neutral"
    variant="outline"
    icon="i-lucide-copy"
    :disabled="!ready"
    :aria-label="type === 'jsonl' ? 'Copiar JSON de la página' : 'Copiar código Markdown visible'"
    @click="emit('copy')">
    {{ copied ? 'Copiado' : type === 'jsonl' ? 'Copiar JSON' : 'Copiar MD' }}
  </UButton>
  <span class="visually-hidden" role="status">{{ copied ? 'Contenido copiado al portapapeles.' : '' }}</span>
</template>
