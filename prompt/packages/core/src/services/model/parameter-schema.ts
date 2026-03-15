/**
 * 统一的参数 Schema 定义
 * 供文本模型与图像模型适配器返回参数元数据使用
 */

/**
 * 危险键名列表（小写比较）
 * - 阻止用户注入原型链或可执行上下文
 */
export const DANGEROUS_PARAM_KEY_PATTERNS = [
  '__proto__',
  'constructor',
  'prototype',
  'eval',
  'exec',
  'script',
  'process',
  'child_process',
  'function',
  'code',
  'apikey',
  'api_key',
  'secret',
  'password',
  'credential',
  'authorization',
  'bearer',
  'token',
  'baseurl',
  'base_url',
  'endpoint',
  'url'
] as const

export type UnifiedParameterValueType = 'string' | 'number' | 'integer' | 'boolean'

/**
 * 统一参数定义
 */
export interface UnifiedParameterDefinition {
  /** SDK 参数名称（必填，唯一） */
  name: string
  /** i18n 标签键 */
  labelKey?: string
  /** i18n 描述键 */
  descriptionKey?: string
  /** 兼容字段：直接提供的描述 */
  description?: string
  /** 参数值类型 */
  type: UnifiedParameterValueType
  /** 默认值（可为空，未定义时不下发） */
  defaultValue?: unknown
  /** 兼容字段：旧版默认值字段 */
  default?: unknown
  /** 数值最小值 */
  minValue?: number
  /** 数值最大值 */
  maxValue?: number
  /** 兼容字段：旧版最小/最大值 */
  min?: number
  max?: number
  /** 数值步长 */
  step?: number
  /** 枚举值列表 */
  allowedValues?: string[]
  /** 枚举值的 i18n 标签键数组 */
  allowedValueLabelKeys?: string[]
  /** 文本单位，如 px、steps */
  unit?: string
  /** 单位 i18n 键 */
  unitKey?: string
  /** 是否必填 */
  required?: boolean
  /** 额外标签，例如 ['safety', 'beta'] */
  tags?: string[]
  /**
   * 默认是否允许发送空字符串
   * - true: 空字符串视为有效值
   * - false/未定义: 空字符串按空值处理
   */
  sendEmptyString?: boolean
}

/**
 * 判断值是否为空（undefined/null/空字符串/空数组）
 */
export function isValueEmpty(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return false
}

/**
 * 规范化默认值
 * - 空值统一转换为 undefined，避免在请求中下发
 */
export function normalizeDefaultValue<T>(value: T): T | undefined {
  if (isValueEmpty(value)) {
    return undefined
  }

  return value
}

/**
 * 检查自定义参数键名是否安全
 * - 不能为空
 * - 不允许包含危险关键字
 * - 不允许存在空白字符
 */
export function isSafeCustomKey(key: string): boolean {
  if (!key) return false

  const trimmed = key.trim()
  if (!trimmed) return false

  // 允许字母、数字、点、下划线、短横线与斜杠
  const allowedPattern = /^[A-Za-z0-9._\-:/]+$/
  if (!allowedPattern.test(trimmed)) {
    return false
  }

  const lower = trimmed.toLowerCase()
  return !DANGEROUS_PARAM_KEY_PATTERNS.some((pattern) => lower.includes(pattern))
}
