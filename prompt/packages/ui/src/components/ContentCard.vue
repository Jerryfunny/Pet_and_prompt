<template>
  <NCard class="h-full max-height: 100%" :bordered="false" size="small"
  content-style="max-height: 100%">
    <NSpace 
      vertical 
      :size="16"
      style="height: 100%; max-height: 100%"
    >
      <slot></slot>
    </NSpace>
  </NCard>
</template>

<script setup lang="ts">
import { NCard, NSpace } from 'naive-ui'
</script>