<template>
  <NCard class="text-diff" :style="{ height: '100%' }" :bordered="false" content-style="padding: 0; height: 100%; display: flex; flex-direction: column;">
    <!-- 统计信息 -->
    <NFlex v-if="compareResult" justify="flex-end" align="center" :size="8" class="px-3 py-2 border-b" style="flex: 0 0 auto;">
      <NTag v-if="compareResult.summary.additions > 0" type="success" size="small">
        +{{ compareResult.summary.additions }}
      </NTag>
      <NTag v-if="compareResult.summary.deletions > 0" type="error" size="small">
        -{{ compareResult.summary.deletions }}
      </NTag>
    </NFlex>

    <!-- 文本内容 -->
    <NScrollbar class="text-diff-content" style="flex: 1; min-height: 0;">
      <!-- 对比模式：显示高亮的差异 -->
      <div class="diff-text" v-if="compareResult">
        <span
          v-for="fragment in compareResult.fragments"
          :key="fragment.index"
          :class="getFragmentClass(fragment.type)"
          class="text-fragment"
        >{{ fragment.text }}</span>
      </div>
    </NScrollbar>
  </NCard>
</template>
  
  <script setup lang="ts">
import { computed } from 'vue'

import { NTag, NCard, NFlex, NScrollbar } from 'naive-ui'
import type { CompareResult, ChangeType } from '@prompt-optimizer/core'
import { useNaiveTheme } from '../composables/ui/useNaiveTheme'
  
  interface Props {
    /** 原始文本 */
    originalText: string
    /** 优化后的文本 */
    optimizedText: string
    /** 对比结果 */
    compareResult: CompareResult
  }
  
  defineProps<Props>()

// 获取当前主题配置
const { themeOverrides } = useNaiveTheme()
const theme = computed(() => themeOverrides.value)

const getFragmentClass = (type: ChangeType): string => {
  switch (type) {
    case 'added':
      return 'diff-added'
    case 'removed':
      return 'diff-removed'
    case 'unchanged':
    default:
      return 'diff-unchanged'
  }
}
  </script>
  
  <style scoped>
.text-diff-content {
  min-height: 200px;
}

.diff-text,
.normal-text {
  padding: 0.75rem 1rem;
  line-height: 1.6;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-word;
  width: 100%;
  box-sizing: border-box;
  color: var(--n-text-color);
}

.text-fragment {
  position: relative;
  border-radius: 2px;
  padding: 1px 2px;
}

.diff-added {
  background-color: v-bind('theme.common?.successColorSuppl || "rgba(34, 197, 94, 0.15)"');
  color: v-bind('theme.common?.successColor || "#16a34a"');
}

.diff-removed {
  background-color: v-bind('theme.common?.errorColorSuppl || "rgba(239, 68, 68, 0.15)"');
  color: v-bind('theme.common?.errorColor || "#dc2626"');
  text-decoration: line-through;
}

.diff-unchanged {
  color: v-bind('theme.common?.textColor3 || "#6b7280"');
}

/* 响应式设计 */
@media (max-width: 768px) {
  .diff-text,
  .normal-text {
    font-size: 12px;
  }
}
</style>