/**
 * 智能变量提取器实现
 */

import type { VariableExtractor } from '../types'

// 内置常见变量名库
const COMMON_VARIABLES = {
  database: [
    'table_schema', 'database_structure', 'table_info', 'sql_context', 
    'schema_definition', 'table_structure', 'db_schema', 'database_context'
  ],
  examples: [
    'example_data', 'sample_input', 'demo_case', 'reference_examples',
    'sample_data', 'example_queries', 'demo_input', 'use_cases'
  ],
  rules: [
    'business_rules', 'constraints', 'requirements', 'guidelines',
    'validation_rules', 'business_logic', 'policy_rules', 'restrictions'
  ],
  context: [
    'background_info', 'system_context', 'domain_knowledge', 'context_info',
    'background_context', 'system_info', 'domain_context', 'additional_context'
  ],
  input: [
    'user_question', 'query_text', 'user_input', 'current_request',
    'user_query', 'input_text', 'question', 'request_content'
  ],
  output: [
    'expected_format', 'output_template', 'response_format', 'result_format',
    'output_structure', 'response_template', 'expected_output', 'format_specification'
  ]
} as const

// 关键词匹配模式
const KEYWORD_PATTERNS = {
  database: /(?:table|schema|database|sql|create\s+table|alter\s+table|column|field|index|primary\s+key|foreign\s+key)/i,
  examples: /(?:example|sample|demo|case|instance|illustration|for\s+example|such\s+as)/i,
  rules: /(?:rule|constraint|requirement|must|should|policy|guideline|restriction|validation|business\s+logic)/i,
  context: /(?:context|background|information|about|regarding|concerning|domain|system)/i,
  input: /(?:input|question|query|request|ask|problem|task|what|how|when|where|why)/i,
  output: /(?:output|result|response|format|structure|return|produce|generate)/i
} as const

export class SmartVariableExtractor implements VariableExtractor {
  /**
   * 从选中文本提取变量
   */
  extractVariable(
    messageContent: string,
    selectedText: string,
    variableName: string,
    startIndex: number,
    endIndex: number
  ): {
    updatedContent: string
    extractedVariable: {
      name: string
      value: string
      startIndex: number
      endIndex: number
    }
  } {
    // 验证变量名
    if (!this.isValidVariableName(variableName)) {
      throw new Error(`Invalid variable name: ${variableName}`)
    }

    // 验证选择范围
    if (startIndex < 0 || endIndex > messageContent.length || startIndex >= endIndex) {
      throw new Error('Invalid selection range')
    }

    // 验证选中文本匹配
    const actualSelectedText = messageContent.substring(startIndex, endIndex)
    if (actualSelectedText !== selectedText) {
      throw new Error('Selected text does not match the specified range')
    }

    // 替换选中文本为变量占位符
    const placeholder = `{{${variableName}}}`
    const updatedContent = messageContent.substring(0, startIndex) + 
                          placeholder + 
                          messageContent.substring(endIndex)

    return {
      updatedContent,
      extractedVariable: {
        name: variableName,
        value: selectedText,
        startIndex,
        endIndex
      }
    }
  }

  /**
   * 智能建议变量名
   */
  suggestVariableNames(selectedText: string): Array<{
    name: string
    confidence: number
    category: string
    reason: string
  }> {
    const suggestions: Array<{
      name: string
      confidence: number
      category: string
      reason: string
    }> = []

    // 基于关键词模式匹配
    for (const [category, pattern] of Object.entries(KEYWORD_PATTERNS)) {
      if (pattern.test(selectedText)) {
        const categoryVariables = COMMON_VARIABLES[category as keyof typeof COMMON_VARIABLES]
        const confidence = this.calculatePatternConfidence(selectedText, pattern)
        
        // 添加该类别的变量建议
        categoryVariables.slice(0, 3).forEach((name, index) => {
          suggestions.push({
            name,
            confidence: confidence - (index * 0.1), // 按优先级递减
            category,
            reason: `Detected ${category}-related content`
          })
        })
      }
    }

    // 基于长度和内容特征的通用建议
    if (selectedText.length > 200) {
      suggestions.push({
        name: 'long_context',
        confidence: 0.6,
        category: 'context',
        reason: 'Long text content detected'
      })
    }

    if (selectedText.includes('\n') && selectedText.split('\n').length > 3) {
      suggestions.push({
        name: 'multiline_content',
        confidence: 0.7,
        category: 'context',
        reason: 'Multi-line structured content'
      })
    }

    // JSON格式检测
    if (this.looksLikeJSON(selectedText)) {
      suggestions.push({
        name: 'json_data',
        confidence: 0.8,
        category: 'input',
        reason: 'JSON format detected'
      })
    }

    // 去重并按置信度排序
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions)
    return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 8)
  }

  /**
   * 替换变量为实际值
   */
  replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content
    
    for (const [name, value] of Object.entries(variables)) {
      // 匹配 {{variableName}} 格式，允许空格
      const pattern = new RegExp(`\\{\\{\\s*${this.escapeRegExp(name)}\\s*\\}\\}`, 'g')
      result = result.replace(pattern, value)
    }

    return result
  }

  /**
   * 扫描内容中的变量占位符
   */
  scanVariables(content: string): Array<{
    name: string
    placeholder: string
    positions: Array<{start: number, end: number}>
  }> {
    const variables = new Map<string, {
      placeholder: string
      positions: Array<{start: number, end: number}>
    }>()

    // 匹配所有 {{variableName}} 格式
    const pattern = /\{\{\s*([^}]+)\s*\}\}/g
    let match: RegExpExecArray | null

    while ((match = pattern.exec(content)) !== null) {
      const fullMatch = match[0]
      const variableName = match[1].trim()
      const start = match.index
      const end = match.index + fullMatch.length

      if (!variables.has(variableName)) {
        variables.set(variableName, {
          placeholder: fullMatch,
          positions: []
        })
      }

      variables.get(variableName)!.positions.push({ start, end })
    }

    // 转换为数组格式
    return Array.from(variables.entries()).map(([name, data]) => ({
      name,
      placeholder: data.placeholder,
      positions: data.positions
    }))
  }

  // 私有方法：验证变量名是否有效
  private isValidVariableName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) && name.length <= 50
  }

  // 私有方法：计算模式匹配置信度
  private calculatePatternConfidence(text: string, pattern: RegExp): number {
    const matches = text.match(new RegExp(pattern.source, 'gi'))
    if (!matches) return 0

    const matchCount = matches.length
    const textLength = text.length
    const matchDensity = matchCount / Math.max(textLength / 100, 1) // 每100字符的匹配数

    // 基础置信度 + 密度奖励，最大1.0
    return Math.min(0.5 + Math.min(matchDensity * 0.3, 0.5), 1.0)
  }

  // 私有方法：检测是否像JSON
  private looksLikeJSON(text: string): boolean {
    const trimmed = text.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed)
        return true
      } catch {
        return false
      }
    }
    return false
  }

  // 私有方法：去重建议
  private deduplicateSuggestions(suggestions: Array<{
    name: string
    confidence: number
    category: string
    reason: string
  }>): Array<{
    name: string
    confidence: number
    category: string
    reason: string
  }> {
    const seen = new Set<string>()
    return suggestions.filter(suggestion => {
      if (seen.has(suggestion.name)) {
        return false
      }
      seen.add(suggestion.name)
      return true
    })
  }

  // 私有方法：转义正则表达式特殊字符
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}