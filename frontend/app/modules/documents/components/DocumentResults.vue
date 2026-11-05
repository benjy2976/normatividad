<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import AppDataTable from '../../../components/ui/AppDataTable.vue'
import type { DataColumn, TableSort } from '../../../components/ui/table'
import type { Collection, PublicDocument } from '../services/publicApi'
import { documentTitle, formatDate } from '../utils/search'
import DocumentAttachments from './DocumentAttachments.vue'

const props = withDefaults(defineProps<{
  result            : Collection<PublicDocument> | null
  status            : string
  error             : boolean
  pageLocation      : (page: number) => RouteLocationRaw
  order?            : string
  showDocumentType? : boolean
}>(), { order: 'fechaDesc', showDocumentType: true })
const emit = defineEmits<{ retry: [], orderChange: [order: 'fechaAsc' | 'fechaDesc'] }>()
const columns: DataColumn[] = [
  { key: 'titulo', label: 'Documento y descripción', class: 'document-column' },
  { key: 'fecha', label: 'Fecha', sortable: true, class: 'date-column' },
  { key: 'archivos', label: 'Archivos adjuntos', class: 'files-column' }
]
const page = computed(() => props.result ? {
  current : props.result.meta.paginaActual,
  last    : props.result.meta.ultimaPagina,
  total   : props.result.meta.total,
  from    : props.result.meta.desde,
  to      : props.result.meta.hasta
} : undefined)
const sort = computed<TableSort | undefined>(() => props.order === 'idDesc' ? undefined : { key: 'fecha', direction: props.order === 'fechaAsc' ? 'asc' : 'desc' })
function changeSort(value: TableSort) {
  emit('orderChange', value.direction === 'asc' ? 'fechaAsc' : 'fechaDesc')
}
</script>

<template>
  <section class="results-section" aria-labelledby="results-heading" :aria-busy="status === 'pending' || status === 'idle'">
    <AppDataTable
      :rows="result?.data ?? []"
      :columns="columns"
      row-key="id"
      label="Documentos normativos publicados"
      title="Resultados"
      heading-id="results-heading"
      :loading="status === 'pending' || status === 'idle'"
      :error="error"
      loading-text="Consultando documentos…"
      empty-title="No se encontraron documentos"
      empty-text="Prueba con otras palabras o reduce los filtros."
      error-title="No pudimos consultar los documentos"
      :page="page"
      :page-location="pageLocation"
      :sort="sort"
      @retry="emit('retry')"
      @sort-change="changeSort">
      <template #filters>
        <slot name="filters" />
      </template>
      <template #controls>
        <slot name="controls" />
      </template>
      <template #titulo-cell="{ row: document }">
        <div class="document-content">
          <h3>
            <NuxtLink :to="`/documentos/${document.id}`">{{ documentTitle(document) }}</NuxtLink>
          </h3>
          <p v-if="document.descripcion" class="document-description">
            {{ document.descripcion }}
          </p>
          <div class="document-bottom">
            <span v-if="showDocumentType" class="type-label">Tipo: {{ document.tipoDocumento?.descripcion || 'Documento normativo' }}</span>
            <span v-if="document.proceso" class="type-label">Proceso: {{ document.proceso.descripcion || document.proceso.codigo || document.proceso.id }}</span>
            <NuxtLink :to="`/documentos/${document.id}`" :aria-label="`Consultar ${documentTitle(document)}`">Consultar documento <span aria-hidden="true">↗</span></NuxtLink>
          </div>
        </div>
      </template>
      <template #fecha-cell="{ row: document }">
        <span class="mobile-cell-label" aria-hidden="true">Fecha</span>
        <time v-if="document.fecha" :datetime="document.fecha">{{ formatDate(document.fecha) }}</time>
        <span v-else>{{ formatDate(document.fecha) }}</span>
      </template>
      <template #archivos-cell="{ row: document }">
        <DocumentAttachments :document-id="document.id" />
      </template>
    </AppDataTable>
  </section>
</template>
