<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ThemeToggle from '~/components/layout/ThemeToggle.vue'
import SiteBrand from '~/components/layout/SiteBrand.vue'

const header = ref<HTMLElement | null>(null)
const headerHeight = ref(63)
let observer: InstanceType<typeof globalThis.ResizeObserver> | undefined
useHead(() => ({ htmlAttrs: { style: `--public-header-height: ${headerHeight.value}px` } }))
onMounted(() => {
  const element = header.value
  if (!element) return
  const measureHeader = () => { headerHeight.value = element.getBoundingClientRect().height }
  measureHeader()
  observer = new globalThis.ResizeObserver(measureHeader)
  observer.observe(element)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="public-layout">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <header ref="header" class="site-header">
      <UContainer class="public-shell header-content">
        <SiteBrand />
        <div class="header-actions">
          <span class="public-label">Consulta pública</span>
          <ThemeToggle />
        </div>
      </UContainer>
    </header>
    <UContainer as="main" id="contenido" class="public-shell public-content" tabindex="-1">
      <slot />
    </UContainer>
    <UContainer as="footer" class="public-shell site-footer">
      <span>Gobierno Regional de Huánuco</span>
      <span>Repositorio de documentos normativos</span>
    </UContainer>
  </div>
</template>
