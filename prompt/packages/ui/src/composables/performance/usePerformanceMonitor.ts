import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

import type { PerformanceMetrics } from '../../types/components'

interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

type PerformanceWithMemory = Performance & {
  memory?: PerformanceMemory
}

/**
 * 性能监控 Composable
 * 提供组件性能指标监控和优化建议
 */
export function usePerformanceMonitor(componentName: string = 'Unknown') {
  const startTime = ref(0)
  const renderCount = ref(0)
  const updateCount = ref(0)
  const lastUpdate = ref(new Date())
  const memoryUsage = ref(0)
  const observedElements = ref(new Set<Element>())
  
  // 性能观察器
  let performanceObserver: PerformanceObserver | null = null
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null

  // 记录渲染开始时间
  const startRender = () => {
    startTime.value = performance.now()
  }

  // 记录渲染完成时间
  const endRender = async () => {
    await nextTick()
    const renderTime = performance.now() - startTime.value
    renderCount.value++
    lastUpdate.value = new Date()
    
    // 记录性能指标
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${componentName}-render-end`)
      performance.measure(
        `${componentName}-render`, 
        `${componentName}-render-start`, 
        `${componentName}-render-end`
      )
    }

    return renderTime
  }

  // 记录组件更新
  const recordUpdate = () => {
    updateCount.value++
    lastUpdate.value = new Date()
  }

  // 获取内存使用情况
  const updateMemoryUsage = () => {
    if (typeof performance !== 'undefined') {
      const perf = performance as PerformanceWithMemory
      if (perf.memory) {
        memoryUsage.value = perf.memory.usedJSHeapSize
      }
    }
  }

  // 计算性能指标
  const metrics = computed((): PerformanceMetrics => {
    const renderTime = startTime.value > 0 ? performance.now() - startTime.value : 0
    
    return {
      renderTime: renderTime,
      loadTime: renderTime, // 简化为渲染时间
      memoryUsage: memoryUsage.value,
      updateCount: updateCount.value,
      lastUpdate: lastUpdate.value
    }
  })

  // 性能建议
  const suggestions = computed(() => {
    const suggestions: string[] = []
    
    if (updateCount.value > 50) {
      suggestions.push('组件更新过于频繁，考虑使用 debounce 或 throttle')
    }
    
    if (metrics.value.renderTime > 16) {
      suggestions.push('渲染时间超过 16ms，可能影响 60fps 体验')
    }
    
    if (memoryUsage.value > 50 * 1024 * 1024) { // 50MB
      suggestions.push('内存使用量较高，检查是否存在内存泄漏')
    }
    
    if (renderCount.value > 0 && updateCount.value / renderCount.value > 10) {
      suggestions.push('更新渲染比例过高，考虑优化响应式数据')
    }

    return suggestions
  })

  // 性能等级评估
  const performanceGrade = computed(() => {
    let score = 100
    
    // 渲染时间评分
    if (metrics.value.renderTime > 32) score -= 30
    else if (metrics.value.renderTime > 16) score -= 15
    else if (metrics.value.renderTime > 8) score -= 5
    
    // 更新频率评分
    if (updateCount.value > 100) score -= 25
    else if (updateCount.value > 50) score -= 15
    else if (updateCount.value > 20) score -= 5
    
    // 内存使用评分  
    const memoryMB = memoryUsage.value / (1024 * 1024)
    if (memoryMB > 100) score -= 20
    else if (memoryMB > 50) score -= 10
    else if (memoryMB > 25) score -= 5

    if (score >= 90) return { grade: 'A', color: 'success', text: '优秀' }
    if (score >= 80) return { grade: 'B', color: 'info', text: '良好' }  
    if (score >= 70) return { grade: 'C', color: 'warning', text: '一般' }
    if (score >= 60) return { grade: 'D', color: 'warning', text: '较差' }
    return { grade: 'F', color: 'error', text: '需要优化' }
  })

  // 开始性能监控
  const startMonitoring = () => {
    if (typeof performance === 'undefined') return

    // 标记渲染开始
    performance.mark(`${componentName}-render-start`)
    startRender()

    // 创建性能观察器
    if (typeof PerformanceObserver !== 'undefined') {
      performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: PerformanceEntry) => {
          if (entry.name.includes(componentName)) {
            console.debug(`Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`)
          }
        })
      })
      
      try {
        performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] })
      } catch (e) {
        console.warn('Performance observer not supported:', e)
      }
    }

    // 定期更新内存使用情况
    const memoryInterval = setInterval(updateMemoryUsage, 5000)
    
    onUnmounted(() => {
      clearInterval(memoryInterval)
    })
  }

  // 观察DOM变化
  const observeElement = (element: Element) => {
    if (!element || observedElements.value.has(element)) return

    observedElements.value.add(element)

    // 创建大小变化观察器
    if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          recordUpdate()
        })
      })
    }

    // 创建DOM变化观察器  
    if (!mutationObserver && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            recordUpdate()
          }
        })
      })
    }

    try {
      resizeObserver?.observe(element)
      mutationObserver?.observe(element, { 
        childList: true, 
        attributes: true, 
        subtree: true 
      })
    } catch (e) {
      console.warn('Element observation failed:', e)
    }
  }

  // 停止观察元素
  const unobserveElement = (element: Element) => {
    if (!element || !observedElements.value.has(element)) return
    
    observedElements.value.delete(element)
    resizeObserver?.unobserve(element)
  }

  // 获取详细的性能报告
  const getPerformanceReport = () => {
    return {
      componentName,
      metrics: metrics.value,
      grade: performanceGrade.value,
      suggestions: suggestions.value,
      renderCount: renderCount.value,
      updateCount: updateCount.value,
      avgRenderTime: renderCount.value > 0 ? metrics.value.renderTime / renderCount.value : 0,
      updateRenderRatio: renderCount.value > 0 ? updateCount.value / renderCount.value : 0
    }
  }

  // 重置性能计数器
  const resetMetrics = () => {
    renderCount.value = 0
    updateCount.value = 0
    startTime.value = 0
    lastUpdate.value = new Date()
    memoryUsage.value = 0
  }

  // 生命周期
  onMounted(() => {
    startMonitoring()
    endRender() // 记录初始渲染完成
  })

  onUnmounted(() => {
    performanceObserver?.disconnect()
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
  })

  return {
    // 状态
    metrics,
    suggestions,
    performanceGrade,
    renderCount,
    updateCount,
    
    // 方法
    startRender,
    endRender,
    recordUpdate,
    updateMemoryUsage,
    observeElement,
    unobserveElement,
    getPerformanceReport,
    resetMetrics,
    
    // 工具方法
    startMonitoring
  }
}
