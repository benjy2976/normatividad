<script setup lang="ts">
import { computed } from 'vue'
import type { Attachment } from '../services/publicApi'

const props = withDefaults(defineProps<{
  attachment : Attachment
  detailed?  : boolean
  showTomo?  : boolean
}>(), { detailed: false, showTomo: false })
const isPdf = computed(() => props.attachment.file.mimeType === 'application/pdf' || Boolean(props.attachment.href?.endsWith('/representaciones/pdf-searchable')))
const action = computed(() => isPdf.value ? 'Ver PDF' : 'Abrir archivo')
const viewerLocation = computed(() => `/documentos/${props.attachment.file.documentoId}/archivos/${props.attachment.file.id}`)
</script>

<template>
  <a
    v-if="attachment.href"
    class="file-icon"
    :class="{ 'pdf-file': isPdf }"
    :href="viewerLocation"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`${detailed ? action : 'Abrir'} ${attachment.file.nombre}, tomo ${attachment.file.tomo} (nueva pestaña)`"
    :title="`${attachment.file.nombre} · Tomo ${attachment.file.tomo}`">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v6h5M8 13h8M8 17h5" /></svg>
    <span v-if="detailed">{{ action }} <span aria-hidden="true">↗</span></span>
    <span v-else-if="showTomo" class="file-volume" aria-hidden="true">T. {{ attachment.file.tomo }}</span>
    <span v-else>{{ isPdf ? 'PDF' : 'Archivo' }}</span>
  </a>
  <span v-else class="file-icon unavailable-file" role="img" :aria-label="`${attachment.file.nombre}, tomo ${attachment.file.tomo}: no disponible`" :title="`${attachment.file.nombre}: no disponible`">
    <span aria-hidden="true">⊘</span><small>No disponible</small>
  </span>
</template>
