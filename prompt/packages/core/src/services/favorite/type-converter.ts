import type { TagStatistics } from './types';

/**
 * 标签类型转换工具
 * 统一处理不同格式之间的标签数据转换
 */
export class TagTypeConverter {
  private static readonly collator = new Intl.Collator(
    ['zh-Hans-u-co-pinyin', 'zh-Hans', 'zh', 'en'],
    { sensitivity: 'accent', numeric: true }
  );

  private static compareNames(a: string, b: string): number {
    try {
      return TagTypeConverter.collator.compare(a, b);
    } catch {
      return a.localeCompare(b);
    }
  }

  /**
   * 将 API 返回的标签数据转换为 TagStatistics 格式
   * @param apiData API 返回的标签数据 { tag: string; count: number }[]
   * @returns TagStatistics[] 格式的标签统计数据
   */
  static toTagStatistics(apiData: Array<{ tag: string; count: number }>): TagStatistics[] {
    return apiData.map(item => ({
      name: item.tag,
      count: item.count,
      lastUsed: undefined
    }));
  }

  /**
   * 将 TagStatistics 转换回 API 格式
   * @param stats TagStatistics[] 格式的标签统计数据
   * @returns API 格式的标签数据 { tag: string; count: number }[]
   */
  static fromTagStatistics(stats: TagStatistics[]): Array<{ tag: string; count: number }> {
    return stats.map(item => ({
      tag: item.name,
      count: item.count
    }));
  }

  /**
   * 将标签数据转换为自动完成选项格式
   * @param apiData API 返回的标签数据
   * @returns 自动完成选项格式 { label: string; value: string; count: number }[]
   */
  static toAutoCompleteOptions(apiData: Array<{ tag: string; count: number }>): Array<{
    label: string;
    value: string;
    count: number;
  }> {
    return apiData.map(item => ({
      label: `${item.tag} (${item.count})`,
      value: item.tag,
      count: item.count
    }));
  }

  /**
   * 将标签数据转换为简单的字符串数组
   * @param apiData API 返回的标签数据
   * @returns 标签名称数组
   */
  static toStringArray(apiData: Array<{ tag: string; count: number }>): string[] {
    return apiData.map(item => item.tag);
  }

  /**
   * 按使用次数降序排序标签
   * @param tags 标签数据
   * @returns 排序后的标签数据
   */
  static sortByCount<T extends { count: number }>(tags: T[]): T[] {
    return [...tags].sort((a, b) => b.count - a.count);
  }

  /**
   * 按标签名称升序排序标签
   * @param tags 标签数据
   * @returns 排序后的标签数据
   */
  static sortByName(tags: TagStatistics[]): TagStatistics[] {
    return [...tags].sort((a, b) => TagTypeConverter.compareNames(a.name, b.name));
  }

  /**
   * 混合排序：先按使用次数降序，相同次数按名称升序
   * @param tags 标签数据
   * @returns 排序后的标签数据
   */
  static sortByCountThenName(tags: TagStatistics[]): TagStatistics[] {
    return [...tags].sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return TagTypeConverter.compareNames(a.name, b.name);
    });
  }

  /**
   * 对外暴露名称排序规则，便于其他模块保持一致
   */
  static compareTagNames(a: string, b: string): number {
    return TagTypeConverter.compareNames(a, b);
  }
}
