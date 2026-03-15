import { advancedParameterDefinitions, AdvancedParameterDefinition } from './advancedParameterDefinitions'
import type { UnifiedParameterDefinition } from './parameter-schema'
import {
  validateOverrides,
  type ParameterValidationError,
  type ParameterValidationWarning
} from './parameter-utils'

export interface LLMValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  parameterName: string
  parameterValue: any
  message: string
  expectedType?: string
  expectedRange?: string
}

export interface ValidationWarning {
  parameterName: string
  parameterValue: any
  message: string
}


/**
 * 验证llmParams中的已知参数（增强安全版本）
 */
export function validateLLMParams(
  llmParams: Record<string, any> | undefined,
  provider: string
): LLMValidationResult {
  const result: LLMValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  if (!llmParams) {
    return result
  }

  const schema = getSupportedParameters(provider).map(mapAdvancedDefinitionToUnified)
  const validationResult = validateOverrides({
    schema,
    overrides: llmParams,
    allowUnknown: true
  })

  if (validationResult.errors.length > 0) {
    result.isValid = false
  }

  result.errors = validationResult.errors.map(mapValidationError)
  result.warnings = validationResult.warnings.map(mapValidationWarning)

  return result
}

/**
 * 获取提供商支持的参数列表
 */
export function getSupportedParameters(provider: string): AdvancedParameterDefinition[] {
  return advancedParameterDefinitions.filter(
    def => def.appliesToProviders.includes(provider)
  )
}

function mapAdvancedDefinitionToUnified(def: AdvancedParameterDefinition): UnifiedParameterDefinition {
  const base: UnifiedParameterDefinition = {
    name: def.name,
    labelKey: def.labelKey,
    descriptionKey: def.descriptionKey,
    type: def.type,
    defaultValue: def.defaultValue,
    minValue: def.minValue,
    maxValue: def.maxValue,
    step: def.step,
    unit: (def as any).unit,
    unitKey: def.unitKey
  }

  if (def.name === 'stopSequences') {
    base.tags = [...(base.tags ?? []), 'string-array']
  }

  return base
}

function mapValidationError(error: ParameterValidationError): ValidationError {
  return {
    parameterName: error.parameterName,
    parameterValue: error.parameterValue,
    message: error.message,
    expectedType: error.expectedType,
    expectedRange: error.expectedRange
  }
}

function mapValidationWarning(warning: ParameterValidationWarning): ValidationWarning {
  return {
    parameterName: warning.parameterName,
    parameterValue: warning.parameterValue,
    message: warning.message
  }
}
