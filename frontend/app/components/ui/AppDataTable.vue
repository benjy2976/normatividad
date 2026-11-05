<script setup lang="ts" generic="T extends object">
import { computed, nextTick, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { RouteLocationRaw } from 'vue-router'
import AppPagination from './AppPagination.vue'
import type { DataColumn, TablePage, TableSort } from './table'

const props = withDefaults(defineProps<{
  rows          : T[]
  columns       : DataColumn[]
  rowKey        : keyof T & string
  label         : string
  title?        : string
  headingId?    : string
  loading?      : boolean
  error?        : boolean
  loadingText?  : string
  emptyTitle?   : string
  emptyText?    : string
  errorTitle?   : string
  retryLabel?   : string
  sort?         : TableSort
  page?         : TablePage
  pageLocation? : (page: number) => RouteLocationRaw
}>(), {
  loadingText : 'Consultando resultados…',
  emptyTitle  : 'No se encontraron resultados',
  emptyText   : 'Prueba con otros filtros.',
  errorTitle  : 'No pudimos consultar los resultados',
  retryLabel  : 'Reintentar consulta'
})
const emit = defineEmits<{ retry: [], sortChange: [sort: TableSort], pageChange: [page: number] }>()
const container = ref<HTMLElement | null>(null)
let pendingFocus: string | undefined
const tableColumns = computed<TableColumn<T>[]>(() => props.columns.map(column => ({
  id            : column.key,
  accessorFn    : (row: T) => row[column.key as keyof T],
  header        : column.label,
  enableSorting : Boolean(column.sortable),
  meta          : { class: { th: column.class, td: column.class } }
})))
const sorting = computed(() => props.sort ? [{ id: props.sort.key, desc: props.sort.direction === 'desc' }] : [])
function changeSort(column: DataColumn) {
  if (container.value?.contains(container.value.ownerDocument.activeElement)) pendingFocus = column.key
  emit('sortChange', { key: column.key, direction: props.sort?.key === column.key && props.sort.direction === 'asc' ? 'desc' : 'asc' })
}
watch(() => props.loading, async (loading, previous) => {
  if (loading || !previous || !pendingFocus) return
  const key = pendingFocus
  pendingFocus = undefined
  await nextTick()
  const element = container.value
  if (!element || element.ownerDocument.activeElement !== element.ownerDocument.body) return
  Array.from(element.querySelectorAll<HTMLElement>('[data-sort-key]'))
    .find(button => button.dataset.sortKey === key)?.focus({ preventScroll: true })
})
</script>

<template>
  <div ref="container" class="data-table" :aria-busy="loading">
    <div v-if="title || $slots.filters || $slots.controls" class="section-heading">
      <slot name="filters" />
      <div class="results-title">
        <h2 v-if="title" :id="headingId">
          {{ title }}
        </h2>
        <span v-if="page && !loading && !error">{{ page.total.toLocaleString('es-PE') }} resultados</span>
      </div>
      <slot name="controls" />
    </div>
    <div v-if="loading" class="state-panel" role="status">
      <span class="loading-dot" aria-hidden="true"></span>{{ loadingText }}
    </div>
    <div v-else-if="error" class="state-panel error-panel" role="alert">
      <h3>
        {{ errorTitle }}
      </h3>
      <p>
        Inténtalo nuevamente en unos momentos.
      </p>
      <UButton color="neutral" variant="outline" @click="emit('retry')">
        {{ retryLabel }}
      </UButton>
    </div>
    <template v-else>
      <div v-if="!rows.length" class="state-panel" role="status">
        <h3>
          {{ emptyTitle }}
        </h3>
        <p>
          {{ emptyText }}
        </p>
        <UButton v-if="page && page.current > 1 && pageLocation" color="neutral" variant="outline" :to="pageLocation(1)">
          Volver a la primera página
        </UButton>
      </div>
      <template v-else>
        <p v-if="page" class="visually-hidden" role="status">
          Mostrando {{ page.from }}–{{ page.to }} de {{ page.total }} resultados
        </p>
        <UTable
          :data="rows"
          :columns="tableColumns"
          :caption="label"
          :get-row-id="row => String(row[rowKey])"
          :sorting="sorting"
          :sorting-options="{ manualSorting: true }"
          :pagination-options="{ manualPagination: true }">
          <template v-for="column in columns" :key="column.key" #[`${column.key}-header`]>
            <UButton
              v-if="column.sortable"
              color="neutral"
              variant="link"
              class="table-sort"
              :data-sort-key="column.key"
              @click="changeSort(column)">
              {{ column.label }}
              <span aria-hidden="true">{{ sort?.key === column.key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕' }}</span>
            </UButton>
            <span v-else>{{ column.label }}</span>
          </template>
          <template v-for="column in columns" :key="column.key" #[`${column.key}-cell`]="{ row, getValue }">
            <slot :name="`${column.key}-cell`" :row="row.original" :value="getValue()">
              <span class="mobile-cell-label" aria-hidden="true">{{ column.label }}</span>
              {{ getValue() }}
            </slot>
          </template>
        </UTable>
      </template>
      <AppPagination v-if="page && pageLocation" :page="page" :page-location="pageLocation" @page-change="emit('pageChange', $event)" />
    </template>
  </div>
</template>

<style scoped>
.data-table :deep(.app-table tbody > tr) {
  background: var(--app-surface);
}
.data-table :deep(.app-table tbody > tr:nth-child(even)) {
  background: var(--app-table-row-alt-bg);
}
.data-table :deep(.app-table tbody > tr:not(:last-child)) {
  border-bottom: 1px solid var(--app-table-row-border);
}
.data-table :deep(.app-table tbody > tr:focus-within) {
  background: var(--app-table-row-hover-bg);
}
@media (hover: hover) {
  .data-table :deep(.app-table tbody > tr:hover) {
    background: var(--app-table-row-hover-bg);
  }
}
</style>
