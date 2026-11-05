<script setup lang="ts">
import { computed } from 'vue'
import type { Catalogs } from '../services/publicApi'
import type { SearchFields } from '../utils/search'

const props = defineProps<{ fields: SearchFields, catalogs: Catalogs | null }>()
const emit = defineEmits<{ search: [fields: SearchFields] }>()
const activeFilters = computed(() => {
  const fields = props.fields
  const labels: Partial<Record<keyof SearchFields, string>> = {
    tipoDocumentoId : `Tipo: ${props.catalogs?.types.find(type => String(type.id) === fields.tipoDocumentoId)?.descripcion || fields.tipoDocumentoId}`,
    anio            : `Año: ${fields.anio}`,
    texto           : `Búsqueda: ${fields.texto}`,
    numero          : `Número: ${fields.numero}`,
    siglaId         : `Sigla: ${fields.siglaId}`,
    procesoId       : `Proceso: ${fields.procesoId}`,
    desde           : `Desde: ${fields.desde}`,
    hasta           : `Hasta: ${fields.hasta}`
  }
  return Object.entries(labels).filter(([key]) => fields[key as keyof SearchFields])
    .map(([key, label]) => ({ key: key as keyof SearchFields, label }))
})
</script>

<template>
  <div v-if="activeFilters.length" class="active-filters" role="group" aria-label="Filtros activos">
    <span>Filtros activos:</span>
    <UButton
      color="neutral"
      variant="soft"
      v-for="filter in activeFilters"
      :key="filter.key"
      type="button"
      :aria-label="`Quitar ${filter.label}`"
      @click="emit('search', { ...fields, [filter.key]: '' })">
      {{ filter.label }} <span aria-hidden="true">×</span>
    </UButton>
  </div>
</template>
