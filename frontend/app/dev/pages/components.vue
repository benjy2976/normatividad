<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppListPage from '~/components/ui/AppListPage.vue'
import AppDataTable from '~/components/ui/AppDataTable.vue'
import type { TableSort } from '~/components/ui/table'
import { sampleColumns, sampleRows } from '../fixtures'

definePageMeta({ layout: 'public', key: 'development-component-samples' })
useHead({ title: 'Muestras de componentes | Normatividad', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
const ready = ref(false)
onMounted(() => { ready.value = true })
const route = useRoute()
const state = ref('ready')
const example = ref('')
const modalOpen = ref(false)
const text = ref('')
const sort = ref<TableSort>({ key: 'title', direction: 'asc' })
const page = computed(() => route.query.pagina === '2' || route.query.pagina === '3' ? Number(route.query.pagina) : 1)
const ordered = computed(() => sort.value.direction === 'asc' ? sampleRows : [...sampleRows].reverse())
const rows = computed(() => state.value === 'empty' ? [] : ordered.value.slice((page.value - 1) * 5, page.value * 5))
const metadata = computed(() => ({ current: page.value, last: 3, total: 12, from: (page.value - 1) * 5 + 1, to: Math.min(page.value * 5, 12) }))
</script>

<template>
  <AppListPage title="Muestras de componentes" :inert="!ready">
    <template #actions>
      <NuxtLink to="/muestras/administracion">Ver layout de administración →</NuxtLink>
    </template>
    <template #notices>
      <p class="sample-notice">
        Catálogo de desarrollo. Todos los registros son sintéticos y el orden de esta muestra es local.
      </p>
    </template>
    <section class="sample-controls" aria-labelledby="sample-controls-heading">
      <h2 id="sample-controls-heading">
        Controles y estados
      </h2>
      <div class="sample-control-row">
        <div class="field">
          <label for="sample-text">Campo de ejemplo</label>
          <UInput id="sample-text" v-model="text" placeholder="Escribe un texto de muestra" />
        </div>
        <div class="field">
          <label for="sample-state">Estado de la tabla</label>
          <select id="sample-state" v-model="state">
            <option value="ready">
              Con registros
            </option>
            <option value="loading">
              Cargando
            </option>
            <option value="empty">
              Vacía
            </option>
            <option value="error">
              Error recuperable
            </option>
          </select>
        </div>
        <UButton @click="example = 'Acción principal de ejemplo'; modalOpen = true">
          Acción principal
        </UButton>
        <UButton color="neutral" variant="outline" @click="text = ''">
          Limpiar campo
        </UButton>
        <span class="type-label">Etiqueta</span>
      </div>
    </section>
    <AppDataTable
      :rows="rows"
      :columns="sampleColumns"
      row-key="id"
      label="Registros sintéticos de muestra"
      title="Tabla y paginación reutilizables"
      :loading="state === 'loading'"
      :error="state === 'error'"
      :page="state === 'empty' ? undefined : metadata"
      :page-location="current => ({ path: '/muestras/componentes', query: { pagina: String(current) } })"
      :sort="sort"
      @retry="state = 'ready'"
      @sort-change="sort = $event">
      <template #title-cell="{ row }">
        <div class="document-content">
          <h3>
            {{ row.title }}
          </h3>
          <p class="document-description">
            {{ row.description }}
          </p>
          <UButton color="neutral" variant="link" @click="example = row.title; modalOpen = true">
            Ver ejemplo
          </UButton>
        </div>
      </template>
      <template #state-cell="{ row }">
        <span class="type-label">{{ row.state }}</span>
      </template>
    </AppDataTable>
    <UModal v-model:open="modalOpen" title="Vista de ejemplo" description="Contenido sintético del catálogo de componentes" :close="{ label: 'Cerrar ejemplo' }">
      <template #body>
        <p>
          {{ example }}
        </p>
      </template>
    </UModal>
  </AppListPage>
</template>
