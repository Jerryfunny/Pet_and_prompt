/**
 * 上下文服务相关常量定义
 */

import type { ContextMode } from './types';

// 存储键
export const CONTEXT_STORE_KEY = 'ctx:store' as const;

// 默认上下文模式
export const DEFAULT_CONTEXT_MODE: ContextMode = 'system' as const;

// 预定义变量列表（与UI包保持一致）
// 这些变量名不允许在上下文变量覆盖中使用
export const PREDEFINED_VARIABLES = [
  'originalPrompt',
  'lastOptimizedPrompt', 
  'iterateInput',
  'currentPrompt',  // 测试阶段使用的当前提示词变量
  'userQuestion',   // 用户问题变量
  'conversationContext',  // 会话上下文变量
  'toolsContext' // 可用工具上下文（由模板处理器/服务注入）
] as const;

export type PredefinedVariable = typeof PREDEFINED_VARIABLES[number];

// 默认上下文配置
export const DEFAULT_CONTEXT_CONFIG = {
  id: 'default',
  title: '默认上下文',
  version: '1.0.0'
} as const;

// 文档版本
export const CONTEXT_STORE_VERSION = '1.0.0' as const;

// UI文本常量
export const CONTEXT_UI_LABELS = {
  /** 默认上下文标题模板 */
  DEFAULT_TITLE_TEMPLATE: '上下文', // 将与日期组合使用
  /** 副本后缀 */
  DUPLICATE_SUFFIX: '(副本)'
} as const;
