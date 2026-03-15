<template>
  <div v-if="toolCalls && toolCalls.length > 0" class="tool-call-display">
    <NCollapse v-model:expanded-names="expandedNames">
      <NCollapseItem name="tool-calls">
        <template #header>
          <NSpace align="center" :size="8">
            <NIcon :size="16">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </NIcon>
            <NText>{{ t('toolCall.title') }}</NText>
            <NTag :size="size" type="info">
              {{ t('toolCall.count', { count: toolCalls.length }) }}
            </NTag>
          </NSpace>
        </template>
        
        <NSpace vertical :size="12">
          <div 
            v-for="(toolCall, index) in toolCalls" 
            :key="`tool-call-${index}`"
            class="tool-call-item"
          >
            <NCard :size="cardSize" embedded>
              <template #header>
                <NSpace justify="space-between" align="center">
                  <NSpace align="center" :size="8">
                    <NText strong>{{ toolCall.toolCall.function.name }}</NText>
                    <NTag 
                      :size="tagSize" 
                      :type="getStatusTagType(toolCall.status)"
                    >
                      {{ t(`toolCall.status.${toolCall.status}`) }}
                    </NTag>
                  </NSpace>
                </NSpace>
              </template>
              
              <!-- 工具参数 -->
              <div v-if="toolCall.toolCall.function.arguments" class="tool-arguments">
                <NText depth="3" :size="textSize" class="section-title">
                  {{ t('toolCall.arguments') }}
                </NText>
                <NCode 
                  :code="formatArguments(toolCall.toolCall.function.arguments)"
                  language="json"
                  :word-wrap="true"
                  class="mt-2"
                />
              </div>
              
              <!-- 工具结果 -->
              <div v-if="toolCall.result" class="tool-result mt-3">
                <NText depth="3" :size="textSize" class="section-title">
                  {{ t('toolCall.result') }}
                </NText>
                <NCode 
                  :code="formatResult(toolCall.result)"
                  language="json"
                  :word-wrap="true"
                  class="mt-2"
                />
              </div>
              
              <!-- 错误信息 -->
              <div v-if="toolCall.error" class="tool-error mt-3">
                <NText depth="3" :size="textSize" class="section-title">
                  {{ t('toolCall.error') }}
                </NText>
                <NAlert 
                  type="error"
                  :size="size"
                  class="mt-2"
                >
                  {{ toolCall.error }}
                </NAlert>
              </div>
            </NCard>
          </div>
        </NSpace>
      </NCollapseItem>
    </NCollapse>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'
import { 
  NCollapse, NCollapseItem, NSpace, NIcon, NText, NTag, NCard, 
  NCode, NAlert
} from 'naive-ui'
import type { ToolCallResult } from '@prompt-optimizer/core'

const { t } = useI18n()

interface Props {
  /** 工具调用结果列表 */
  toolCalls?: ToolCallResult[]
  /** 组件尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 卡片尺寸 */
  cardSize?: 'small' | 'medium' | 'large'
  /** 默认是否展开 */
  defaultExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  cardSize: 'small',
  defaultExpanded: true
})

// 展开状态管理
const expandedNames = ref<string[]>([])


// 监听工具调用变化，自动展开
watch(() => props.toolCalls, (newToolCalls) => {
  if (newToolCalls && newToolCalls.length > 0 && props.defaultExpanded) {
    // 有新工具调用时自动展开
    if (!expandedNames.value.includes('tool-calls')) {
      expandedNames.value = ['tool-calls']
    }
  }
}, { immediate: true })

// 计算属性
const tagSize = computed(() => {
  const sizeMap = { small: 'small', medium: 'small', large: 'medium' } as const
  return sizeMap[props.size] || 'small'
})

const textSize = computed(() => {
  const sizeMap = { small: 'small', medium: 'medium', large: 'large' } as const
  return sizeMap[props.size] || 'small'
})

// 工具函数
const getStatusTagType = (status: string) => {
  switch (status) {
    case 'success':
      return 'success'
    case 'error':
      return 'error'
    case 'pending':
      return 'warning'
    default:
      return 'default'
  }
}

const formatArguments = (args: string | object) => {
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return args
    }
  }
  return JSON.stringify(args, null, 2)
}

const formatResult = (result: string | Record<string, unknown> | Array<unknown>) => {
  if (typeof result === 'string') {
    return result
  }
  return JSON.stringify(result, null, 2)
}
</script>

<style scoped>
.tool-call-display {
  margin-top: 12px;
}

.tool-call-item {
  /* 工具调用项样式 */
}

.section-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.tool-arguments,
.tool-result,
.tool-error {
  border-left: 2px solid var(--n-border-color);
  padding-left: 12px;
}
</style>
