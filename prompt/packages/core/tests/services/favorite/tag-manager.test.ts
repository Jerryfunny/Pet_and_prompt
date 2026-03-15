import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FavoriteManager } from '../../../src/services/favorite/manager';
import type { IStorageProvider } from '../../../src/services/storage/types';
import { FavoriteValidationError } from '../../../src/services/favorite/errors';

/**
 * 标签管理功能单元测试
 */
describe('FavoriteManager - 标签管理', () => {
  let manager: FavoriteManager;
  let mockStorage: Map<string, string>;
  let storageProvider: IStorageProvider;

  beforeEach(() => {
    // 创建模拟存储
    mockStorage = new Map<string, string>();

    storageProvider = {
      getItem: vi.fn(async (key: string) => mockStorage.get(key) || null),
      setItem: vi.fn(async (key: string, value: string) => {
        mockStorage.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        mockStorage.delete(key);
      }),
      clearAll: vi.fn(async () => {
        mockStorage.clear();
      }),
      batchUpdate: vi.fn(async (operations: Array<{ key: string; operation: 'set' | 'remove'; value?: string }>) => {
        operations.forEach(({ key, operation, value }) => {
          if (operation === 'set' && value) {
            mockStorage.set(key, value);
          } else if (operation === 'remove') {
            mockStorage.delete(key);
          }
        });
      }),
      updateData: vi.fn(async (key: string, updater: (data: any) => any) => {
        const currentData = mockStorage.get(key);
        const parsedData = currentData ? JSON.parse(currentData) : null;
        const updatedData = updater(parsedData);
        mockStorage.set(key, JSON.stringify(updatedData));
      })
    };

    manager = new FavoriteManager(storageProvider);
  });

  describe('添加标签', () => {
    it('应该能成功添加新标签', async () => {
      await manager.addTag('测试标签');

      const tags = await manager.getAllTags();
      expect(tags).toHaveLength(1);
      expect(tags[0].tag).toBe('测试标签');
      expect(tags[0].count).toBe(0); // 新标签未使用，count 为 0
    });

    it('应该拒绝空标签名', async () => {
      await expect(manager.addTag('')).rejects.toThrow(FavoriteValidationError);
      await expect(manager.addTag('   ')).rejects.toThrow(FavoriteValidationError);
    });

    it('重复添加标签应该幂等', async () => {
      await manager.addTag('标签1');
      await expect(manager.addTag('标签1')).resolves.toBeUndefined();

      const tags = await manager.getAllTags();
      expect(tags.filter(tag => tag.tag === '标签1')).toHaveLength(1);
    });

    it('应该自动去除首尾空格', async () => {
      await manager.addTag('  标签2  ');
      const tags = await manager.getAllTags();
      expect(tags[0].tag).toBe('标签2');
    });

    it('应该能添加多个标签', async () => {
      await manager.addTag('标签1');
      await manager.addTag('标签2');
      await manager.addTag('标签3');

      const tags = await manager.getAllTags();
      expect(tags).toHaveLength(3);
    });
  });

  describe('获取所有标签', () => {
    it('应该返回独立标签和使用中的标签', async () => {
      // 添加独立标签
      await manager.addTag('独立标签1');
      await manager.addTag('独立标签2');

      // 添加收藏（使用某些标签）
      await manager.addFavorite({
        title: '测试收藏',
        content: '测试内容',
        tags: ['使用中标签', '独立标签1'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      const tags = await manager.getAllTags();

      // 应该包含 3 个标签：独立标签1（count=1）、独立标签2（count=0）、使用中标签（count=1）
      expect(tags).toHaveLength(3);

      const tag1 = tags.find(t => t.tag === '独立标签1');
      expect(tag1?.count).toBe(1);

      const tag2 = tags.find(t => t.tag === '独立标签2');
      expect(tag2?.count).toBe(0);

      const tag3 = tags.find(t => t.tag === '使用中标签');
      expect(tag3?.count).toBe(1);
    });

    it('应该按使用次数降序排序', async () => {
      await manager.addFavorite({
        title: '收藏1',
        content: '内容1',
        tags: ['标签A', '标签B'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      await manager.addFavorite({
        title: '收藏2',
        content: '内容2',
        tags: ['标签B', '标签C'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      await manager.addFavorite({
        title: '收藏3',
        content: '内容3',
        tags: ['标签B'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      const tags = await manager.getAllTags();

      // 标签B 使用3次，应该排第一
      expect(tags[0].tag).toBe('标签B');
      expect(tags[0].count).toBe(3);

      // 标签A 和 标签C 各使用1次
      expect(tags[1].count).toBe(1);
      expect(tags[2].count).toBe(1);
    });

    it('相同使用次数时应该按标签名升序排序', async () => {
      await manager.addFavorite({
        title: '收藏',
        content: '内容',
        tags: ['Zebra', 'Apple', 'Banana'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      const tags = await manager.getAllTags();

      // 都是使用1次，应该按字母顺序排序
      expect(tags[0].tag).toBe('Apple');
      expect(tags[1].tag).toBe('Banana');
      expect(tags[2].tag).toBe('Zebra');
    });
  });

  describe('重命名标签', () => {
    it('应该能成功重命名标签并更新所有收藏', async () => {
      // 添加使用该标签的收藏
      await manager.addFavorite({
        title: '收藏1',
        content: '内容1',
        tags: ['旧标签'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      await manager.addFavorite({
        title: '收藏2',
        content: '内容2',
        tags: ['旧标签', '其他标签'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      const affectedCount = await manager.renameTag('旧标签', '新标签');

      expect(affectedCount).toBe(2); // 影响了2个收藏

      // 验证收藏已更新
      const favorites = await manager.getFavorites();
      expect(favorites[0].tags).toContain('新标签');
      expect(favorites[0].tags).not.toContain('旧标签');
      expect(favorites[1].tags).toContain('新标签');
      expect(favorites[1].tags).not.toContain('旧标签');

      // 验证标签统计
      const tags = await manager.getAllTags();
      const newTag = tags.find(t => t.tag === '新标签');
      expect(newTag?.count).toBe(2);

      const oldTag = tags.find(t => t.tag === '旧标签');
      expect(oldTag).toBeUndefined();
    });

    it('重命名为相同名称时应该返回0', async () => {
      const affectedCount = await manager.renameTag('标签A', '标签A');
      expect(affectedCount).toBe(0);
    });

    it('应该拒绝空标签名', async () => {
      await expect(manager.renameTag('', '新标签')).rejects.toThrow(FavoriteValidationError);
      await expect(manager.renameTag('旧标签', '')).rejects.toThrow(FavoriteValidationError);
    });

    it('重命名不存在的标签时应该返回0', async () => {
      const affectedCount = await manager.renameTag('不存在的标签', '新标签');
      expect(affectedCount).toBe(0);
    });

    it('重命名时如果新标签已存在应该合并', async () => {
      await manager.addFavorite({
        title: '收藏',
        content: '内容',
        tags: ['标签A', '标签B'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      await manager.renameTag('标签A', '标签B');

      const favorites = await manager.getFavorites();
      // 应该只包含一个标签B，不重复
      expect(favorites[0].tags).toEqual(['标签B']);
    });
  });

  describe('合并标签', () => {
    it('应该能成功合并多个标签', async () => {
      await manager.addFavorite({
        title: '收藏1',
        content: '内容1',
        tags: ['标签A'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      await manager.addFavorite({
        title: '收藏2',
        content: '内容2',
        tags: ['标签B'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      await manager.addFavorite({
        title: '收藏3',
        content: '内容3',
        tags: ['标签C'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      const affectedCount = await manager.mergeTags(['标签A', '标签B'], '标签C');

      expect(affectedCount).toBe(2); // 影响了2个收藏（收藏1和收藏2）

      const favorites = await manager.getFavorites();
      expect(favorites[0].tags).toContain('标签C');
      expect(favorites[0].tags).not.toContain('标签A');
      expect(favorites[1].tags).toContain('标签C');
      expect(favorites[1].tags).not.toContain('标签B');

      // 收藏3的标签C不应重复
      expect(favorites[2].tags).toEqual(['标签C']);
    });

    it('应该拒绝空的源标签列表', async () => {
      await expect(manager.mergeTags([], '目标标签')).rejects.toThrow(FavoriteValidationError);
    });

    it('应该拒绝空的目标标签', async () => {
      await expect(manager.mergeTags(['标签A'], '')).rejects.toThrow(FavoriteValidationError);
    });

    it('合并不存在的标签时应该返回0', async () => {
      const affectedCount = await manager.mergeTags(['不存在1', '不存在2'], '目标');
      expect(affectedCount).toBe(0);
    });
  });

  describe('删除标签', () => {
    it('应该能删除标签并从所有收藏中移除', async () => {
      // 添加独立标签（未被使用）
      await manager.addTag('独立标签');

      // 添加使用该标签的收藏
      await manager.addFavorite({
        title: '收藏1',
        content: '内容1',
        tags: ['要删除的标签', '保留的标签'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      await manager.addFavorite({
        title: '收藏2',
        content: '内容2',
        tags: ['要删除的标签'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      const affectedCount = await manager.deleteTag('要删除的标签');

      expect(affectedCount).toBe(2); // 影响了2个收藏

      // 验证收藏已更新
      const favorites = await manager.getFavorites();

      // 验证两个收藏都不包含"要删除的标签"
      favorites.forEach(fav => {
        expect(fav.tags).not.toContain('要删除的标签');
      });

      // 第一个收藏应该保留"保留的标签"
      const firstFavorite = favorites.find(f => f.title === '收藏1');
      expect(firstFavorite).toBeDefined();
      expect(firstFavorite!.tags).toEqual(['保留的标签']);

      // 第二个收藏应该没有标签
      const secondFavorite = favorites.find(f => f.title === '收藏2');
      expect(secondFavorite).toBeDefined();
      expect(secondFavorite!.tags).toEqual([]);

      // 验证标签统计：要删除的标签不应该存在
      const tags = await manager.getAllTags();
      const deletedTag = tags.find(t => t.tag === '要删除的标签');
      expect(deletedTag).toBeUndefined();

      // 独立标签应该仍然存在(count=0，因为未被使用)
      const independentTag = tags.find(t => t.tag === '独立标签');
      expect(independentTag).toBeDefined();
      expect(independentTag!.count).toBe(0);

      // 测试删除独立标签
      const independentTagDelCount = await manager.deleteTag('独立标签');
      expect(independentTagDelCount).toBe(0); // 未被任何收藏使用

      const tagsAfterDel = await manager.getAllTags();
      const deletedIndependentTag = tagsAfterDel.find(t => t.tag === '独立标签');
      expect(deletedIndependentTag).toBeUndefined();
    });

    it('应该拒绝空标签名', async () => {
      await expect(manager.deleteTag('')).rejects.toThrow(FavoriteValidationError);
    });

    it('删除不存在的标签时应该返回0', async () => {
      const affectedCount = await manager.deleteTag('不存在的标签');
      expect(affectedCount).toBe(0);
    });
  });

  describe('标签导入导出', () => {
    it('导出时应该包含独立标签', async () => {
      await manager.addTag('独立标签1');
      await manager.addTag('独立标签2');

      // 添加使用中标签到独立标签库
      await manager.addTag('使用中标签');

      await manager.addFavorite({
        title: '测试',
        content: '内容',
        tags: ['使用中标签'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      const exportData = await manager.exportFavorites();
      const parsed = JSON.parse(exportData);

      expect(parsed.tags).toBeDefined();
      expect(parsed.tags).toContain('独立标签1');
      expect(parsed.tags).toContain('独立标签2');
      expect(parsed.tags).toContain('使用中标签');
    });

    it('导入时应该自动创建独立标签', async () => {
      const importData = JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        favorites: [
          {
            title: '测试',
            content: '内容',
            tags: ['标签1', '标签2'],
            functionMode: 'basic',
            optimizationMode: 'system'
          }
        ],
        categories: [],
        tags: ['标签1', '标签2', '预创建标签']
      });

      await manager.importFavorites(importData);

      const tags = await manager.getAllTags();

      // 应该包含所有标签
      expect(tags.find(t => t.tag === '标签1')).toBeDefined();
      expect(tags.find(t => t.tag === '标签2')).toBeDefined();
      expect(tags.find(t => t.tag === '预创建标签')).toBeDefined();

      // 预创建标签使用次数为0
      const preCreatedTag = tags.find(t => t.tag === '预创建标签');
      expect(preCreatedTag?.count).toBe(0);
    });
  });

  describe('保存收藏时自动注册标签', () => {
    it('保存收藏时应该自动将标签添加到独立标签库', async () => {
      // 这个测试需要在 UI 层面实现，这里只是验证概念
      // 在 SaveFavoriteDialog 中，保存前应该调用 addTag

      await manager.addFavorite({
        title: '测试',
        content: '内容',
        tags: ['新标签1', '新标签2'],
        functionMode: 'basic',
        optimizationMode: 'system'
      });

      // 手动模拟 SaveFavoriteDialog 的行为
      for (const tag of ['新标签1', '新标签2']) {
        try {
          await manager.addTag(tag);
        } catch (error) {
          // 标签已存在，忽略错误
        }
      }

      const tags = await manager.getAllTags();
      expect(tags.find(t => t.tag === '新标签1')).toBeDefined();
      expect(tags.find(t => t.tag === '新标签2')).toBeDefined();
    });
  });
});
