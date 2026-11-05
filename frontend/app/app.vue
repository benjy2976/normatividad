<script setup lang="ts">
import { es } from '@nuxt/ui/locale'
</script>

<template>
  <UApp :locale="es">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
