<script setup lang="ts">
import AppListPage from '~/components/ui/AppListPage.vue'
import AppDataTable from '~/components/ui/AppDataTable.vue'
import { sampleColumns, sampleNavigation, sampleRows } from '../fixtures'

definePageMeta({ layout: false })
useHead({ title: 'Muestra de administración | Normatividad', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
const columns = sampleColumns.map(column => ({ ...column, sortable: false }))
</script>

<template>
  <NuxtLayout name="administration" :navigation="sampleNavigation">
    <AppListPage title="Muestra de administración">
      <template #notices>
        <p class="sample-notice">
          Demostración visual en desarrollo. Sin sesión, permisos ni operaciones sobre datos reales.
        </p>
      </template>
      <section class="sample-placeholder" aria-labelledby="sample-workspace-heading">
        <h2 id="sample-workspace-heading">
          Área de trabajo
        </h2>
        <p>
          Aquí se compondrán las vistas administrativas con sus filtros, tablas y formularios.
        </p>
        <p>
          Este bloque representa el contenido de una pantalla; la barra superior y el sidebar pertenecen al layout compartido.
        </p>
      </section>
      <AppDataTable :rows="sampleRows.slice(0, 4)" :columns="columns" row-key="id" label="Tabla sintética administrativa" title="Tabla de muestra">
        <template #title-cell="{ row }">
          <div class="document-content">
            <h3>
              {{ row.title }}
            </h3><p class="document-description">
              {{ row.description }}
            </p>
          </div>
        </template>
        <template #state-cell="{ row }">
          <span class="type-label">{{ row.state }}</span>
        </template>
      </AppDataTable>
    </AppListPage>
  </NuxtLayout>
</template>
