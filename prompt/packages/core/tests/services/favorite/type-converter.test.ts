import { describe, it, expect } from 'vitest';
import { TagTypeConverter } from '../../../src/services/favorite/type-converter';
import type { TagStatistics } from '../../../src/services/favorite/types';

/**
 * 标签类型转换器单元测试
 */
describe('TagTypeConverter', () => {
  describe('toTagStatistics', () => {
    it('应该将API格式转换为TagStatistics格式', () => {
      const apiData = [
        { tag: '标签1', count: 5 },
        { tag: '标签2', count: 3 }
      ];

      const result = TagTypeConverter.toTagStatistics(apiData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: '标签1',
        count: 5,
        lastUsed: undefined
      });
      expect(result[1]).toEqual({
        name: '标签2',
        count: 3,
        lastUsed: undefined
      });
    });

    it('应该处理空数组', () => {
      const result = TagTypeConverter.toTagStatistics([]);
      expect(result).toEqual([]);
    });
  });

  describe('fromTagStatistics', () => {
    it('应该将TagStatistics格式转换为API格式', () => {
      const stats: TagStatistics[] = [
        { name: '标签1', count: 5, lastUsed: undefined },
        { name: '标签2', count: 3, lastUsed: Date.now() }
      ];

      const result = TagTypeConverter.fromTagStatistics(stats);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ tag: '标签1', count: 5 });
      expect(result[1]).toEqual({ tag: '标签2', count: 3 });
    });

    it('应该处理空数组', () => {
      const result = TagTypeConverter.fromTagStatistics([]);
      expect(result).toEqual([]);
    });
  });

  describe('toAutoCompleteOptions', () => {
    it('应该转换为自动完成选项格式', () => {
      const apiData = [
        { tag: '标签1', count: 5 },
        { tag: '标签2', count: 3 }
      ];

      const result = TagTypeConverter.toAutoCompleteOptions(apiData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: '标签1 (5)',
        value: '标签1',
        count: 5
      });
      expect(result[1]).toEqual({
        label: '标签2 (3)',
        value: '标签2',
        count: 3
      });
    });

    it('应该处理使用次数为0的标签', () => {
      const apiData = [{ tag: '未使用标签', count: 0 }];

      const result = TagTypeConverter.toAutoCompleteOptions(apiData);

      expect(result[0]).toEqual({
        label: '未使用标签 (0)',
        value: '未使用标签',
        count: 0
      });
    });
  });

  describe('toStringArray', () => {
    it('应该转换为字符串数组', () => {
      const apiData = [
        { tag: '标签1', count: 5 },
        { tag: '标签2', count: 3 },
        { tag: '标签3', count: 0 }
      ];

      const result = TagTypeConverter.toStringArray(apiData);

      expect(result).toEqual(['标签1', '标签2', '标签3']);
    });

    it('应该处理空数组', () => {
      const result = TagTypeConverter.toStringArray([]);
      expect(result).toEqual([]);
    });
  });

  describe('sortByCount', () => {
    it('应该按使用次数降序排序', () => {
      const tags = [
        { count: 3 },
        { count: 10 },
        { count: 1 },
        { count: 5 }
      ];

      const result = TagTypeConverter.sortByCount(tags);

      expect(result.map(t => t.count)).toEqual([10, 5, 3, 1]);
    });

    it('应该不修改原数组', () => {
      const tags = [
        { count: 3 },
        { count: 1 }
      ];

      const result = TagTypeConverter.sortByCount(tags);

      expect(tags.map(t => t.count)).toEqual([3, 1]);
      expect(result.map(t => t.count)).toEqual([3, 1]);
    });
  });

  describe('sortByName', () => {
    it('应该按标签名升序排序', () => {
      const tags: TagStatistics[] = [
        { name: 'Zebra', count: 1 },
        { name: 'Apple', count: 2 },
        { name: 'Banana', count: 3 }
      ];

      const result = TagTypeConverter.sortByName(tags);

      expect(result.map(t => t.name)).toEqual(['Apple', 'Banana', 'Zebra']);
    });

    it('应该正确处理中文排序', () => {
      const tags: TagStatistics[] = [
        { name: '编程', count: 1 },
        { name: '设计', count: 2 },
        { name: '测试', count: 3 }
      ];

      const result = TagTypeConverter.sortByName(tags);

      // 中文按拼音排序
      expect(result.map(t => t.name)).toEqual(['编程', '测试', '设计']);
    });

    it('应该不修改原数组', () => {
      const tags: TagStatistics[] = [
        { name: 'B', count: 1 },
        { name: 'A', count: 2 }
      ];

      const result = TagTypeConverter.sortByName(tags);

      expect(tags.map(t => t.name)).toEqual(['B', 'A']);
      expect(result.map(t => t.name)).toEqual(['A', 'B']);
    });
  });

  describe('sortByCountThenName', () => {
    it('应该先按使用次数降序，再按名称升序排序', () => {
      const tags: TagStatistics[] = [
        { name: 'Zebra', count: 5 },
        { name: 'Apple', count: 5 },
        { name: 'Banana', count: 3 },
        { name: 'Cat', count: 5 }
      ];

      const result = TagTypeConverter.sortByCountThenName(tags);

      // count=5的按名称升序: Apple, Cat, Zebra
      // count=3的: Banana
      expect(result.map(t => t.name)).toEqual(['Apple', 'Cat', 'Zebra', 'Banana']);
    });

    it('应该处理使用次数全部相同的情况', () => {
      const tags: TagStatistics[] = [
        { name: 'C', count: 1 },
        { name: 'A', count: 1 },
        { name: 'B', count: 1 }
      ];

      const result = TagTypeConverter.sortByCountThenName(tags);

      expect(result.map(t => t.name)).toEqual(['A', 'B', 'C']);
    });

    it('应该不修改原数组', () => {
      const tags: TagStatistics[] = [
        { name: 'B', count: 2 },
        { name: 'A', count: 1 }
      ];

      const result = TagTypeConverter.sortByCountThenName(tags);

      expect(tags[0].name).toBe('B');
      expect(result[0].name).toBe('B');
      expect(result[1].name).toBe('A');
    });
  });
});
