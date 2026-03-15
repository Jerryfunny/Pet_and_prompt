/**
 * 变量管理器 Composable
 * 提供变量管理的响应式接口
 */

import { ref, computed, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'

import type { AppServices } from '../../types/services'
import type { IVariableManager, ConversationMessage } from '../../types/variable'
import { VariableManager, createVariableManager } from '../../services/VariableManager'

export interface VariableManagerOptions {
  autoSync?: boolean  // 是否自动同步变量状态
  context?: Record<string, unknown>  // 用于解析预定义变量的上下文
}

export interface VariableManagerHooks {
  // 变量管理器实例
  variableManager: Ref<IVariableManager | null>
  
  // 状态
  isReady: Ref<boolean>
  isAdvancedMode: Ref<boolean>
  customVariables: Ref<Record<string, string>>
  allVariables: Ref<Record<string, string>>
  statistics: Ref<{
    customVariableCount: number
    predefinedVariableCount: number
    totalVariableCount: number
    advancedModeEnabled: boolean
  }>
  
  // 方法
  setAdvancedMode: (enabled: boolean) => void
  addVariable: (name: string, value: string) => void
  updateVariable: (name: string, value: string) => void
  deleteVariable: (name: string) => void
  getVariable: (name: string) => string | undefined
  validateVariableName: (name: string) => boolean
  scanVariablesInContent: (content: string) => string[]
  replaceVariables: (content: string, variables?: Record<string, string>) => string
  detectMissingVariables: (content: string | ConversationMessage[]) => string[]
  
  // 会话管理
  getConversationMessages: () => ConversationMessage[]
  setConversationMessages: (messages: ConversationMessage[]) => void
  
  // 导入导出
  exportVariables: () => string
  importVariables: (data: string) => void
  
  // 刷新状态
  refresh: () => void
}

/**
 * 使用变量管理器
 * @param services - 服务实例，支持 Ref 或 ComputedRef
 * @param options - 配置选项
 */
export function useVariableManager(
  services: Ref<AppServices | null> | ComputedRef<AppServices | null>,
  options: VariableManagerOptions = {}
): VariableManagerHooks {
  
  const variableManager = ref<IVariableManager | null>(null)
  const isReady = ref(false)
  
  // 响应式状态
  const isAdvancedMode = ref(false)
  const customVariables = ref<Record<string, string>>({})
  const allVariables = ref<Record<string, string>>({})
  
  // 统计信息
  const statistics = computed(() => {
    if (!variableManager.value) {
      return {
        customVariableCount: 0,
        predefinedVariableCount: 0,
        totalVariableCount: 0,
        advancedModeEnabled: false
      }
    }
    return variableManager.value.getStatistics()
  })
  
  // 初始化变量管理器
  const initializeVariableManager = async () => {
    if (!services.value?.preferenceService) {
      isReady.value = false
      return
    }

    try {
      // 使用工厂函数，自动等待初始化完成
      const manager = await createVariableManager(services.value.preferenceService)
      variableManager.value = manager
      refreshState()
      isReady.value = true
    } catch (error) {
      console.error('[useVariableManager] Failed to initialize variable manager:', error)
      isReady.value = false
    }
  }
  
  // 刷新状态
  const refreshState = () => {
    if (!variableManager.value) {
      return
    }

    try {
      isAdvancedMode.value = variableManager.value.getAdvancedModeEnabled()
      customVariables.value = variableManager.value.listVariables()
      allVariables.value = variableManager.value.resolveAllVariables(options.context)
    } catch (error) {
      console.error('[useVariableManager] Failed to refresh state:', error)
    }
  }
  
  // 方法实现
  const setAdvancedMode = (enabled: boolean) => {
    if (!variableManager.value) return
    
    try {
      variableManager.value.setAdvancedModeEnabled(enabled)
      refreshState()
    } catch (error) {
      console.error('[useVariableManager] Failed to set advanced mode:', error)
    }
  }
  
  const addVariable = (name: string, value: string) => {
    if (!variableManager.value) return
    
    try {
      variableManager.value.setVariable(name, value)
      refreshState()
    } catch (error) {
      console.error(`[useVariableManager] Failed to add variable ${name}:`, error)
      throw error
    }
  }
  
  const updateVariable = (name: string, value: string) => {
    if (!variableManager.value) return
    
    try {
      variableManager.value.setVariable(name, value)
      refreshState()
    } catch (error) {
      console.error(`[useVariableManager] Failed to update variable ${name}:`, error)
      throw error
    }
  }
  
  const deleteVariable = (name: string) => {
    if (!variableManager.value) return
    
    try {
      variableManager.value.deleteVariable(name)
      refreshState()
    } catch (error) {
      console.error(`[useVariableManager] Failed to delete variable ${name}:`, error)
      throw error
    }
  }
  
  const getVariable = (name: string): string | undefined => {
    return variableManager.value?.getVariable(name)
  }
  
  const validateVariableName = (name: string): boolean => {
    return variableManager.value?.validateVariableName(name) ?? false
  }
  
  const scanVariablesInContent = (content: string): string[] => {
    return variableManager.value?.scanVariablesInContent(content) ?? []
  }
  
  const replaceVariables = (content: string, variables?: Record<string, string>): string => {
    if (!variableManager.value) return content
    return variableManager.value.replaceVariables(content, variables)
  }
  
  const detectMissingVariables = (content: string | ConversationMessage[]): string[] => {
    if (!variableManager.value) return []
    return variableManager.value.detectMissingVariables(content)
  }
  
  // 会话管理方法
  const getConversationMessages = (): ConversationMessage[] => {
    return variableManager.value?.getLastConversationMessages() ?? []
  }
  
  const setConversationMessages = (messages: ConversationMessage[]) => {
    if (!variableManager.value) return
    
    try {
      variableManager.value.setLastConversationMessages(messages)
    } catch (error) {
      console.error('[useVariableManager] Failed to set conversation messages:', error)
    }
  }
  
  // 导入导出方法
  const exportVariables = (): string => {
    return variableManager.value?.exportVariables() ?? ''
  }
  
  const importVariables = (data: string) => {
    if (!variableManager.value) return
    
    try {
      variableManager.value.importVariables(data)
      refreshState()
    } catch (error) {
      console.error('[useVariableManager] Failed to import variables:', error)
      throw error
    }
  }
  
  // 监听服务变化
  watch(services, (newServices) => {
    if (newServices?.preferenceService) {
      initializeVariableManager()
    } else {
      variableManager.value = null
      isReady.value = false
    }
  }, { immediate: true })
  
  // 监听上下文变化，自动刷新allVariables
  if (options.autoSync) {
    watch(() => options.context, () => {
      if (variableManager.value) {
        allVariables.value = variableManager.value.resolveAllVariables(options.context)
      }
    }, { deep: true })
  }
  
  // 生命周期
  onMounted(() => {
    if (services.value?.preferenceService) {
      initializeVariableManager()
    }
  })
  
  onUnmounted(() => {
    // 清理资源
    variableManager.value = null
    isReady.value = false
  })
  
  return {
    // 状态
    variableManager,
    isReady,
    isAdvancedMode,
    customVariables,
    allVariables,
    statistics,
    
    // 方法
    setAdvancedMode,
    addVariable,
    updateVariable,
    deleteVariable,
    getVariable,
    validateVariableName,
    scanVariablesInContent,
    replaceVariables,
    detectMissingVariables,
    
    // 会话管理
    getConversationMessages,
    setConversationMessages,
    
    // 导入导出
    exportVariables,
    importVariables,
    
    // 工具方法
    refresh: refreshState
  }
}
