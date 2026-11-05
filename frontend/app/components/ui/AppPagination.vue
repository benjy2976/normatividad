<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { TablePage } from './table'

defineProps<{ page: TablePage, pageLocation: (page: number) => RouteLocationRaw }>()
defineEmits<{ pageChange: [page: number] }>()
</script>

<template>
  <nav v-if="page.last > 1" class="pagination" aria-label="Paginación de resultados">
    <UButton v-if="page.current > 1" color="neutral" variant="outline" :to="pageLocation(page.current - 1)" @click="$emit('pageChange', page.current - 1)">
      ← Anterior
    </UButton>
    <span v-else class="disabled-page">← Anterior</span>
    <span aria-current="page">Página {{ page.current }} de {{ page.last }}</span>
    <UButton v-if="page.current < page.last" color="neutral" variant="outline" :to="pageLocation(page.current + 1)" @click="$emit('pageChange', page.current + 1)">
      Siguiente →
    </UButton>
    <span v-else class="disabled-page">Siguiente →</span>
  </nav>
</template>
