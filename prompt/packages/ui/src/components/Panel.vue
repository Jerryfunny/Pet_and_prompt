<template>
  <NCard class="h-full" :bordered="false" size="small">
    <div class="p-3 sm:p-4 space-y-3 sm:space-y-4 flex flex-col flex-1">
      <slot></slot>
    </div>
  </NCard>
</template>

<script setup lang="ts">
import { NCard } from 'naive-ui'
</script>

<style scoped>
/* Pure Naive UI implementation - no custom theme CSS needed */
</style>