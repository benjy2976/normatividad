<script setup lang="ts">
import type { Catalogs } from '../services/publicApi'
import { commonDocumentTypes, compactSearch, initialFields, type SearchFields } from '../utils/search'

const props = defineProps<{ fields: SearchFields, catalogs: Catalogs | null, loading: boolean }>()
const emit = defineEmits<{ search: [fields: SearchFields], clear: [] }>()
const draft = reactive({ ...initialFields, ...props.fields })
let pendingSelection: SearchFields | undefined
function searchText(fields: SearchFields) {
  return fields.texto || (fields.numero ? `${fields.numero}${fields.anio ? `-${fields.anio}` : ''}` : '')
}
function restore(fields: SearchFields, previous?: SearchFields) {
  const selection = pendingSelection
  const localSelection = selection && (Object.keys(initialFields) as (keyof SearchFields)[])
    .every(key => fields[key] === selection[key])
  const texto = localSelection && previous && draft.texto !== searchText(previous) ? draft.texto : searchText(fields)
  pendingSelection = undefined
  Object.assign(draft, fields, { texto })
}
watch(() => props.fields, restore, { deep: true, immediate: true })
const shortcuts = computed(() => commonDocumentTypes(props.catalogs?.types ?? []))
const currentYear = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Lima' }).format(new Date()))
const years = computed(() => {
  const values = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => String(currentYear - i))
  return draft.anio && !values.includes(draft.anio) ? [draft.anio, ...values] : values
})
function selectType(id: string) {
  draft.tipoDocumentoId = id
  draft.siglaId = ''
  applySelection()
}
function applySelection() {
  const fields = { ...props.fields, tipoDocumentoId: draft.tipoDocumentoId, anio: draft.anio, siglaId: draft.siglaId }
  pendingSelection = (Object.keys(initialFields) as (keyof SearchFields)[])
    .some(key => fields[key] !== props.fields[key]) ? fields : undefined
  emit('search', fields)
}
function submitText() {
  pendingSelection = undefined
  emit('search', compactSearch({ ...draft }))
}
</script>

<template>
  <div class="search-panel compact-search">
    <nav class="type-shortcuts" aria-label="Tipos de documento más usados">
      <UButton
        v-for="shortcut in shortcuts"
        :key="shortcut.label"
        color="neutral"
        variant="outline"
        type="button"
        :aria-pressed="fields.tipoDocumentoId === shortcut.id"
        :disabled="loading || (!catalogs && Boolean(shortcut.id))"
        @click="selectType(shortcut.id)">
        {{ shortcut.label }}
      </UButton>
    </nav>
    <form aria-label="Filtros de documentos" @submit.prevent="submitText()">
      <div class="compact-fields">
        <div class="field">
          <label for="tipoDocumentoId">Tipo de documento</label>
          <select id="tipoDocumentoId" v-model="draft.tipoDocumentoId" :disabled="!catalogs" @change="selectType(draft.tipoDocumentoId)">
            <option value="">
              Todos los tipos
            </option>
            <option v-for="type in catalogs?.types" :key="type.id" :value="String(type.id)">
              {{ type.descripcion || `Tipo ${type.id}` }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="anio">Año</label>
          <select id="anio" v-model="draft.anio" name="anio" @change="applySelection()">
            <option value="">
              Todos
            </option>
            <option v-for="year in years" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>
        <div class="search-entry">
          <div class="field">
            <label for="texto">Búsqueda</label>
            <UInput
              id="texto"
              v-model="draft.texto"
              name="texto"
              type="search"
              maxlength="250"
              placeholder="Ej. 045-2026, comité de selección"
              aria-describedby="search-help"/>
          </div>
          <div class="compact-actions">
            <UButton type="submit" :disabled="loading">
              Buscar
            </UButton>
            <UButton
              class="reset-button"
              color="neutral"
              variant="outline"
              type="button"
              aria-label="Limpiar filtros"
              title="Limpiar filtros"
              @click="emit('clear')">
              ↻
            </UButton>
          </div>
        </div>
      </div>
      <small id="search-help" class="visually-hidden">Busca por palabras, número, número-año o un año de cuatro dígitos.</small>
    </form>
  </div>
</template>
