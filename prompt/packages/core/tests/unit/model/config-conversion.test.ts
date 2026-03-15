import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  convertLegacyToTextModelConfig,
  convertLegacyToTextModelConfigWithRegistry,
  isLegacyConfig,
  isTextModelConfig
} from '../../../src/services/model/converter';
import { TextAdapterRegistry } from '../../../src/services/llm/adapters/registry';
import type { ModelConfig, TextModelConfig } from '../../../src/services/model/types';

describe('Config Conversion', () => {
  let registry: TextAdapterRegistry;

  beforeEach(() => {
    registry = new TextAdapterRegistry();
  });

  describe('isLegacyConfig', () => {
    it('should identify legacy ModelConfig', () => {
      const legacyConfig: ModelConfig = {
        name: 'OpenAI',
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        models: ['gpt-4o-mini'],
        defaultModel: 'gpt-4o-mini',
        enabled: true,
        llmParams: {}
      };

      expect(isLegacyConfig(legacyConfig)).toBe(true);
    });

    it('should reject TextModelConfig as legacy', () => {
      const newConfig: TextModelConfig = {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        providerMeta: {
          id: 'openai',
          name: 'OpenAI',
          description: 'Test',
          requiresApiKey: true,
          defaultBaseURL: 'https://api.openai.com/v1',
          supportsDynamicModels: true,
          connectionSchema: {
            required: ['apiKey'],
            optional: [],
            fieldTypes: { apiKey: 'string' }
          }
        },
        modelMeta: {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          description: 'Test',
          providerId: 'openai',
          capabilities: {
                        supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 128000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      expect(isLegacyConfig(newConfig)).toBe(false);
    });
  });

  describe('isTextModelConfig', () => {
    it('should identify TextModelConfig', () => {
      const newConfig: TextModelConfig = {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        providerMeta: {
          id: 'openai',
          name: 'OpenAI',
          description: 'Test',
          requiresApiKey: true,
          defaultBaseURL: 'https://api.openai.com/v1',
          supportsDynamicModels: true,
          connectionSchema: {
            required: ['apiKey'],
            optional: [],
            fieldTypes: { apiKey: 'string' }
          }
        },
        modelMeta: {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          description: 'Test',
          providerId: 'openai',
          capabilities: {
                        supportsTools: true,
            supportsReasoning: false,
            maxContextLength: 128000
          },
          parameterDefinitions: [],
          defaultParameterValues: {}
        },
        connectionConfig: {
          apiKey: 'test-key'
        },
        paramOverrides: {}
      };

      expect(isTextModelConfig(newConfig)).toBe(true);
    });

    it('should reject legacy config as TextModelConfig', () => {
      const legacyConfig: ModelConfig = {
        name: 'OpenAI',
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        models: ['gpt-4o-mini'],
        defaultModel: 'gpt-4o-mini',
        enabled: true
      };

      expect(isTextModelConfig(legacyConfig)).toBe(false);
    });
  });

  describe('convertLegacyToTextModelConfig (fallback)', () => {
    it('should convert OpenAI legacy config', () => {
      const legacyConfig: ModelConfig = {
        name: 'OpenAI',
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-openai-key',
        models: ['gpt-4o-mini'],
        defaultModel: 'gpt-4o-mini',
        enabled: true,
        llmParams: { temperature: 0.7 }
      };

      const result = convertLegacyToTextModelConfig('openai', legacyConfig);

      expect(result.id).toBe('openai');
      expect(result.name).toBe('OpenAI');
      expect(result.enabled).toBe(true);
      expect(result.providerMeta.id).toBe('openai');
      expect(result.modelMeta.id).toBe('gpt-4o-mini');
      expect(result.connectionConfig.apiKey).toBe('test-openai-key');
      expect(result.connectionConfig.baseURL).toBe('https://api.openai.com/v1');
      expect(result.paramOverrides).toEqual({ temperature: 0.7 });
    });

    it('should convert Gemini legacy config', () => {
      const legacyConfig: ModelConfig = {
        name: 'Gemini',
        provider: 'gemini',
        baseURL: 'https://generativelanguage.googleapis.com',
        apiKey: 'test-gemini-key',
        models: ['gemini-2.0-flash'],
        defaultModel: 'gemini-2.0-flash',
        enabled: true
      };

      const result = convertLegacyToTextModelConfig('gemini', legacyConfig);

      expect(result.providerMeta.id).toBe('gemini');
      expect(result.modelMeta.id).toBe('gemini-2.0-flash');
      expect(result.modelMeta.providerId).toBe('gemini');
    });

    it('should convert Anthropic legacy config', () => {
      const legacyConfig: ModelConfig = {
        name: 'Anthropic',
        provider: 'anthropic',
        baseURL: 'https://api.anthropic.com/v1',
        apiKey: 'test-anthropic-key',
        models: ['claude-3-5-sonnet-20241022'],
        defaultModel: 'claude-3-5-sonnet-20241022',
        enabled: true
      };

      const result = convertLegacyToTextModelConfig('anthropic', legacyConfig);

      expect(result.providerMeta.id).toBe('anthropic');
      expect(result.modelMeta.providerId).toBe('anthropic');
    });

    it('should convert DeepSeek using DeepSeek adapter metadata', () => {
      const legacyConfig: ModelConfig = {
        name: 'DeepSeek',
        provider: 'deepseek',
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: 'test-deepseek-key',
        models: ['deepseek-chat'],
        defaultModel: 'deepseek-chat',
        enabled: true
      };

      const result = convertLegacyToTextModelConfig('deepseek', legacyConfig);

      expect(result.providerMeta.id).toBe('deepseek');
      expect(result.modelMeta.providerId).toBe('deepseek');
    });

    it('should preserve all legacy fields', () => {
      const legacyConfig: ModelConfig = {
        name: 'Custom Model',
        provider: 'custom',
        baseURL: 'https://custom.api.com/v1',
        apiKey: 'custom-key',
        models: ['custom-model'],
        defaultModel: 'custom-model',
        enabled: false,
        llmParams: {
          temperature: 0.9,
          max_tokens: 2000
        }
      };

      const result = convertLegacyToTextModelConfig('custom', legacyConfig);

      expect(result.name).toBe('Custom Model');
      expect(result.enabled).toBe(false);
      expect(result.connectionConfig.apiKey).toBe('custom-key');
      expect(result.connectionConfig.baseURL).toBe('https://custom.api.com/v1');
      expect(result.paramOverrides).toEqual({
        temperature: 0.9,
        max_tokens: 2000
      });
    });
  });

  describe('convertLegacyToTextModelConfigWithRegistry', () => {
    it('should convert using Registry adapters', async () => {
      const legacyConfig: ModelConfig = {
        name: 'OpenAI',
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        models: ['gpt-4o-mini'],
        defaultModel: 'gpt-4o-mini',
        enabled: true
      };

      const result = await convertLegacyToTextModelConfigWithRegistry(
        'openai',
        legacyConfig,
        registry
      );

      expect(result.providerMeta.id).toBe('openai');
      expect(result.modelMeta.id).toBe('gpt-4o-mini');

      // Verify metadata comes from Adapter
      const adapter = registry.getAdapter('openai');
      const expectedProvider = adapter.getProvider();
      expect(result.providerMeta.name).toBe(expectedProvider.name);
      expect(result.providerMeta.defaultBaseURL).toBe(expectedProvider.defaultBaseURL);
    });

    it('should use buildDefaultModel for unknown models', async () => {
      const legacyConfig: ModelConfig = {
        name: 'OpenAI',
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        models: ['unknown-model-xyz'],
        defaultModel: 'unknown-model-xyz',
        enabled: true
      };

      const result = await convertLegacyToTextModelConfigWithRegistry(
        'openai',
        legacyConfig,
        registry
      );

      expect(result.modelMeta.id).toBe('unknown-model-xyz');
      expect(result.modelMeta.providerId).toBe('openai');
      expect(result.modelMeta.capabilities).toBeDefined();
    });

    it('should fallback to OpenAI on error', async () => {
      const legacyConfig: ModelConfig = {
        name: 'Invalid',
        provider: 'openai' as any, // 使用 openai 但让 adapter 抛出错误
        baseURL: 'https://invalid.com',
        apiKey: 'test-key',
        models: ['test-model'],
        defaultModel: 'test-model',
        enabled: true
      };

      // 创建一个 mock registry，第一次调用 getAdapter 时抛出错误
      // 但第二次（fallback时）能成功返回 openai adapter
      let callCount = 0;
      const mockRegistry = {
        getAdapter: (providerId: string) => {
          callCount++;
          if (callCount === 1) {
            // 第一次调用：模拟 getModelById 抛出错误
            const mockAdapter = {
              getProvider: () => registry.getAdapter('openai').getProvider(),
              getModels: () => {
                throw new Error('Simulated error: model lookup failed');
              },
              buildDefaultModel: (modelId: string) => {
                throw new Error('Simulated error: buildDefaultModel failed');
              }
            };
            return mockAdapter as any;
          } else {
            // 第二次调用（fallback）：返回真实的 openai adapter
            return registry.getAdapter('openai');
          }
        }
      } as any;

      const result = await convertLegacyToTextModelConfigWithRegistry(
        'invalid',
        legacyConfig,
        mockRegistry
      );

      // Should fallback to OpenAI and disable
      expect(result.providerMeta.id).toBe('openai');
      expect(result.enabled).toBe(false);
    });
  });

  describe('conversion idempotency', () => {
    it('should produce same result on multiple conversions', () => {
      const legacyConfig: ModelConfig = {
        name: 'OpenAI',
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        models: ['gpt-4o-mini'],
        defaultModel: 'gpt-4o-mini',
        enabled: true,
        llmParams: { temperature: 0.8 }
      };

      const result1 = convertLegacyToTextModelConfig('openai', legacyConfig);
      const result2 = convertLegacyToTextModelConfig('openai', legacyConfig);

      expect(result1).toEqual(result2);
    });
  });
});
