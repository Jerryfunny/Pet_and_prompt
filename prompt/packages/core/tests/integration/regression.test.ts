import { describe, it, expect, beforeEach } from 'vitest';
import { ModelManager } from '../../src/services/model/manager';
import { createLLMService } from '../../src/services/llm/service';
import { MemoryStorageProvider } from '../../src/services/storage/memoryStorageProvider';
import { TextAdapterRegistry } from '../../src/services/llm/adapters/registry';
import type { ModelConfig, TextModelConfig } from '../../src/services/model/types';

/**
 * 回归测试 - 验证新架构不破坏现有功能
 *
 * 测试重点:
 * 1. API兼容性: createLLMService、ModelManager等核心API保持不变
 * 2. 配置兼容性: 支持传统ModelConfig自动转换
 * 3. 功能完整性: sendMessage、sendMessageStream等核心功能正常
 */
describe('架构重构回归测试', () => {
  let storage: MemoryStorageProvider;
  let registry: TextAdapterRegistry;

  beforeEach(async () => {
    storage = new MemoryStorageProvider();
    registry = new TextAdapterRegistry();
    await storage.clearAll();
  });

  describe('API兼容性', () => {
    it('createLLMService应该成功创建服务实例', () => {
      const modelManager = new ModelManager(storage);
      const llmService = createLLMService(modelManager);

      expect(llmService).toBeDefined();
      expect(typeof llmService.sendMessage).toBe('function');
      expect(typeof llmService.sendMessageStream).toBe('function');
    });

    it('ModelManager应该保持原有API', async () => {
      const modelManager = new ModelManager(storage, registry);
      

      // 验证核心方法存在
      expect(typeof modelManager.getModel).toBe('function');
      expect(typeof modelManager.getAllModels).toBe('function');
      expect(typeof modelManager.addModel).toBe('function');
      expect(typeof modelManager.updateModel).toBe('function');
      expect(typeof modelManager.deleteModel).toBe('function');
    });
  });

  describe('配置兼容性', () => {
    it('应该支持传统ModelConfig格式(自动转换)', async () => {
      const legacyConfig: ModelConfig = {
        name: 'Test OpenAI',
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        models: ['gpt-5-2025-08-07'],
        defaultModel: 'gpt-5-2025-08-07',
        enabled: true,
        llmParams: {
          temperature: 0.7
        }
      };

      const modelsData = { test: legacyConfig };
      await storage.setItem('models', JSON.stringify(modelsData));

      const modelManager = new ModelManager(storage, registry);

      const config = await modelManager.getModel('test');
      expect(config).toBeDefined();
      expect(config.name).toBe('Test OpenAI');
      expect(config.enabled).toBe(true);
    });

    it('应该支持新TextModelConfig格式', async () => {
      const adapter = registry.getAdapter('openai');
      const newConfig: TextModelConfig = {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[0],
        connectionConfig: {
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      const modelsData = { openai: newConfig };
      await storage.setItem('models', JSON.stringify(modelsData));

      const modelManager = new ModelManager(storage, registry);
      

      const config = await modelManager.getModel('openai') as TextModelConfig;
      expect(config).toBeDefined();
      expect(config.providerMeta).toBeDefined();
      expect(config.modelMeta).toBeDefined();
    });

    it('应该支持混合格式(传统+新格式共存)', async () => {
      const legacyConfig: ModelConfig = {
        name: 'Legacy Model',
        provider: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'legacy-key',
        models: ['gpt-3.5-turbo'],
        defaultModel: 'gpt-3.5-turbo',
        enabled: true
      };

      const adapter = registry.getAdapter('gemini');
      const newConfig: TextModelConfig = {
        id: 'gemini',
        name: 'Gemini',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[0],
        connectionConfig: {
          apiKey: 'gemini-key'
        },
        paramOverrides: {}
      };

      const modelsData = {
        legacy: legacyConfig,
        gemini: newConfig
      };
      await storage.setItem('models', JSON.stringify(modelsData));

      const modelManager = new ModelManager(storage, registry);
      

      const legacyResult = await modelManager.getModel('legacy');
      const newResult = await modelManager.getModel('gemini');

      expect(legacyResult).toBeDefined();
      expect(newResult).toBeDefined();
      expect(legacyResult.name).toBe('Legacy Model');
      expect(newResult.name).toBe('Gemini');
    });
  });

  describe('ModelManager核心功能', () => {
    it('addModel应该正常工作', async () => {
      const modelManager = new ModelManager(storage, registry);
      

      const adapter = registry.getAdapter('openai');
      const config: TextModelConfig = {
        id: 'new-model',
        name: 'New Model',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[0],
        connectionConfig: {
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      await modelManager.addModel('new-model', config);

      const result = await modelManager.getModel('new-model');
      expect(result).toBeDefined();
      expect(result.id).toBe('new-model');
    });

    it('updateModel应该正常工作', async () => {
      const adapter = registry.getAdapter('openai');
      const config: TextModelConfig = {
        id: 'test',
        name: 'Original Name',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[0],
        connectionConfig: {
          apiKey: 'original-key',
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      await storage.setItem('models', JSON.stringify({ test: config }));

      const modelManager = new ModelManager(storage, registry);
      

      await modelManager.updateModel('test', {
        name: 'Updated Name',
        connectionConfig: {
          apiKey: 'updated-key',
          baseURL: 'https://api.openai.com/v1'
        }
      });

      const result = await modelManager.getModel('test') as TextModelConfig;
      expect(result.name).toBe('Updated Name');
      expect(result.connectionConfig.apiKey).toBe('updated-key');
    });

    it('deleteModel应该正常工作', async () => {
      const adapter = registry.getAdapter('openai');
      const config: TextModelConfig = {
        id: 'test',
        name: 'Test',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[0],
        connectionConfig: {
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      await storage.setItem('models', JSON.stringify({ test: config }));

      const modelManager = new ModelManager(storage, registry);
      

      await modelManager.deleteModel('test');

      const result = await modelManager.getModel('test');
      expect(result).toBeUndefined();
    });

    it('getAllModels应该返回所有模型', async () => {
      const adapter = registry.getAdapter('openai');
      const config1: TextModelConfig = {
        id: 'model1',
        name: 'Model 1',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[0],
        connectionConfig: { apiKey: 'key1', baseURL: 'https://api.openai.com/v1' },
        paramOverrides: {}
      };

      const config2: TextModelConfig = {
        id: 'model2',
        name: 'Model 2',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[1] || adapter.getModels()[0],
        connectionConfig: { apiKey: 'key2', baseURL: 'https://api.openai.com/v1' },
        paramOverrides: {}
      };

      await storage.setItem('models', JSON.stringify({ model1: config1, model2: config2 }));

      const modelManager = new ModelManager(storage, registry);
      

      const allModels = await modelManager.getAllModels();
      // 新架构返回数组，并且会自动添加默认模型
      expect(allModels.length).toBeGreaterThanOrEqual(2);
      expect(allModels.find(m => m.id === 'model1')).toBeDefined();
      expect(allModels.find(m => m.id === 'model2')).toBeDefined();
    });
  });

  describe('持久化兼容性', () => {
    it('配置应该正确保存到Storage', async () => {
      const modelManager = new ModelManager(storage, registry);
      

      const adapter = registry.getAdapter('openai');
      const config: TextModelConfig = {
        id: 'persist-test',
        name: 'Persist Test',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[0],
        connectionConfig: {
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: { temperature: 0.5 }
      };

      await modelManager.addModel('persist-test', config);

      // 验证Storage中的数据
      const storedRaw = await storage.getItem('models');
      const storedModels = JSON.parse(storedRaw!);
      expect(storedModels['persist-test']).toBeDefined();
      expect(storedModels['persist-test'].name).toBe('Persist Test');
      expect(storedModels['persist-test'].paramOverrides.temperature).toBe(0.5);
    });

    it('重新加载后配置应该保持一致', async () => {
      const adapter = registry.getAdapter('openai');
      const config: TextModelConfig = {
        id: 'reload-test',
        name: 'Reload Test',
        enabled: true,
        providerMeta: adapter.getProvider(),
        modelMeta: adapter.getModels()[0],
        connectionConfig: {
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1'
        },
        paramOverrides: {}
      };

      await storage.setItem('models', JSON.stringify({ 'reload-test': config }));

      // 第一次加载
      const modelManager1 = new ModelManager(storage, registry);
      const config1 = await modelManager1.getModel('reload-test');

      // 第二次加载
      const modelManager2 = new ModelManager(storage, registry);
      const config2 = await modelManager2.getModel('reload-test');

      expect(config1).toEqual(config2);
    });
  });

  describe('多Provider支持', () => {
    it('应该支持所有Provider类型', async () => {
      const providers = ['openai', 'gemini', 'anthropic'] as const;
      const modelManager = new ModelManager(storage, registry);


      for (const providerId of providers) {
        const adapter = registry.getAdapter(providerId);
        // 使用唯一的 key 避免与默认模型冲突
        const modelKey = `test-${providerId}`;
        const config: TextModelConfig = {
          id: modelKey,
          name: `${providerId} Model`,
          enabled: true,
          providerMeta: adapter.getProvider(),
          modelMeta: adapter.getModels()[0],
          connectionConfig: {
            apiKey: `${providerId}-key`
          },
          paramOverrides: {}
        };

        await modelManager.addModel(modelKey, config);
        const result = await modelManager.getModel(modelKey);
        expect(result).toBeDefined();
        expect(result.providerMeta.id).toBe(providerId);
      }
    });

    it('应该为OpenAI兼容Provider加载对应Adapter', async () => {
      const providerExpectations = [
        ['deepseek', 'deepseek'],
        ['zhipu', 'zhipu'],
        ['siliconflow', 'siliconflow'],
        ['custom', 'openai']
      ] as const;

      for (const [provider, expectedProviderId] of providerExpectations) {
        const legacyConfig: ModelConfig = {
          name: `${provider} Model`,
          provider: provider,
          baseURL: `https://${provider}.com/v1`,
          apiKey: `${provider}-key`,
          models: ['test-model'],
          defaultModel: 'test-model',
          enabled: true
        };

        const modelsData = { [provider]: legacyConfig };
        await storage.setItem('models', JSON.stringify(modelsData));

        const modelManager = new ModelManager(storage, registry);
        

        const config = await modelManager.getModel(provider) as TextModelConfig;
        expect(config).toBeDefined();
        expect(config.providerMeta.id).toBe(expectedProviderId);
        expect(config.connectionConfig.baseURL).toBe(`https://${provider}.com/v1`);

        await storage.clearAll();
      }
    });
  });

  describe('错误处理', () => {
    it('获取不存在的模型应该返回null', async () => {
      const modelManager = new ModelManager(storage, registry);
      

      const result = await modelManager.getModel('non-existent');
      expect(result).toBeUndefined();
    });

    it('删除不存在的模型应该抛出错误', async () => {
      const modelManager = new ModelManager(storage, registry);


      // 新架构中，删除不存在的模型会抛出 ModelConfigError
      await expect(modelManager.deleteModel('non-existent')).rejects.toThrow();
    });

    it('无效的配置应该被拒绝', async () => {
      const modelManager = new ModelManager(storage, registry);
      

      const invalidConfig = {
        id: 'invalid',
        name: 'Invalid',
        enabled: true,
        // 缺少必需字段
      } as any;

      await expect(modelManager.addModel('invalid', invalidConfig))
        .rejects.toThrow();
    });
  });
});
