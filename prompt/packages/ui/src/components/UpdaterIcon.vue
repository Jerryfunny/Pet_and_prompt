<template>
  <!-- 仅在Electron环境中显示 -->
  <div v-if="isElectronEnvironment" class="relative">
    <NBadge :show="state.hasUpdate" dot processing>
      <NButton
        @click="toggleModal"
        :title="t('updater.checkForUpdates')"
        quaternary
        circle
        size="small"
      >
        <template #icon>
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </template>
      </NButton>
    </NBadge>

    <!-- 更新模态框 -->
    <UpdaterModal v-model="showModal" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { useI18n } from 'vue-i18n'
import { NButton, NBadge } from 'naive-ui'
import { isRunningInElectron } from '@prompt-optimizer/core'
import { useUpdater } from '../composables/system/useUpdater'
import UpdaterModal from './UpdaterModal.vue'

const { t } = useI18n()

// 环境检测
const isElectronEnvironment = isRunningInElectron()

// 只获取状态用于图标显示，不调用任何方法
const { state } = useUpdater()

// 模态框显示状态
const showModal = ref(false)

// 切换模态框显示
const toggleModal = () => {
  showModal.value = !showModal.value
}
</script>

<style scoped>
/* Pure Naive UI implementation - no custom theme CSS needed */
</style>
