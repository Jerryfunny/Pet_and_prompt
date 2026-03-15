import { describe, it, expect, beforeEach } from 'vitest';
import { FavoriteManager } from '../../src/services/favorite/manager';
import type { IStorageProvider } from '../../src/services/storage/types';

/**
 * 数据兼容性回归测试
 *
 * 目的: 确保旧版本的收藏数据能够正常导入和使用
 * 场景:
 * 1. 旧数据缺少 functionMode 字段
 * 2. 旧数据使用旧的 metadata 结构
 * 3. 旧数据缺少新增的可选字段
 */
describe('数据兼容性回归测试', () => {
  let manager: FavoriteManager;
  let storage: Map<string, string>;

  // 创建内存存储提供者
  const createMemoryStorage = (): IStorageProvider => {
    storage = new Map();
    return {
      async getItem(key: string): Promise<string | null> {
        return storage.get(key) || null;
      },
      async setItem(key: string, value: string): Promise<void> {
        storage.set(key, value);
      },
      async removeItem(key: string): Promise<void> {
        storage.delete(key);
      },
      async clearAll(): Promise<void> {
        storage.clear();
      },
      async updateData<T>(key: string, modifier: (currentValue: T | null) => T): Promise<void> {
        const currentStr = storage.get(key);
        const currentValue = currentStr ? JSON.parse(currentStr) : null;
        const updated = modifier(currentValue);
        storage.set(key, JSON.stringify(updated));
      },
      async batchUpdate(operations: Array<{
        key: string;
        operation: 'set' | 'remove';
        value?: string;
      }>): Promise<void> {
        for (const op of operations) {
          if (op.operation === 'set' && op.value) {
            storage.set(op.key, op.value);
          } else if (op.operation === 'remove') {
            storage.delete(op.key);
          }
        }
      }
    };
  };

  beforeEach(async () => {
    manager = new FavoriteManager(createMemoryStorage());
    await manager.initialize();
  });

  it('应该能够导入缺少 functionMode 的旧数据', async () => {
    // 1. 创建旧格式的收藏数据（无 functionMode）
    const oldData = {
      favorites: [
        {
          id: 'old-fav-001',
          title: '旧版收藏1',
          content: '这是没有 functionMode 的旧收藏',
          tags: ['测试', '旧数据'],
          category: undefined,
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString()
          // 注意：没有 functionMode 字段
        },
        {
          id: 'old-fav-002',
          title: '旧版收藏2',
          content: '另一个旧收藏',
          tags: ['兼容性'],
          category: undefined,
          createdAt: new Date('2024-01-02').toISOString(),
          updatedAt: new Date('2024-01-02').toISOString()
        }
      ],
      categories: [],
      tags: []
    };

    // 2. 导入旧数据
    const result = await manager.importFavorites(JSON.stringify(oldData));

    // 3. 验证导入成功
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors.length).toBe(0);

    // 4. 验证数据已正确导入并设置了默认 functionMode
    const allFavorites = await manager.getFavorites();
    expect(allFavorites.length).toBe(2);

    // 使用 title 查找，因为ID会被重新生成
    const fav1 = allFavorites.find(f => f.title === '旧版收藏1');
    expect(fav1).toBeDefined();
    expect(fav1!.functionMode).toBe('basic'); // 应该有默认值
    expect(fav1!.content).toBe('这是没有 functionMode 的旧收藏');
    expect(fav1!.tags).toEqual(['测试', '旧数据']);

    const fav2 = allFavorites.find(f => f.title === '旧版收藏2');
    expect(fav2).toBeDefined();
    expect(fav2!.functionMode).toBe('basic'); // 应该有默认值
  });

  it('应该能够导入使用旧 metadata 结构的数据', async () => {
    // 1. 创建使用旧 metadata 结构的数据
    const oldData = {
      favorites: [
        {
          id: 'old-meta-001',
          title: '旧 metadata 结构',
          content: '优化后的内容',
          tags: ['测试'],
          category: undefined,
          // 旧结构：直接在顶层
          originalContent: '原始内容',
          sourceHistoryId: 'hist-001',
          functionMode: 'basic', // 有 functionMode
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      categories: [],
      tags: []
    };

    // 2. 导入
    const result = await manager.importFavorites(JSON.stringify(oldData));

    // 3. 验证导入成功
    expect(result.imported).toBe(1);

    // 4. 验证数据正确导入
    const favorites = await manager.getFavorites();
    expect(favorites.length).toBeGreaterThan(0);

    const imported = favorites.find(f => f.title === '旧 metadata 结构');
    expect(imported).toBeDefined();
    expect(imported!.functionMode).toBe('basic');
    // metadata字段可能存在也可能不存在，取决于导入逻辑是否保留
  });

  it('应该能够正常查询和搜索迁移后的旧数据', async () => {
    // 1. 导入旧数据
    const oldData = {
      favorites: [
        {
          id: 'search-test-001',
          title: '可搜索的旧收藏',
          content: '这是一个可以被搜索到的内容',
          tags: ['搜索', '测试'],
          category: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      categories: [],
      tags: []
    };

    await manager.importFavorites(JSON.stringify(oldData));

    // 2. 测试查询功能
    const allFavorites = await manager.getFavorites();
    expect(allFavorites.length).toBeGreaterThan(0);

    // 3. 测试搜索功能
    const searchResults = await manager.searchFavorites('可搜索');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].title).toContain('可搜索');

    // 4. 测试按标签过滤
    const tagResults = await manager.getFavorites({ tags: ['搜索'] });
    expect(tagResults.length).toBeGreaterThan(0);
  });

  it('应该能够更新迁移后的旧数据', async () => {
    // 1. 导入旧数据
    const oldData = {
      favorites: [
        {
          title: '可更新的旧收藏',
          content: '原始内容',
          tags: ['测试'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      categories: [],
      tags: []
    };

    await manager.importFavorites(JSON.stringify(oldData));

    // 2. 获取导入的收藏ID
    const favorites = await manager.getFavorites();
    const imported = favorites.find(f => f.title === '可更新的旧收藏');
    expect(imported).toBeDefined();

    // 3. 更新数据
    await manager.updateFavorite(imported!.id, {
      title: '更新后的标题',
      content: '更新后的内容'
    });

    // 4. 验证更新成功
    const updated = await manager.getFavorite(imported!.id);
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('更新后的标题');
    expect(updated!.content).toBe('更新后的内容');
    expect(updated!.functionMode).toBe('basic'); // functionMode 应该保持
  });

  it('应该能够删除迁移后的旧数据', async () => {
    // 1. 导入旧数据
    const oldData = {
      favorites: [
        {
          title: '可删除的旧收藏',
          content: '这个收藏将被删除',
          tags: ['测试'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      categories: [],
      tags: []
    };

    await manager.importFavorites(JSON.stringify(oldData));

    // 2. 获取导入的收藏并验证存在
    let favorites = await manager.getFavorites();
    const imported = favorites.find(f => f.title === '可删除的旧收藏');
    expect(imported).toBeDefined();

    // 3. 删除数据
    await manager.deleteFavorite(imported!.id);

    // 4. 验证删除成功
    favorites = await manager.getFavorites();
    expect(favorites.find(f => f.title === '可删除的旧收藏')).toBeUndefined();
  });

  it('应该能够导出迁移后的数据并保持完整性', async () => {
    // 1. 导入旧数据
    const oldData = {
      favorites: [
        {
          title: '导出测试收藏',
          content: '这个数据将被导出',
          tags: ['导出', '测试'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      categories: [],
      tags: ['导出', '测试']
    };

    await manager.importFavorites(JSON.stringify(oldData));

    // 2. 导出数据
    const exported = await manager.exportFavorites();
    const exportedData = JSON.parse(exported);

    // 3. 验证导出的数据包含必要字段
    expect(exportedData.favorites).toBeDefined();
    expect(exportedData.favorites.length).toBeGreaterThan(0);

    const exportedFav = exportedData.favorites.find((f: any) => f.title === '导出测试收藏');
    expect(exportedFav).toBeDefined();
    expect(exportedFav.functionMode).toBe('basic'); // 应该有默认的 functionMode
    expect(exportedFav.title).toBe('导出测试收藏');
    expect(exportedFav.tags).toEqual(['导出', '测试']);
  });

  it('应该能够处理混合新旧格式的数据', async () => {
    // 1. 创建混合数据（一些有 functionMode，一些没有）
    const mixedData = {
      favorites: [
        {
          title: '旧格式收藏',
          content: '没有 functionMode',
          tags: ['旧'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
          // 无 functionMode
        },
        {
          title: '新格式收藏',
          content: '有 functionMode',
          tags: ['新'],
          functionMode: 'context',
          optimizationMode: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      categories: [],
      tags: []
    };

    // 2. 导入混合数据
    const result = await manager.importFavorites(JSON.stringify(mixedData));

    // 3. 验证都导入成功
    expect(result.imported).toBe(2);

    // 4. 验证两种数据都正确处理
    const favorites = await manager.getFavorites();

    const oldFav = favorites.find(f => f.title === '旧格式收藏');
    expect(oldFav).toBeDefined();
    expect(oldFav!.functionMode).toBe('basic'); // 旧数据应该有默认值

    const newFav = favorites.find(f => f.title === '新格式收藏');
    expect(newFav).toBeDefined();
    expect(newFav!.functionMode).toBe('context'); // 新数据保持原值
    expect(newFav!.optimizationMode).toBe('user');
  });
});
