/**
 * 标准化Prompt数据格式
 * 基于OpenAI API格式，扩展支持工具调用等高级功能
 */

// 工具调用相关类型
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface FunctionDefinition {
  name: string
  description?: string
  parameters?: object
}

export interface ToolDefinition {
  type: 'function'
  function: FunctionDefinition
}

// 消息类型定义
export interface StandardMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string              // 工具调用时的函数名或工具名
  tool_calls?: ToolCall[]    // assistant消息中的工具调用
  tool_call_id?: string      // tool消息中关联的工具调用ID
}

// 标准化Prompt数据结构
export interface StandardPromptData {
  messages: StandardMessage[]
  tools?: ToolDefinition[]   // 可用工具定义
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
  stream?: boolean
  // 扩展元数据
  metadata?: {
    source?: 'langfuse' | 'openai' | 'conversation' | 'manual'
    template_info?: {
      name?: string
      version?: string
      variables?: string[]
      [key: string]: unknown
    }
    timestamp?: string
    [key: string]: unknown
  }
}

// LangFuse数据格式（简化版）
export interface LangFuseTrace {
  id: string
  timestamp: string
  name?: string
  input: {
    messages?: StandardMessage[]
    [key: string]: unknown
  }
  output?: {
    content?: string
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
  }
  metadata?: {
    model?: string
    temperature?: number
    [key: string]: unknown
  }
}

// OpenAI请求格式
export interface OpenAIRequest {
  messages: StandardMessage[]
  model: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
  tools?: ToolDefinition[]
  stream?: boolean
}

// 转换结果类型
export interface ConversionResult<T> {
  success: boolean
  data?: T
  error?: string
  warnings?: string[]
}

// 变量提取结果
export interface VariableExtractionResult {
  updatedContent: string
  extractedVariable: {
    name: string
    value: string
    description?: string
  }
}

// 智能变量建议
export interface VariableSuggestion {
  name: string
  confidence: number
  category: 'database' | 'examples' | 'rules' | 'context' | 'input' | 'output' | 'custom'
  description?: string
}
