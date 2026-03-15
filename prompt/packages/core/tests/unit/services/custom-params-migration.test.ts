import { describe, it, expect, beforeEach } from 'vitest'
import { mergeOverrides } from '../../../src/services/model/parameter-utils'
import type { UnifiedParameterDefinition } from '../../../src/services/model/parameter-schema'

describe('自定义参数迁移测试', () => {
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
    }
  ]

  describe('向后兼容旧格式的 customParamOverrides', () => {
    it('应该合并 customParamOverrides 和 paramOverrides', () => {
      // 模拟旧数据格式：内置参数在 paramOverrides，自定义参数在 customParamOverrides
      const paramOverrides = { temperature: 0.7 }
      const customParamOverrides = { custom_flag: 'test_value', api_version: '2024-01' }

      const merged = mergeOverrides({
        schema,
        includeDefaults: false,
        customOverrides: customParamOverrides,
        requestOverrides: paramOverrides
      })

      // 验证内置参数被正确处理
      expect(merged.temperature).toBe(0.7)

      // 验证自定义参数没有丢失
      expect(merged.custom_flag).toBe('test_value')
      expect(merged.api_version).toBe('2024-01')
    })

    it('requestOverrides 应该覆盖 customOverrides', () => {
      const customParamOverrides = { custom_flag: 'old_value' }
      const paramOverrides = { custom_flag: 'new_value', temperature: 0.8 }

      const merged = mergeOverrides({
        schema,
        includeDefaults: false,
        customOverrides: customParamOverrides,
        requestOverrides: paramOverrides
      })

      // requestOverrides 优先级更高
      expect(merged.custom_flag).toBe('new_value')
      expect(merged.temperature).toBe(0.8)
    })

    it('应该过滤掉空值的自定义参数', () => {
      const customParamOverrides = {
        valid_param: 'value',
        empty_string: '',
        null_value: null,
        undefined_value: undefined
      }

      const merged = mergeOverrides({
        schema,
        includeDefaults: false,
        customOverrides: customParamOverrides as any
      })

      // 只有非空值应该被保留
      expect(merged.valid_param).toBe('value')
      expect(merged.empty_string).toBeUndefined()
      expect(merged.null_value).toBeUndefined()
      expect(merged.undefined_value).toBeUndefined()
    })

    it('应该拒绝危险的自定义参数键名', () => {
      const customParamOverrides = {
        '__proto__': 'dangerous',
        'apiKey': 'should_reject',
        'safe_param': 'ok'
      }

      const merged = mergeOverrides({
        schema,
        includeDefaults: false,
        customOverrides: customParamOverrides
      })

      // 危险参数应该被过滤（不会作为自己的属性存在）
      expect(Object.hasOwn(merged, '__proto__')).toBe(false)
      expect(Object.hasOwn(merged, 'apiKey')).toBe(false)

      // 安全参数应该保留
      expect(merged.safe_param).toBe('ok')
    })
  })

  describe('LLM Service 运行时配置准备', () => {
    it('应该模拟 prepareRuntimeConfig 的行为', () => {
      // 模拟一个旧格式的 TextModelConfig
      const modelConfig = {
        id: 'test',
        name: 'Test Model',
        enabled: true,
        providerMeta: { id: 'test', name: 'Test' } as any,
        modelMeta: {
          id: 'test-model',
          name: 'Test Model',
          providerId: 'test',
          capabilities: {},
          parameterDefinitions: schema
        } as any,
        connectionConfig: {},
        paramOverrides: { temperature: 0.7, max_tokens: 1000 },
        customParamOverrides: {
          custom_header: 'X-Custom-Value',
          extra_param: 'important_value'
        }
      }

      // 模拟 prepareRuntimeConfig 逻辑
      const mergedOverrides = mergeOverrides({
        schema: modelConfig.modelMeta.parameterDefinitions,
        includeDefaults: false,
        customOverrides: modelConfig.customParamOverrides,
        requestOverrides: modelConfig.paramOverrides
      })

      // 验证运行时配置包含所有参数
      expect(mergedOverrides.temperature).toBe(0.7)
      expect(mergedOverrides.max_tokens).toBe(1000)
      expect(mergedOverrides.custom_header).toBe('X-Custom-Value')
      expect(mergedOverrides.extra_param).toBe('important_value')
    })

    it('应该处理已经迁移的新格式配置', () => {
      // 模拟已经迁移的配置：所有参数都在 paramOverrides
      const modelConfig = {
        id: 'test',
        name: 'Test Model',
        enabled: true,
        providerMeta: { id: 'test', name: 'Test' } as any,
        modelMeta: {
          id: 'test-model',
          name: 'Test Model',
          providerId: 'test',
          capabilities: {},
          parameterDefinitions: schema
        } as any,
        connectionConfig: {},
        paramOverrides: {
          temperature: 0.7,
          max_tokens: 1000,
          custom_header: 'X-Custom-Value',
          extra_param: 'important_value'
        },
        customParamOverrides: undefined // 已迁移
      }

      const mergedOverrides = mergeOverrides({
        schema: modelConfig.modelMeta.parameterDefinitions,
        includeDefaults: false,
        customOverrides: modelConfig.customParamOverrides,
        requestOverrides: modelConfig.paramOverrides
      })

      // 新格式也应该正常工作
      expect(mergedOverrides.temperature).toBe(0.7)
      expect(mergedOverrides.max_tokens).toBe(1000)
      expect(mergedOverrides.custom_header).toBe('X-Custom-Value')
      expect(mergedOverrides.extra_param).toBe('important_value')
    })
  })
})
