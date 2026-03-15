import { describe, it, expect } from 'vitest'

/**
 * 选择安全机制测试
 *
 * 这些函数在 VariableAwareInput.vue 组件内部实现
 * 这里测试它们的核心逻辑
 */

describe('selection-safety', () => {
  describe('isInsideVariablePlaceholder', () => {
    /**
     * 判断给定位置是否位于变量占位符内部
     */
    const isInsideVariablePlaceholder = (text: string, index: number): boolean => {
      const beforeText = text.substring(0, index)
      const openBraces = (beforeText.match(/\{\{/g) || []).length
      const closeBraces = (beforeText.match(/\}\}/g) || []).length
      return openBraces > closeBraces
    }

    it('应该识别占位符外部的位置', () => {
      const text = 'Hello {{name}}'

      expect(isInsideVariablePlaceholder(text, 0)).toBe(false)  // 'H'
      expect(isInsideVariablePlaceholder(text, 5)).toBe(false)  // ' '
    })

    it('应该识别占位符内部的位置', () => {
      const text = 'Hello {{name}}'

      expect(isInsideVariablePlaceholder(text, 8)).toBe(true)   // 'n' in name
      expect(isInsideVariablePlaceholder(text, 11)).toBe(true)  // 'e' in name
    })

    it('应该正确处理开始括号位置', () => {
      const text = 'Hello {{name}}'

      expect(isInsideVariablePlaceholder(text, 6)).toBe(false)  // 第一个 '{'
      expect(isInsideVariablePlaceholder(text, 7)).toBe(false)  // 第二个 '{'
    })

    it('应该正确处理结束括号位置', () => {
      const text = 'Hello {{name}}'

      expect(isInsideVariablePlaceholder(text, 12)).toBe(true)  // 第一个 '}'
      expect(isInsideVariablePlaceholder(text, 13)).toBe(true)  // 第二个 '}'
      expect(isInsideVariablePlaceholder(text, 14)).toBe(false) // 结束后
    })

    it('应该处理多个变量', () => {
      const text = '{{var1}} and {{var2}}'

      expect(isInsideVariablePlaceholder(text, 3)).toBe(true)   // var1 内部
      expect(isInsideVariablePlaceholder(text, 9)).toBe(false)  // 两个变量之间
      expect(isInsideVariablePlaceholder(text, 16)).toBe(true)  // var2 内部
    })

    it('应该处理嵌套的括号', () => {
      const text = '{{outer {{inner}}}}'

      // 注意: 这个测试展示了简单的括号计数方法的局限性
      // 实际的变量占位符不应该嵌套
      expect(isInsideVariablePlaceholder(text, 3)).toBe(true)
      expect(isInsideVariablePlaceholder(text, 10)).toBe(true)
    })
  })

  describe('validateSelection', () => {
    /**
     * 校验选中文本是否合法 (不得跨越变量边界)
     */
    const validateSelection = (
      fullText: string,
      start: number,
      end: number,
      selectedText: string
    ): { isValid: boolean; reason?: string } => {
      // 是否有有效选择
      if (start === end || !selectedText.trim()) {
        return { isValid: false, reason: '未选中任何文本' }
      }

      // 检查是否跨越变量边界
      const beforeSelection = fullText.substring(0, start)
      const afterSelection = fullText.substring(end)

      const openBracesBefore = (beforeSelection.match(/\{\{/g) || []).length
      const closeBracesBefore = (beforeSelection.match(/\}\}/g) || []).length
      if (openBracesBefore > closeBracesBefore) {
        return { isValid: false, reason: '不能跨越变量边界' }
      }

      const openBracesAfter = (afterSelection.match(/\{\{/g) || []).length
      const closeBracesAfter = (afterSelection.match(/\}\}/g) || []).length
      if (closeBracesAfter > openBracesAfter) {
        return { isValid: false, reason: '不能跨越变量边界' }
      }

      const openBracesInSelection = (selectedText.match(/\{\{/g) || []).length
      const closeBracesInSelection = (selectedText.match(/\}\}/g) || []).length
      if (openBracesInSelection !== closeBracesInSelection) {
        return { isValid: false, reason: '不能跨越变量边界' }
      }

      return { isValid: true }
    }

    it('应该接受正常的文本选择', () => {
      const text = 'Hello world'
      const result = validateSelection(text, 0, 5, 'Hello')

      expect(result.isValid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('应该拒绝空选择', () => {
      const text = 'Hello world'
      const result = validateSelection(text, 5, 5, '')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('未选中任何文本')
    })

    it('应该拒绝仅包含空格的选择', () => {
      const text = 'Hello   world'
      const result = validateSelection(text, 5, 8, '   ')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('未选中任何文本')
    })

    it('应该接受完整变量的选择', () => {
      const text = 'Hello {{name}} world'
      const result = validateSelection(text, 6, 14, '{{name}}')

      expect(result.isValid).toBe(true)
    })

    it('应该拒绝从变量内部开始的选择', () => {
      const text = 'Hello {{name}} world'
      const result = validateSelection(text, 8, 14, 'name}}')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('不能跨越变量边界')
    })

    it('应该拒绝在变量内部结束的选择', () => {
      const text = 'Hello {{name}} world'
      const result = validateSelection(text, 6, 12, '{{name')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('不能跨越变量边界')
    })

    it('应该拒绝跨越变量开始边界的选择', () => {
      const text = 'Hello {{name}} world'
      const result = validateSelection(text, 3, 10, 'lo {{na')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('不能跨越变量边界')
    })

    it('应该拒绝跨越变量结束边界的选择', () => {
      const text = 'Hello {{name}} world'
      const result = validateSelection(text, 10, 17, 'me}} wo')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('不能跨越变量边界')
    })

    it('应该接受包含多个完整变量的选择', () => {
      const text = 'Hello {{name}} and {{age}}'
      const result = validateSelection(text, 6, 26, '{{name}} and {{age}}')

      expect(result.isValid).toBe(true)
    })

    it('应该接受变量之间的文本选择', () => {
      const text = '{{var1}} middle {{var2}}'
      const result = validateSelection(text, 9, 16, 'middle ')

      expect(result.isValid).toBe(true)
    })
  })

  describe('countOccurrencesOutsideVariables', () => {
    /**
     * 统计文本中目标字符串的出现次数 (忽略变量占位符内部)
     */
    const isInsideVariablePlaceholder = (text: string, index: number): boolean => {
      const beforeText = text.substring(0, index)
      const openBraces = (beforeText.match(/\{\{/g) || []).length
      const closeBraces = (beforeText.match(/\}\}/g) || []).length
      return openBraces > closeBraces
    }

    const isOutsideVariableRange = (
      fullText: string,
      start: number,
      length: number
    ): boolean => {
      if (length <= 0) return false
      if (isInsideVariablePlaceholder(fullText, start)) {
        return false
      }
      const endIndex = start + length - 1
      return !isInsideVariablePlaceholder(fullText, endIndex)
    }

    const countOccurrencesOutsideVariables = (
      fullText: string,
      searchText: string
    ): number => {
      if (!searchText || !searchText.trim()) return 0

      let count = 0
      let position = 0

      while (position < fullText.length) {
        const index = fullText.indexOf(searchText, position)
        if (index === -1) break

        if (isOutsideVariableRange(fullText, index, searchText.length)) {
          count += 1
          position = index + searchText.length
        } else {
          position = index + 1
        }
      }

      return count
    }

    it('应该统计纯文本中的出现次数', () => {
      const text = 'test test test'
      const count = countOccurrencesOutsideVariables(text, 'test')

      expect(count).toBe(3)
    })

    it('应该忽略变量占位符内部的匹配', () => {
      const text = 'test {{test}} test'
      const count = countOccurrencesOutsideVariables(text, 'test')

      expect(count).toBe(2) // 只统计外部的两个 'test'
    })

    it('应该处理部分匹配在变量内部的情况', () => {
      const text = 'customer {{customer_name}} customer'
      const count = countOccurrencesOutsideVariables(text, 'customer')

      expect(count).toBe(2) // 只统计外部的两个 'customer'
    })

    it('应该处理空搜索文本', () => {
      const text = 'test {{var}} test'
      const count = countOccurrencesOutsideVariables(text, '')

      expect(count).toBe(0)
    })

    it('应该处理仅包含空格的搜索文本', () => {
      const text = 'test {{var}} test'
      const count = countOccurrencesOutsideVariables(text, '   ')

      expect(count).toBe(0)
    })

    it('应该处理无匹配的情况', () => {
      const text = 'test {{var}} test'
      const count = countOccurrencesOutsideVariables(text, 'nomatch')

      expect(count).toBe(0)
    })

    it('应该处理多个变量的情况', () => {
      const text = 'name {{name}} age {{age}} name'
      const count = countOccurrencesOutsideVariables(text, 'name')

      expect(count).toBe(2) // 开头和结尾的 'name'
    })

    it('应该正确处理重叠的搜索文本', () => {
      const text = 'aaa {{aaa}} aaa'
      const count = countOccurrencesOutsideVariables(text, 'aa')

      // 'aaa' 包含两个 'aa',但我们从左到右扫描,每次匹配后跳过整个匹配
      expect(count).toBe(2) // 开头的 'aaa' 中的一个 'aa' + 结尾的 'aaa' 中的一个 'aa'
    })
  })

  describe('replaceAllOccurrencesOutsideVariables', () => {
    /**
     * 替换文本中所有目标字符串 (忽略变量占位符内部)
     */
    const isInsideVariablePlaceholder = (text: string, index: number): boolean => {
      const beforeText = text.substring(0, index)
      const openBraces = (beforeText.match(/\{\{/g) || []).length
      const closeBraces = (beforeText.match(/\}\}/g) || []).length
      return openBraces > closeBraces
    }

    const isOutsideVariableRange = (
      fullText: string,
      start: number,
      length: number
    ): boolean => {
      if (length <= 0) return false
      if (isInsideVariablePlaceholder(fullText, start)) {
        return false
      }
      const endIndex = start + length - 1
      return !isInsideVariablePlaceholder(fullText, endIndex)
    }

    const replaceAllOccurrencesOutsideVariables = (
      fullText: string,
      searchText: string,
      replaceWith: string
    ): string => {
      if (!searchText || !searchText.trim()) return fullText

      let result = fullText
      let position = 0

      while (position < result.length) {
        const index = result.indexOf(searchText, position)
        if (index === -1) break

        if (isOutsideVariableRange(result, index, searchText.length)) {
          result =
            result.substring(0, index) +
            replaceWith +
            result.substring(index + searchText.length)
          position = index + replaceWith.length
        } else {
          position = index + 1
        }
      }

      return result
    }

    it('应该替换纯文本中的所有出现', () => {
      const text = 'test test test'
      const result = replaceAllOccurrencesOutsideVariables(text, 'test', 'replaced')

      expect(result).toBe('replaced replaced replaced')
    })

    it('应该保护变量占位符内部的文本', () => {
      const text = 'test {{test}} test'
      const result = replaceAllOccurrencesOutsideVariables(text, 'test', 'replaced')

      expect(result).toBe('replaced {{test}} replaced')
    })

    it('应该保护变量名不被破坏', () => {
      const text = 'customer {{customer_name}} customer'
      const result = replaceAllOccurrencesOutsideVariables(text, 'customer', '{{user}}')

      expect(result).toBe('{{user}} {{customer_name}} {{user}}')
    })

    it('应该处理空搜索文本', () => {
      const text = 'test {{var}} test'
      const result = replaceAllOccurrencesOutsideVariables(text, '', 'replaced')

      expect(result).toBe(text) // 不应该改变
    })

    it('应该处理无匹配的情况', () => {
      const text = 'test {{var}} test'
      const result = replaceAllOccurrencesOutsideVariables(text, 'nomatch', 'replaced')

      expect(result).toBe(text) // 不应该改变
    })

    it('应该处理替换文本比原文本长的情况', () => {
      const text = 'a {{a}} a'
      const result = replaceAllOccurrencesOutsideVariables(text, 'a', 'longer')

      expect(result).toBe('longer {{a}} longer')
    })

    it('应该处理替换文本比原文本短的情况', () => {
      const text = 'longer {{longer}} longer'
      const result = replaceAllOccurrencesOutsideVariables(text, 'longer', 'a')

      expect(result).toBe('a {{longer}} a')
    })

    it('应该处理多个变量的复杂情况', () => {
      const text = 'name is {{name}} and age is {{age}}, name again'
      const result = replaceAllOccurrencesOutsideVariables(text, 'name', '{{username}}')

      expect(result).toBe('{{username}} is {{name}} and age is {{age}}, {{username}} again')
    })

    it('应该正确处理替换后文本长度变化', () => {
      const text = 'a {{b}} a {{c}} a'
      const result = replaceAllOccurrencesOutsideVariables(text, 'a', 'xxx')

      expect(result).toBe('xxx {{b}} xxx {{c}} xxx')

      // 验证变量占位符没有被破坏
      expect(result).toContain('{{b}}')
      expect(result).toContain('{{c}}')
    })
  })

  describe('边界情况综合测试', () => {
    it('应该处理连续的变量占位符', () => {
      const isInsideVariablePlaceholder = (text: string, index: number): boolean => {
        const beforeText = text.substring(0, index)
        const openBraces = (beforeText.match(/\{\{/g) || []).length
        const closeBraces = (beforeText.match(/\}\}/g) || []).length
        return openBraces > closeBraces
      }

      const text = '{{var1}}{{var2}}{{var3}}'

      expect(isInsideVariablePlaceholder(text, 3)).toBe(true)   // var1 内部
      expect(isInsideVariablePlaceholder(text, 8)).toBe(false)  // var1 和 var2 之间
      expect(isInsideVariablePlaceholder(text, 11)).toBe(true)  // var2 内部
    })

    it('应该处理变量占位符在文本开头', () => {
      const text = '{{var}} text'

      const isInsideVariablePlaceholder = (text: string, index: number): boolean => {
        const beforeText = text.substring(0, index)
        const openBraces = (beforeText.match(/\{\{/g) || []).length
        const closeBraces = (beforeText.match(/\}\}/g) || []).length
        return openBraces > closeBraces
      }

      expect(isInsideVariablePlaceholder(text, 0)).toBe(false)
      expect(isInsideVariablePlaceholder(text, 3)).toBe(true)
      expect(isInsideVariablePlaceholder(text, 7)).toBe(false)
    })

    it('应该处理变量占位符在文本结尾', () => {
      const text = 'text {{var}}'

      const isInsideVariablePlaceholder = (text: string, index: number): boolean => {
        const beforeText = text.substring(0, index)
        const openBraces = (beforeText.match(/\{\{/g) || []).length
        const closeBraces = (beforeText.match(/\}\}/g) || []).length
        return openBraces > closeBraces
      }

      expect(isInsideVariablePlaceholder(text, 4)).toBe(false)
      expect(isInsideVariablePlaceholder(text, 8)).toBe(true)
      expect(isInsideVariablePlaceholder(text, 12)).toBe(false)
    })
  })
})
