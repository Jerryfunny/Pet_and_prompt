/**
 * 通用选择器选项接口
 * 用于SelectWithConfig组件的强类型数据结构
 */
export interface SelectOption<T = unknown> {
  /** 主要显示文本 */
  primary: string
  /** 次要显示文本（可选） */
  secondary: string
  /** 选择器的值 */
  value: string
  /** 原始数据对象 */
  raw: T
  /** 向后兼容的标签字段（可选） */
  label?: string
}

/**
 * 模型配置选项
 * 专用于模型选择器的类型定义
 */
export interface ModelSelectOption extends SelectOption<import('@prompt-optimizer/core').TextModelConfig> {
  /** 模型名称 */
  primary: string
  /** 提供商名称 */
  secondary: string
  /** 模型键值 */
  value: string
  /** 原始模型配置 */
  raw: import('@prompt-optimizer/core').TextModelConfig
}

/**
 * 模板配置选项
 * 专用于模板选择器的类型定义
 */
export interface TemplateSelectOption extends SelectOption<import('@prompt-optimizer/core').Template> {
  /** 模板名称 */
  primary: string
  /** 模板描述 */
  secondary: string
  /** 模板ID */
  value: string
  /** 原始模板配置 */
  raw: import('@prompt-optimizer/core').Template
}

