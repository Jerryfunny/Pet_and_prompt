import { ref, computed, inject, type Ref } from 'vue'

import type { AppServices } from '../../types/services';
import { TagTypeConverter } from '@prompt-optimizer/core';

export interface TagSuggestion {
  label: string;
  value: string;
  count: number;
}

/**
 * 标签建议 Composable
 * 提供标签自动完成功能，基于现有收藏中的标签使用情况
 */
export function useTagSuggestions() {
  const services = inject<Ref<AppServices | null>>('services');
  const allTags = ref<TagSuggestion[]>([]);
  const loading = ref(false);

  /**
   * 加载所有标签统计数据
   */
  const loadTags = async () => {
    if (!services?.value?.favoriteManager) {
      return;
    }

    loading.value = true;
    try {
      const tagStats = await services.value.favoriteManager.getAllTags();
      // 使用统一的类型转换器转换为自动完成选项格式
      allTags.value = TagTypeConverter.toAutoCompleteOptions(tagStats);
    } catch (error) {
      console.error('Failed to load tags:', error);
      allTags.value = [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 根据输入查询过滤标签建议
   * @param query 查询字符串
   * @param excludeTags 需要排除的标签(已选中的标签)
   * @returns 过滤后的标签建议列表
   */
  const filterTags = (query: string, excludeTags: string[] = []): TagSuggestion[] => {
    if (!query) {
      // 如果没有输入，返回所有未选中的标签，按使用次数排序
      return allTags.value
        .filter(tag => !excludeTags.includes(tag.value))
        .sort((a, b) => b.count - a.count);
    }

    // 模糊搜索匹配
    const lowerQuery = query.toLowerCase();
    return allTags.value
      .filter(tag => {
        // 排除已选中的标签
        if (excludeTags.includes(tag.value)) {
          return false;
        }
        // 包含查询字符串
        return tag.value.toLowerCase().includes(lowerQuery);
      })
      .sort((a, b) => {
        // 优先匹配前缀
        const aStartsWith = a.value.toLowerCase().startsWith(lowerQuery);
        const bStartsWith = b.value.toLowerCase().startsWith(lowerQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        // 其次按使用次数排序
        return b.count - a.count;
      });
  };

  /**
   * 获取热门标签(使用次数最多的前N个)
   * @param limit 返回数量限制
   * @param excludeTags 需要排除的标签
   */
  const getPopularTags = computed(() => {
    return (limit = 10, excludeTags: string[] = []): TagSuggestion[] => {
      return allTags.value
        .filter(tag => !excludeTags.includes(tag.value))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    };
  });

  /**
   * 获取最近使用的标签(暂时与热门标签相同，未来可以基于时间戳优化)
   * @param limit 返回数量限制
   * @param excludeTags 需要排除的标签
   */
  const getRecentTags = computed(() => {
    return (limit = 10, excludeTags: string[] = []): TagSuggestion[] => {
      // TODO: 未来可以基于收藏的更新时间来优化这个逻辑
      return getPopularTags.value(limit, excludeTags);
    };
  });

  return {
    allTags,
    loading,
    loadTags,
    filterTags,
    getPopularTags,
    getRecentTags
  };
}
