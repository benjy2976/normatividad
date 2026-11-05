<script setup lang="ts">
import { ref, watch } from 'vue'
import { readTextArtifact } from '../services/textArtifact'

const props = defineProps<{ src: string, label: string }>()
const text = ref('')
const truncated = ref(false)
const loading = ref(true)
const error = ref(false)
const retry = ref(0)
watch([() => props.src, retry], async ([src], _previous, onCleanup) => {
  const controller = new globalThis.AbortController()
  onCleanup(() => controller.abort())
  text.value = ''
  loading.value = true
  error.value = false
  try {
    const result = await readTextArtifact(src, controller.signal)
    if (controller.signal.aborted) return
    text.value = result.text
    truncated.value = result.truncated
  } catch {
    if (!controller.signal.aborted) error.value = true
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <section class="artifact-viewport" :aria-label="label" :aria-busy="loading" tabindex="0">
    <div v-if="loading" class="viewer-state" role="status">
      Cargando {{ label }}…
    </div>
    <div v-else-if="error" class="viewer-state" role="alert">
      <p>
        No pudimos leer este artefacto.
      </p>
      <UButton color="neutral" variant="outline" @click="retry++">
        Reintentar artefacto
      </UButton>
    </div>
    <template v-else>
      <p v-if="truncated" class="artifact-notice" role="status">
        Vista previa limitada a 2 MiB. Descarga el archivo para consultar el contenido completo.
      </p>
      <p v-if="!text" class="viewer-state" role="status">
        El artefacto no contiene texto.
      </p>
      <pre v-else class="artifact-text">{{ text }}</pre>
    </template>
  </section>
</template>
