<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="list-page">
    <header class="intro list-page-heading">
      <h1>
        {{ title }}
      </h1>
      <slot name="actions" />
    </header>
    <slot name="filters" />
    <slot name="notices" />
    <slot />
  </div>
</template>
