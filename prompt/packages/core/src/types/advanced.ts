/**
 * 高级模块相关类型定义
 * 整合变量管理、工具调用、上下文管理等高级功能的类型支持
 */

import type {
  ConversationMessage,
  OptimizationRequest,
  CustomConversationRequest,
  ToolDefinition,
  FunctionDefinition,
  ToolCall,
  OptimizationMode
} from '../services/prompt/types';

import type {
  LLMResponse,
  StreamHandlers,
  Message,
  MessageRole
} from '../services/llm/types';

// 重导出核心类型，避免重复定义
export type {
  ConversationMessage,
  OptimizationRequest,
  CustomConversationRequest,
  ToolDefinition,
  FunctionDefinition,
  ToolCall,
  OptimizationMode,
  LLMResponse,
  StreamHandlers,
  Message,
  MessageRole
};

/**
 * 变量管理相关类型
 */
export interface VariableDefinition {
  /** 变量名称 */
  name: string;
  /** 变量值 */
  value: string;
  /** 变量类型：预定义或自定义 */
  type: 'predefined' | 'custom';
  /** 变量描述（可选） */
  description?: string;
  /** 是否为必填变量 */
  required?: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 变量导入导出数据格式
 */
export interface VariableExportData {
  /** 导出版本号 */
  version: string;
  /** 导出时间 */
  exportedAt: string;
  /** 变量数据 */
  variables: Omit<VariableDefinition, 'createdAt' | 'updatedAt'>[];
}

/**
 * 变量导入选项
 */
export interface VariableImportOptions {
  /** 是否覆盖同名变量 */
  overwriteExisting: boolean;
  /** 是否验证变量名格式 */
  validateNames: boolean;
  /** 是否跳过空值变量 */
  skipEmpty: boolean;
}

/**
 * 变量管理器接口
 */
export interface IVariableManager {
  /** 获取所有变量（预定义 + 自定义） */
  getAllVariables(): Record<string, string>;
  
  /** 获取自定义变量 */
  getCustomVariables(): Record<string, string>;
  
  /** 设置自定义变量 */
  setVariable(name: string, value: string): void;
  
  /** 删除自定义变量 */
  deleteVariable(name: string): void;
  
  /** 清空所有自定义变量 */
  clearCustomVariables(): void;
  
  /** 导入变量 */
  importVariables(data: VariableExportData, options?: VariableImportOptions): Promise<void>;
  
  /** 导出变量 */
  exportVariables(): VariableExportData;
  
  /** 扫描内容中的变量引用 */
  scanVariablesInContent(content: string): string[];
  
  /** 替换内容中的变量 */
  replaceVariables(content: string, variables?: Record<string, string>): string;
  
  /** 验证变量名格式 */
  validateVariableName(name: string): boolean;
}

/**
 * 上下文管理相关类型
 */
export interface ContextTemplate {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 消息模板 */
  messages: ConversationMessage[];
  /** 预设变量 */
  defaultVariables?: Record<string, string>;
  /** 预设工具 */
  defaultTools?: ToolDefinition[];
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 上下文编辑器状态
 */
export interface ContextEditorState {
  /** 当前消息列表 */
  messages: ConversationMessage[];
  /**
   * 当前变量
   * @deprecated 已迁移到 useTemporaryVariables() 和 useVariableManager()，此字段保留仅为向后兼容
   */
  variables?: Record<string, string>;
  /** 当前工具 */
  tools: ToolDefinition[];
  /** 是否显示变量预览 */
  showVariablePreview: boolean;
  /** 是否显示工具管理 */
  showToolManager: boolean;
  /** 编辑器模式 */
  mode: 'edit' | 'preview';
}

/**
 * Apply to Test 同步数据
 */
export interface ApplyToTestData {
  /** 优化模式 */
  optimizationMode: OptimizationMode;
  /** 当前提示词 */
  currentPrompt: string;
  /** 变量数据 */
  variables: Record<string, string>;
  /** 工具定义 */
  tools?: ToolDefinition[];
  /** 上下文消息（如果有） */
  contextMessages?: ConversationMessage[];
}

/**
 * 工具调用结果显示相关类型
 */
export interface ToolCallResult {
  /** 工具调用信息 */
  toolCall: ToolCall;
  /** 调用结果（如果有） */
  result?: any;
  /** 调用状态 */
  status: 'pending' | 'success' | 'error';
  /** 错误信息（如果有） */
  error?: string;
  /** 调用时间 */
  timestamp: Date;
}

/**
 * 测试结果中的高级信息
 */
export interface AdvancedTestResult {
  /** 基础响应内容 */
  content: string;
  /** 推理过程（如果支持） */
  reasoning?: string;
  /** 工具调用结果 */
  toolCalls?: ToolCallResult[];
  /** 使用的变量 */
  usedVariables?: Record<string, string>;
  /** 元数据信息 */
  metadata?: {
    model?: string;
    tokens?: number;
    finishReason?: string;
    hasTools?: boolean;
    toolCount?: number;
  };
}

/**
 * UI 组件状态相关类型
 */
export interface ComponentVisibility {
  /** 变量管理器可见性 */
  variableManager: boolean;
  /** 工具管理器可见性 */
  toolManager: boolean;
  /** 上下文编辑器可见性 */
  contextEditor: boolean;
  /** 高级测试面板可见性 */
  advancedTestPanel: boolean;
}

/**
 * 高级模式全局状态
 */
export interface AdvancedModuleState {
  /** 是否启用高级模式 */
  enabled: boolean;
  /** 当前活跃的功能 */
  activeFeature: 'variables' | 'tools' | 'context' | null;
  /** 组件可见性状态 */
  visibility: ComponentVisibility;
  /** 当前编辑的数据 */
  currentData: {
    variables: Record<string, string>;
    tools: ToolDefinition[];
    messages: ConversationMessage[];
  };
}

/**
 * 错误处理相关类型
 */
export class AdvancedModuleError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AdvancedModuleError';
  }
}

/**
 * 变量验证错误
 */
export class VariableValidationError extends AdvancedModuleError {
  constructor(variableName: string, reason: string) {
    super(`Variable validation failed: ${variableName} - ${reason}`, 'VARIABLE_VALIDATION_ERROR');
  }
}

/**
 * 工具调用错误
 */
export class ToolCallError extends AdvancedModuleError {
  constructor(toolName: string, reason: string) {
    super(`Tool call failed: ${toolName} - ${reason}`, 'TOOL_CALL_ERROR');
  }
}