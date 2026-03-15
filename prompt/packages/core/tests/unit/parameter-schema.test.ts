import { describe, expect, it } from 'vitest'
import {
  DANGEROUS_PARAM_KEY_PATTERNS,
  isSafeCustomKey,
  isValueEmpty,
  normalizeDefaultValue,
  type UnifiedParameterDefinition
} from '../../src/services/model/parameter-schema'

describe('parameter-schema helpers', () => {
  it('checks empty values correctly', () => {
    expect(isValueEmpty(undefined)).toBe(true)
    expect(isValueEmpty(null)).toBe(true)
    expect(isValueEmpty('')).toBe(true)
    expect(isValueEmpty('   ')).toBe(true)
    expect(isValueEmpty([])).toBe(true)
    expect(isValueEmpty(['value'])).toBe(false)
    expect(isValueEmpty(0)).toBe(false)
    expect(isValueEmpty(false)).toBe(false)
  })

  it('normalizes default values', () => {
    expect(normalizeDefaultValue('')).toBeUndefined()
    expect(normalizeDefaultValue('value')).toBe('value')
    expect(normalizeDefaultValue(null)).toBeUndefined()
    expect(normalizeDefaultValue(undefined)).toBeUndefined()
    expect(normalizeDefaultValue([])).toBeUndefined()
    expect(normalizeDefaultValue(['foo'])).toEqual(['foo'])
  })

  it('validates safe custom keys', () => {
    expect(isSafeCustomKey('temperature')).toBe(true)
    expect(isSafeCustomKey('cfg-scale')).toBe(true)
    expect(isSafeCustomKey('tool.call/limit')).toBe(true)
    expect(isSafeCustomKey('')).toBe(false)
    expect(isSafeCustomKey('  ')).toBe(false)
    expect(isSafeCustomKey('max tokens')).toBe(false)
    expect(isSafeCustomKey('bad$key')).toBe(false)
    expect(isSafeCustomKey('apiKey')).toBe(false)
  })

  it('blocks dangerous key patterns', () => {
    for (const pattern of DANGEROUS_PARAM_KEY_PATTERNS) {
      expect(isSafeCustomKey(pattern)).toBe(false)
      expect(isSafeCustomKey(`prefix.${pattern}`)).toBe(false)
    }
  })

  it('allows interface shape compilation', () => {
    const definition: UnifiedParameterDefinition = {
      name: 'temperature',
      type: 'number',
      defaultValue: 1,
      minValue: 0,
      maxValue: 2,
      step: 0.1,
      labelKey: 'params.temperature.label',
      descriptionKey: 'params.temperature.description',
      required: false,
      unitKey: 'params.temperature.unit',
      tags: ['llm', 'sampling']
    }
    expect(definition.name).toBe('temperature')
  })
})
