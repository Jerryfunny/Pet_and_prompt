import { ref, type Ref } from 'vue'

/**
 * 输入历史记录管理 Composable
 *
 * 功能：
 * 1. 记录输入框的编辑历史
 * 2. 支持撤销 (Ctrl+Z) 和重做 (Ctrl+Shift+Z)
 * 3. 智能合并连续编辑操作
 */

export interface HistoryRecord {
  /** 文本内容 */
  content: string
  /** 光标位置 */
  cursorPosition: number
  /** 记录时间戳 */
  timestamp: number
}

export interface UseInputHistoryOptions {
  /** 最大历史记录数 */
  maxHistory?: number
  /** 合并编辑的时间阈值 (毫秒) */
  mergeThreshold?: number
}

export function useInputHistory(
  inputRef: Ref<HTMLInputElement | HTMLTextAreaElement | null>,
  options: UseInputHistoryOptions = {}
) {
  const { maxHistory = 50, mergeThreshold = 1000 } = options

  // 历史记录栈
  const history = ref<HistoryRecord[]>([])
  // 当前历史位置索引
  const currentIndex = ref(-1)
  // 最后一次编辑的时间戳
  const lastEditTimestamp = ref(0)
  // 是否正在执行撤销/重做操作
  const isUndoRedoing = ref(false)

  /**
   * 添加历史记录
   */
  const addHistory = (content: string, cursorPosition: number, forceNew = false) => {
    if (isUndoRedoing.value) return

    const now = Date.now()
    const shouldMerge =
      !forceNew &&
      history.value.length > 0 &&
      currentIndex.value >= 0 &&
      now - lastEditTimestamp.value < mergeThreshold

    if (shouldMerge) {
      // 智能合并: 更新当前记录
      history.value[currentIndex.value] = {
        content,
        cursorPosition,
        timestamp: now
      }
    } else {
      // 创建新记录: 移除当前位置之后的所有记录
      history.value = history.value.slice(0, currentIndex.value + 1)

      // 添加新记录
      history.value.push({
        content,
        cursorPosition,
        timestamp: now
      })

      // 限制历史记录数量
      if (history.value.length > maxHistory) {
        history.value.shift()
      } else {
        currentIndex.value++
      }
    }

    lastEditTimestamp.value = now
  }

  /**
   * 撤销操作
   */
  const undo = (): boolean => {
    if (currentIndex.value <= 0) {
      return false
    }

    isUndoRedoing.value = true
    currentIndex.value--

    const record = history.value[currentIndex.value]
    if (record && inputRef.value) {
      inputRef.value.value = record.content
      inputRef.value.setSelectionRange(record.cursorPosition, record.cursorPosition)

      // 触发 input 事件,确保 v-model 同步
      const event = new Event('input', { bubbles: true })
      inputRef.value.dispatchEvent(event)
    }

    isUndoRedoing.value = false
    return true
  }

  /**
   * 重做操作
   */
  const redo = (): boolean => {
    if (currentIndex.value >= history.value.length - 1) {
      return false
    }

    isUndoRedoing.value = true
    currentIndex.value++

    const record = history.value[currentIndex.value]
    if (record && inputRef.value) {
      inputRef.value.value = record.content
      inputRef.value.setSelectionRange(record.cursorPosition, record.cursorPosition)

      // 触发 input 事件,确保 v-model 同步
      const event = new Event('input', { bubbles: true })
      inputRef.value.dispatchEvent(event)
    }

    isUndoRedoing.value = false
    return true
  }

  /**
   * 清空历史记录
   */
  const clearHistory = () => {
    history.value = []
    currentIndex.value = -1
    lastEditTimestamp.value = 0
  }

  /**
   * 记录变量提取操作 (强制创建新记录)
   */
  const recordVariableExtraction = (content: string, cursorPosition: number) => {
    addHistory(content, cursorPosition, true)
  }

  /**
   * 获取是否可以撤销
   */
  const canUndo = () => currentIndex.value > 0

  /**
   * 获取是否可以重做
   */
  const canRedo = () => currentIndex.value < history.value.length - 1

  return {
    history,
    currentIndex,
    addHistory,
    undo,
    redo,
    clearHistory,
    recordVariableExtraction,
    canUndo,
    canRedo
  }
}
