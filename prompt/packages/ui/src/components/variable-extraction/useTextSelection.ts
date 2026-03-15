import { ref, type Ref } from 'vue'

/**
 * 文本选择检测 Composable
 *
 * 功能：
 * 1. 检测文本框中的选中文本
 * 2. 验证选中文本的合法性
 * 3. 防止跨越变量边界选择
 */

export interface TextSelection {
  /** 选中的文本内容 */
  text: string
  /** 选中起始位置 */
  start: number
  /** 选中结束位置 */
  end: number
  /** 是否有效选择 */
  isValid: boolean
  /** 无效原因 */
  invalidReason?: string
}

export function useTextSelection(inputRef: Ref<HTMLInputElement | HTMLTextAreaElement | null>) {
  const selection = ref<TextSelection>({
    text: '',
    start: 0,
    end: 0,
    isValid: false
  })

  /**
   * 获取当前选中的文本
   */
  const getSelection = (): TextSelection => {
    const input = inputRef.value
    if (!input) {
      return {
        text: '',
        start: 0,
        end: 0,
        isValid: false,
        invalidReason: '输入框未就绪'
      }
    }

    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    const text = input.value.substring(start, end)

    // 验证选择
    const validation = validateSelection(input.value, start, end, text)

    selection.value = {
      text: validation.isValid ? text.trim() : '',
      start,
      end,
      isValid: validation.isValid,
      invalidReason: validation.reason
    }

    return selection.value
  }

  /**
   * 验证选中文本的合法性
   */
  const validateSelection = (
    fullText: string,
    start: number,
    end: number,
    selectedText: string
  ): { isValid: boolean; reason?: string } => {
    // 检查是否有选中文本
    if (start === end || !selectedText.trim()) {
      return { isValid: false, reason: '未选中任何文本' }
    }

    // 检查是否跨越变量边界
    const beforeSelection = fullText.substring(0, start)
    const afterSelection = fullText.substring(end)

    // 检查选中文本前是否有未闭合的 {{
    const openBracesBeforeCount = (beforeSelection.match(/\{\{/g) || []).length
    const closeBracesBeforeCount = (beforeSelection.match(/\}\}/g) || []).length
    if (openBracesBeforeCount > closeBracesBeforeCount) {
      return { isValid: false, reason: '不能跨越变量边界' }
    }

    // 检查选中文本后是否有未闭合的 }}
    const openBracesAfterCount = (afterSelection.match(/\{\{/g) || []).length
    const closeBracesAfterCount = (afterSelection.match(/\}\}/g) || []).length
    if (closeBracesAfterCount > openBracesAfterCount) {
      return { isValid: false, reason: '不能跨越变量边界' }
    }

    // 检查选中文本内部是否包含完整的变量占位符
    const openBracesInSelection = (selectedText.match(/\{\{/g) || []).length
    const closeBracesInSelection = (selectedText.match(/\}\}/g) || []).length
    if (openBracesInSelection > 0 || closeBracesInSelection > 0) {
      // 如果选中文本包含 {{ 或 }},检查是否是完整的变量
      if (openBracesInSelection !== closeBracesInSelection) {
        return { isValid: false, reason: '不能跨越变量边界' }
      }
    }

    return { isValid: true }
  }

  /**
   * 计算选中文本在完整文本中的出现次数
   */
  const countOccurrences = (fullText: string, searchText: string): number => {
    if (!searchText) return 0

    const trimmedSearch = searchText.trim()
    if (!trimmedSearch) return 0

    // 使用正则表达式计算出现次数,但要排除已经在变量中的文本
    let count = 0
    let position = 0

    while (position < fullText.length) {
      const index = fullText.indexOf(trimmedSearch, position)
      if (index === -1) break

      // 检查该位置是否在变量占位符内部
      const beforeText = fullText.substring(0, index)
      const openBraces = (beforeText.match(/\{\{/g) || []).length
      const closeBraces = (beforeText.match(/\}\}/g) || []).length

      // 如果不在变量内部,则计数
      if (openBraces === closeBraces) {
        count++
      }

      position = index + 1
    }

    return count
  }

  /**
   * 替换文本中的所有匹配项
   */
  const replaceAllOccurrences = (
    fullText: string,
    searchText: string,
    replaceWith: string
  ): string => {
    if (!searchText) return fullText

    const trimmedSearch = searchText.trim()
    if (!trimmedSearch) return fullText

    let result = fullText
    let position = 0

    while (position < result.length) {
      const index = result.indexOf(trimmedSearch, position)
      if (index === -1) break

      // 检查该位置是否在变量占位符内部
      const beforeText = result.substring(0, index)
      const openBraces = (beforeText.match(/\{\{/g) || []).length
      const closeBraces = (beforeText.match(/\}\}/g) || []).length

      // 如果不在变量内部,则替换
      if (openBraces === closeBraces) {
        result =
          result.substring(0, index) +
          replaceWith +
          result.substring(index + trimmedSearch.length)
        position = index + replaceWith.length
      } else {
        position = index + 1
      }
    }

    return result
  }

  return {
    selection,
    getSelection,
    validateSelection,
    countOccurrences,
    replaceAllOccurrences
  }
}
