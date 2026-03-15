import { ref, nextTick, type Ref } from 'vue'


// 模型选择器组件实例类型定义
interface ModelSelectInstance {
  refresh?: () => Promise<void>
}

export interface ModelSelectRefsHooks {
  optimizeModelSelect: Ref<ModelSelectInstance | null>
  testModelSelect: Ref<ModelSelectInstance | null>
  refreshAll: () => Promise<void>
  refreshOptimize: () => Promise<void>
  refreshTest: () => Promise<void>
}

/**
 * 模型选择器引用管理Hook
 * 专门用于管理模型选择器组件的引用和批量刷新操作
 * @returns ModelSelectRefsHooks
 */
export function useModelSelectRefs(): ModelSelectRefsHooks {
  const optimizeModelSelect = ref<ModelSelectInstance | null>(null)
  const testModelSelect = ref<ModelSelectInstance | null>(null)

  const refreshOptimize = async () => {
    await nextTick()
    try {
      await optimizeModelSelect.value?.refresh?.()
    } catch (error) {
      console.error('Failed to refresh optimize model select:', error)
    }
  }

  const refreshTest = async () => {
    await nextTick()
    try {
      await testModelSelect.value?.refresh?.()
    } catch (error) {
      console.error('Failed to refresh test model select:', error)
    }
  }

  const refreshAll = async () => {
    await Promise.all([
      refreshOptimize(),
      refreshTest()
    ])
  }

  return {
    optimizeModelSelect,
    testModelSelect,
    refreshAll,
    refreshOptimize,
    refreshTest
  }
}