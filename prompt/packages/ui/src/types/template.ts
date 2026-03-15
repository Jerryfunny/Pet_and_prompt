/**
 * Template related type definitions
 * Contains types for template processing and variables
 */

/**
 * Variable primitive type
 */
export type VariablePrimitiveType = 'string' | 'number' | 'boolean' | 'object' | 'array'

/**
 * Variable default value type
 */
export type VariableDefaultValue = string | number | boolean | Record<string, unknown> | unknown[]

/**
 * Variable definition interface
 */
export interface VariableDefinition {
  /** Variable name */
  name: string
  /** Variable type */
  type: VariablePrimitiveType
  /** Variable description */
  description?: string
  /** Default value */
  defaultValue?: VariableDefaultValue
  /** Whether required */
  required?: boolean
}

/**
 * Variable analysis interface
 */
export interface VariableAnalysis {
  /** Variable type */
  type: VariablePrimitiveType
  /** Variable description */
  description?: string
  /** Default value */
  defaultValue?: VariableDefaultValue
  /** Whether required */
  required: boolean
}

/**
 * Variable usage statistics interface
 */
export interface VariableUsageStats {
  /** Usage count */
  count: number
  /** Average length */
  avgLength: number
  /** Complexity */
  complexity: number
  /** Context list */
  contexts: string[]
}
