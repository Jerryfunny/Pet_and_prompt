<!-- 简化的Icon组件，用于显示刷新图标 -->
<template>
  <svg
    v-if="name === 'refresh'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="size"
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M3 21v-5h5"/>
  </svg>
  <span v-else>{{ name }}</span>
</template>

<script setup lang="ts">
interface Props {
  name: string
  size?: string
}

withDefaults(defineProps<Props>(), {
  size: 'w-4 h-4'
})
</script>

<style scoped>
.w-4 {
  width: 1rem;
}
.h-4 {
  height: 1rem;
}
</style>