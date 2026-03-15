import { reactive, type Ref } from 'vue'

import type { AppServices } from '../../types/services'

import type { PromptRecordChain, PromptRecord } from '@prompt-optimizer/core'

export interface HistoryManagerHooks {
  showHistory: boolean
  handleSelectHistory: (historyItem: PromptRecord) => void
  handleClearHistory: () => void
  handleDeleteChain: (chainId: string) => void
}

/**
 * 历史记录管理器Hook
 * @param services 服务实例引用
 * @param prompt 提示词
 * @param optimizedPrompt 优化后的提示词
 * @param currentChainId 当前链ID
 * @param currentVersions 当前版本列表
 * @param currentVersionId 当前版本ID
 * @param handleSelectHistoryBase 选择历史记录的基础处理函数
 * @param handleClearHistoryBase 清空历史记录的基础处理函数
 * @param handleDeleteChainBase 删除链的基础处理函数
 * @returns HistoryManagerHooks
 */
export function useHistoryManager(
  services: Ref<AppServices | null>,
  prompt: Ref<string>,
  optimizedPrompt: Ref<string>,
  currentChainId: Ref<string | null>,
  currentVersions: Ref<PromptRecordChain['versions']>,
  currentVersionId: Ref<string | null>,
  handleSelectHistoryBase: (historyItem: PromptRecord) => void,
  handleClearHistoryBase: () => void,
  handleDeleteChainBase: (chainId: string) => void
): HistoryManagerHooks {
  // 创建一个 reactive 状态对象
  const state = reactive<HistoryManagerHooks>({
    showHistory: false,
    handleSelectHistory: (historyItem: PromptRecord) => {
      handleSelectHistoryBase(historyItem)
      state.showHistory = false
    },
    handleClearHistory: () => {
      // 调用基础方法处理数据层面的清空
      handleClearHistoryBase()
      // 关闭历史记录抽屉
      state.showHistory = false
    },
    handleDeleteChain: (chainId: string) => {
      // 调用基础方法处理数据层面的删除
      handleDeleteChainBase(chainId)
      // 不关闭历史记录抽屉，让用户继续查看其他记录
    }
  })

  return state
} 
