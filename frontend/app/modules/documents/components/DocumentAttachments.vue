<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppDataTable from '~/components/ui/AppDataTable.vue'
import type { DataColumn } from '~/components/ui/table'
import DocumentFileLink from './DocumentFileLink.vue'
import { usePublicApi } from '../composables/usePublicDocuments'

const props = withDefaults(defineProps<{ documentId: number, presentation?: 'compact' | 'detail' }>(), { presentation: 'compact' })
const api = usePublicApi()
const columns: DataColumn[] = [
  { key: 'file', label: 'Archivo y detalles' },
  { key: 'access', label: 'Acceso', class: 'attachment-action-column' }
]
function originalFormat(mimeType: string) {
  const formats: Record<string, string> = { 'application/pdf': 'PDF', 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/tiff': 'TIFF' }
  return formats[mimeType] || mimeType || 'Formato no registrado'
}
function fileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  const units = ['B', 'kB', 'MB', 'GB', 'TB']
  const index = bytes > 0 ? Math.max(0, Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1)) : 0
  return `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(bytes / 1000 ** index)} ${units[index]}`
}
const container = ref<HTMLElement | null>(null)
const { data, status, error, execute } = useAsyncData(
  `public-document-attachments:${props.documentId}`,
  (_nuxt, { signal }) => api.attachments(props.documentId, signal),
  { server: false, immediate: false }
)
const rows = computed(() => (data.value || []).map(attachment => ({ ...attachment, id: attachment.file.id })))
let observer: IntersectionObserver | undefined
onMounted(() => {
  if (props.presentation === 'detail' || !container.value || typeof IntersectionObserver === 'undefined') {
    void execute()
    return
  }
  observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    observer?.disconnect()
    void execute()
  }, { rootMargin: '120px' })
  observer.observe(container.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="container" class="attachments" :class="{ 'attachments-detail': presentation === 'detail' }" :aria-busy="status === 'idle' || status === 'pending'" aria-label="Archivos adjuntos">
    <AppDataTable
      v-if="presentation === 'detail'"
      class="detail-file-table"
      :rows="rows"
      :columns="columns"
      row-key="id"
      label="Archivos asociados al documento"
      title="Archivos disponibles"
      heading-id="document-files-heading"
      :loading="status === 'idle' || status === 'pending'"
      :error="Boolean(error)"
      loading-text="Cargando archivos…"
      empty-title="No hay archivos asociados a este documento."
      empty-text=""
      error-title="No se pudieron cargar los archivos."
      retry-label="Reintentar archivos"
      @retry="execute()">
      <template #controls>
        <small v-if="status === 'success'" class="attachment-count">{{ rows.length }} {{ rows.length === 1 ? 'archivo' : 'archivos' }}</small>
      </template>
      <template #file-cell="{ row }">
        <div class="detail-file-info">
          <strong>Tomo {{ row.file.tomo }}</strong>
          <span class="detail-file-name">{{ row.file.nombre }}</span>
          <small class="detail-file-metadata">
            Original: {{ originalFormat(row.file.mimeType) }}
            <template v-if="row.file.cantidadPaginas !== null && row.file.cantidadPaginas > 0"> · {{ row.file.cantidadPaginas }} {{ row.file.cantidadPaginas === 1 ? 'página' : 'páginas' }}</template>
            <template v-if="fileSize(row.file.tamano)"> · {{ fileSize(row.file.tamano) }}</template>
          </small>
        </div>
      </template>
      <template #access-cell="{ row }">
        <DocumentFileLink :attachment="row" detailed />
      </template>
    </AppDataTable>
    <template v-else>
      <small v-if="status === 'idle' || status === 'pending'" role="status">Cargando archivos…</small>
      <div v-else-if="error" class="attachment-error" role="alert">
        <small>No se pudieron cargar los archivos.</small>
        <UButton color="neutral" variant="link" class="text-button" @click="execute()">
          Reintentar archivos
        </UButton>
      </div>
      <template v-else-if="data">
        <small class="attachment-count">{{ data.length }} {{ data.length === 1 ? 'archivo' : 'archivos' }}</small>
        <ul v-if="data.length" class="attachment-icons">
          <li v-for="attachment in data" :key="attachment.file.id">
            <DocumentFileLink :attachment="attachment" :show-tomo="data.length > 1" />
          </li>
        </ul>
      </template>
    </template>
    <UButton v-if="status === 'success' && data?.some(item => item.retryable)" color="neutral" variant="link" class="text-button" @click="execute()">
      Reintentar archivos
    </UButton>
  </div>
</template>
