import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

interface VirtualScrollItem {
  id: string | number
  height?: number
  [key: string]: unknown
}

interface VirtualScrollOptions {
  itemHeight?: number
  buffer?: number
  threshold?: number
  containerHeight?: number
}

/**
 * 虚拟滚动 Composable
 * 优化大列表渲染性能
 */
export function useVirtualScroll<T extends VirtualScrollItem>(
  items: T[],
  options: VirtualScrollOptions = {}
) {
  const {
    itemHeight = 50,
    buffer = 3,
    threshold = 100,
    containerHeight = 400
  } = options

  // 状态管理
  const scrollTop = ref(0)
  const containerRef = ref<HTMLElement>()
  const contentRef = ref<HTMLElement>()
  const isScrolling = ref(false)
  const scrollEndTimer = ref<number>()

  // 计算可见区域
  const visibleRange = computed(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeight) - buffer)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop.value + containerHeight) / itemHeight) + buffer
    )
    
    return { startIndex, endIndex }
  })

  // 可见的项目
  const visibleItems = computed(() => {
    const { startIndex, endIndex } = visibleRange.value
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      ...item,
      index: startIndex + index,
      offsetTop: (startIndex + index) * itemHeight
    }))
  })

  // 总高度
  const totalHeight = computed(() => items.length * itemHeight)

  // 顶部偏移
  const offsetTop = computed(() => visibleRange.value.startIndex * itemHeight)

  // 底部填充高度
  const offsetBottom = computed(() => 
    Math.max(0, (items.length - visibleRange.value.endIndex - 1) * itemHeight)
  )

  // 滚动事件处理
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
    
    isScrolling.value = true
    
    // 清除之前的计时器
    if (scrollEndTimer.value) {
      clearTimeout(scrollEndTimer.value)
    }
    
    // 设置滚动结束计时器
    scrollEndTimer.value = window.setTimeout(() => {
      isScrolling.value = false
    }, 150)
  }

  // 滚动到指定位置
  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.value) return
    
    const targetScrollTop = Math.max(0, index * itemHeight)
    containerRef.value.scrollTo({
      top: targetScrollTop,
      behavior
    })
  }

  // 滚动到顶部
  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(0, behavior)
  }

  // 滚动到底部
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(items.length - 1, behavior)
  }

  // 获取当前可见项目索引范围
  const getVisibleIndexRange = () => visibleRange.value

  // 检查项目是否可见
  const isItemVisible = (index: number) => {
    const { startIndex, endIndex } = visibleRange.value
    return index >= startIndex && index <= endIndex
  }

  // 强制更新可见区域
  const forceUpdate = () => {
    nextTick(() => {
      if (containerRef.value) {
        scrollTop.value = containerRef.value.scrollTop
      }
    })
  }

  // 获取性能统计
  const getPerformanceStats = () => {
    const { startIndex, endIndex } = visibleRange.value
    const visibleCount = endIndex - startIndex + 1
    const renderRatio = visibleCount / items.length
    
    return {
      totalItems: items.length,
      visibleItems: visibleCount,
      renderRatio: renderRatio * 100,
      shouldUseVirtual: items.length > threshold,
      memoryUsage: `${(visibleCount * 0.1).toFixed(1)}KB (estimated)`,
      performance: renderRatio < 0.3 ? 'excellent' : renderRatio < 0.6 ? 'good' : 'poor'
    }
  }

  // 生命周期管理
  onMounted(() => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
    }
  })

  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
    if (scrollEndTimer.value) {
      clearTimeout(scrollEndTimer.value)
    }
  })

  return {
    // Refs
    containerRef,
    contentRef,
    
    // 状态
    scrollTop,
    isScrolling,
    visibleItems,
    visibleRange,
    totalHeight,
    offsetTop,
    offsetBottom,
    
    // 方法
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    getVisibleIndexRange,
    isItemVisible,
    forceUpdate,
    getPerformanceStats,
    
    // 配置
    itemHeight,
    buffer,
    threshold,
    containerHeight
  }
}