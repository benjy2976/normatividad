<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch, watchEffect } from 'vue'
import { ArtifactLimitError, readJsonPage, readTextArtifact } from '../services/textArtifact'
import { renderMarkdown } from '../utils/markdown'

const JsonCode = defineAsyncComponent(() => import('./JsonCode.client.vue'))
const props = defineProps<{ src: string, label: string, type: 'jsonl' | 'markdown', page: number, source: boolean }>()
const emit = defineEmits<{ state: [state: { ready: boolean, pages: number | null, copied: boolean }], pageChange: [page: number] }>()
const text = ref('')
const pages = ref<number | null>(null)
const missing = ref(false)
const truncated = ref(false)
const loading = ref(true)
const error = ref('')
const retry = ref(0)
const copied = ref(false)
const copyFallback = ref(false)
const fallback = ref<globalThis.HTMLTextAreaElement>()
const html = computed(() => props.type === 'markdown' && !props.source && text.value ? renderMarkdown(text.value) : '')
watchEffect(() => emit('state', { ready: !loading.value && !error.value && Boolean(text.value), pages: pages.value, copied: copied.value }))
watch([() => props.src, () => props.type === 'jsonl' ? props.page : 1, retry], async ([src], _previous, onCleanup) => {
  const controller = new globalThis.AbortController()
  onCleanup(() => controller.abort())
  text.value = ''; pages.value = null; missing.value = false; truncated.value = false
  copied.value = false; copyFallback.value = false; loading.value = true; error.value = ''
  try {
    if (props.type === 'jsonl') {
      const result = await readJsonPage(src, props.page, controller.signal)
      if (controller.signal.aborted) return
      text.value = result.text ?? ''
      pages.value = result.pages
      missing.value = result.text === null
    } else {
      const result = await readTextArtifact(src, controller.signal)
      if (controller.signal.aborted) return
      text.value = result.text
      truncated.value = result.truncated
    }
  } catch (reason) {
    if (!controller.signal.aborted) error.value = reason instanceof ArtifactLimitError ? reason.message : 'No pudimos leer este artefacto.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })
async function copy() {
  if (loading.value || error.value || !text.value) return
  const current = text.value
  try {
    await globalThis.navigator.clipboard.writeText(current)
    if (current === text.value && !loading.value) copied.value = true
  } catch {
    if (current !== text.value || loading.value) return
    copyFallback.value = true
    await nextTick()
    fallback.value?.focus()
    fallback.value?.select()
  }
}
defineExpose({ copy })
</script>

<template>
  <section class="artifact-viewport" :class="{ 'artifact-code-viewport': type === 'jsonl' }" :aria-label="label" :aria-busy="loading">
    <div v-if="loading" class="viewer-state" role="status">
      Cargando {{ label }}…
    </div>
    <div v-else-if="error" class="viewer-state" role="alert">
      <p>
        {{ error }}
      </p>
      <UButton color="neutral" variant="outline" @click="retry++">
        Reintentar artefacto
      </UButton>
    </div>
    <div v-else-if="missing" class="viewer-state" role="status">
      <p>
        No se encontró esta página en el JSON. El artefacto debe contener el arreglo de páginas OCR.
      </p>
      <UButton v-if="page !== 1" color="neutral" variant="outline" @click="emit('pageChange', 1)">
        Volver a la primera página JSON
      </UButton>
    </div>
    <template v-else>
      <p v-if="truncated" class="artifact-notice" role="status">
        Vista previa limitada a 2 MiB. La copia incluye solo este fragmento; descarga el archivo para obtener el Markdown completo.
      </p>
      <div v-if="copyFallback" class="artifact-copy-fallback">
        <label for="artifact-copy">No se pudo acceder al portapapeles. El texto está seleccionado para copiarlo manualmente.</label>
        <textarea id="artifact-copy" ref="fallback" :value="text" readonly rows="5" ></textarea>
      </div>
      <p v-if="!text" class="viewer-state" role="status">
        El artefacto no contiene texto.
      </p>
      <JsonCode v-else-if="type === 'jsonl'" :text="text" />
      <pre v-else-if="source" class="artifact-text artifact-source" tabindex="0" aria-label="Código Markdown">{{ text }}</pre>
      <!-- Only the locally parsed, allowlisted and sanitized Markdown reaches this sink. -->
      <article v-else class="markdown-document" aria-label="Markdown renderizado" v-html="html" ></article>
    </template>
  </section>
</template>
