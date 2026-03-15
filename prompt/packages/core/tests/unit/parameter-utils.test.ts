import { describe, expect, it } from 'vitest'
import {
  mergeOverrides,
  splitOverridesBySchema,
  validateOverrides
} from '../../src/services/model/parameter-utils'
import type { UnifiedParameterDefinition } from '../../src/services/model/parameter-schema'

const schema: UnifiedParameterDefinition[] = [
  {
    name: 'temperature',
    type: 'number',
    minValue: 0,
    maxValue: 2,
    defaultValue: 1
  },
  {
    name: 'max_tokens',
    type: 'integer',
    minValue: 1,
    maxValue: 40000
  },
  {
    name: 'stopSequences',
    type: 'string',
    tags: ['string-array']
  },
  {
    name: 'mode',
    type: 'string',
    allowedValues: ['fast', 'standard']
  }
]

describe('parameter-utils', () => {
  it('splits overrides by schema', () => {
    const overrides = { temperature: 0.5, custom_flag: true }
    const { builtIn, custom } = splitOverridesBySchema(schema, overrides)
    expect(builtIn).toEqual({ temperature: 0.5 })
    expect(custom).toEqual({ custom_flag: true })
  })

  it('merges overrides with priority request > builtIn > custom', () => {
    const merged = mergeOverrides({
      schema,
      includeDefaults: true,
      customOverrides: { custom_key: 'foo', temperature: 0.4 },
      builtInOverrides: { temperature: 0.7, max_tokens: 1000 },
      requestOverrides: { temperature: 0.9 }
    })

    expect(merged.temperature).toBe(0.9)
    expect(merged.max_tokens).toBe(1000)
    expect(merged.custom_key).toBe('foo')
    expect(merged.mode).toBeUndefined()
  })

  it('omits unsafe custom keys and empty values', () => {
    const merged = mergeOverrides({
      schema,
      customOverrides: { '__proto__': 'bad', empty: '' },
      builtInOverrides: { temperature: '' }
    })
    expect(merged).toEqual({})
  })

  it('validates overrides against schema', () => {
    const { errors, warnings } = validateOverrides({
      schema,
      overrides: { temperature: 3, stopSequences: ['ok', 123], unknown: 1 }
    })

    expect(errors.length).toBe(2)
    expect(errors[0].parameterName).toBe('temperature')
    expect(errors[1].parameterName).toBe('stopSequences')
    expect(warnings.length).toBe(1)
    expect(warnings[0].parameterName).toBe('unknown')
  })

  it('rejects dangerous custom parameters', () => {
    const { errors } = validateOverrides({
      schema,
      overrides: undefined,
      customOverrides: { apiKey: 'secret' }
    })
    expect(errors.length).toBe(1)
    expect(errors[0].parameterName).toBe('apiKey')
  })
})
