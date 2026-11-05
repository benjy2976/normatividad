<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import SiteBrand from '~/components/layout/SiteBrand.vue'
import ThemeToggle from '~/components/layout/ThemeToggle.vue'
import type { RouteLocationRaw } from 'vue-router'

withDefaults(defineProps<{
  navigation? : { label: string, to: RouteLocationRaw, symbol: string }[]
}>(), { navigation: () => [] })
const ready = ref(false)
onMounted(() => { ready.value = true })
const collapsed = ref(false)
const mobileOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })
</script>

<template>
  <div class="administration-layout" :inert="!ready" :class="{ 'sidebar-collapsed': collapsed }">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <header class="workspace-header">
      <SiteBrand />
      <nav class="workspace-global-nav" aria-label="Navegación global">
        <NuxtLink to="/">Portal público</NuxtLink>
      </nav>
      <div class="header-actions">
        <span class="workspace-label">Administración</span>
        <ThemeToggle />
      </div>
    </header>
    <div class="administration-workspace">
      <aside class="administration-sidebar" aria-label="Panel lateral">
        <UButton
          color="neutral"
          variant="outline"
          class="sidebar-toggle"
          :aria-expanded="!collapsed"
          aria-controls="administration-navigation"
          :aria-label="collapsed ? 'Expandir navegación' : 'Contraer navegación'"
          @click="collapsed = !collapsed">
          <span aria-hidden="true">{{ collapsed ? '»' : '«' }}</span>
        </UButton>
        <nav id="administration-navigation" class="sidebar-navigation" aria-label="Navegación del área">
          <NuxtLink v-for="item in navigation" :key="item.label" :to="item.to" :aria-label="item.label" :title="collapsed ? item.label : undefined">
            <span class="sidebar-symbol" aria-hidden="true">{{ item.symbol }}</span><span class="sidebar-link-label">{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </aside>
      <main id="contenido" class="administration-main" tabindex="-1">
        <USlideover
          v-model:open="mobileOpen"
          side="left"
          title="Navegación del área"
          description="Secciones disponibles"
          :close="{ label: 'Cerrar navegación' }"
          :ui="{ content: 'administration-drawer' }">
          <UButton
            color="neutral"
            variant="outline"
            class="mobile-navigation-toggle"
            aria-label="Abrir navegación"
            aria-controls="mobile-administration-navigation"
            :aria-expanded="mobileOpen">
            ☰ Menú
          </UButton>
          <template #body>
            <nav id="mobile-administration-navigation" class="sidebar-navigation" aria-label="Navegación del área">
              <NuxtLink v-for="item in navigation" :key="item.label" :to="item.to" @click="mobileOpen = false">{{ item.label }}</NuxtLink>
            </nav>
          </template>
        </USlideover>
        <slot />
      </main>
    </div>
  </div>
</template>
