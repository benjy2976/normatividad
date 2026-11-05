<script setup lang="ts">
import AppListPage from '~/components/ui/AppListPage.vue'
import ActiveDocumentFilters from '~/modules/documents/components/ActiveDocumentFilters.vue'
import SearchFilters from '~/modules/documents/components/SearchFilters.vue'
import DocumentResults from '~/modules/documents/components/DocumentResults.vue'
import { usePublicDocuments } from '~/modules/documents/composables/usePublicDocuments'
import { initialFields, searchLocation, type SearchFields } from '~/modules/documents/utils/search'

definePageMeta({ alias: ['/'], layout: 'public', key: 'public-document-search' })
useHead({ title: 'Consulta de documentos | Normatividad' })
const route = useRoute()
const router = useRouter()
const { search, documents, catalogs } = usePublicDocuments()
const { data: result, status, error, refresh } = documents
const { data: catalogData, error: catalogError, refresh: retryCatalogs } = catalogs
async function submit(fields: SearchFields) {
  const location = searchLocation(fields)
  if (route.path === location.path && JSON.stringify(route.query) === JSON.stringify(location.query)) await refresh()
  else await router.push(location)
}
const pageLocation = (page: number) => ({ path: '/documentos', query: { ...route.query, pagina: String(page) }, hash: '#results-heading' })
function changeOption(event: Event, key: 'orden' | 'porPagina') {
  return submit({ ...search.value.fields, [key]: (event.target as HTMLSelectElement).value })
}
</script>

<template>
  <AppListPage title="Documentos normativos">
    <template #filters>
      <SearchFilters :fields="search.fields" :catalogs="catalogData ?? null" :loading="status === 'idle' || status === 'pending'" @search="submit" @clear="submit({ ...initialFields })" />
    </template>
    <template #notices>
      <div v-if="catalogError" class="notice" role="alert">
        <p>
          No pudimos cargar los catálogos. Puedes buscar por texto, año o número.
        </p><UButton color="neutral" variant="link" class="text-button" @click="retryCatalogs()">
          Reintentar catálogos
        </UButton>
      </div>
      <div v-if="search.errors.length" class="notice error-panel" role="alert">
        <h2>
          Revisa los filtros de la dirección
        </h2><ul>
          <li v-for="message in search.errors" :key="message">
            {{ message }}
          </li>
        </ul><p>
          Corrige los campos o limpia los filtros para continuar.
        </p>
        <ActiveDocumentFilters :fields="search.fields" :catalogs="catalogData ?? null" @search="submit" />
      </div>
    </template>
    <DocumentResults
      v-if="!search.errors.length"
      :result="result ?? null"
      :status="status"
      :error="Boolean(error)"
      :page-location="pageLocation"
      :order="search.fields.orden"
      :show-document-type="!search.fields.tipoDocumentoId"
      @order-change="submit({ ...search.fields, orden: $event })"
      @retry="refresh()">
      <template #filters>
        <ActiveDocumentFilters :fields="search.fields" :catalogs="catalogData ?? null" @search="submit" />
      </template>
      <template #controls>
        <div class="results-options">
          <div class="field">
            <label for="orden">Ordenar por</label><select id="orden" :value="search.fields.orden" @change="changeOption($event, 'orden')">
              <option value="fechaDesc">
                Fecha más reciente
              </option><option value="fechaAsc">
                Fecha más antigua
              </option><option value="idDesc">
                Últimos incorporados
              </option>
            </select>
          </div>
          <div class="field">
            <label for="porPagina">Resultados por página</label><select id="porPagina" :value="search.fields.porPagina" @change="changeOption($event, 'porPagina')">
              <option v-if="!['10', '20', '25', '50', '100'].includes(search.fields.porPagina)" :value="search.fields.porPagina">
                {{ search.fields.porPagina }} por página
              </option><option v-for="size in [10, 20, 25, 50, 100]" :key="size" :value="String(size)">
                {{ size }} por página
              </option>
            </select>
          </div>
        </div>
      </template>
    </DocumentResults>
  </AppListPage>
</template>
