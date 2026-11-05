<script setup lang="ts">
import ThemeToggle from '~/components/layout/ThemeToggle.vue'
</script>

<template>
  <div class="viewer-layout">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <header class="workspace-header viewer-toolbar" aria-label="Herramientas del visor">
      <slot name="tools" />
      <div class="viewer-actions">
        <slot name="actions" />
        <ThemeToggle class="viewer-tool-button" />
      </div>
    </header>
    <main id="contenido" class="viewer-main" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
