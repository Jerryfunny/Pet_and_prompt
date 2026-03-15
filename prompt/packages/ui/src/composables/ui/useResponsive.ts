import { ref, computed, onMounted, onUnmounted } from 'vue'

import type { ResponsiveConfig } from '../../types/components'

/**
 * 响应式布局 Composable
 * 提供断点检测和响应式配置
 */
export function useResponsive() {
  const windowWidth = ref(window.innerWidth)

  // 断点配置
  const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280
  }

  // 更新窗口宽度
  const updateWidth = () => {
    windowWidth.value = window.innerWidth
  }

  // 当前断点
  const currentBreakpoint = computed(() => {
    const width = windowWidth.value
    if (width >= breakpoints.xl) return 'xl'
    if (width >= breakpoints.lg) return 'lg'
    if (width >= breakpoints.md) return 'md'
    if (width >= breakpoints.sm) return 'sm'
    return 'xs'
  })

  // 设备类型检测
  const isMobile = computed(() => currentBreakpoint.value === 'xs')
  const isTablet = computed(() => currentBreakpoint.value === 'sm')
  const isDesktop = computed(() => ['md', 'lg', 'xl'].includes(currentBreakpoint.value))

  // 响应式配置
  const responsiveConfig = computed((): ResponsiveConfig => ({
    breakpoints,
    currentBreakpoint: currentBreakpoint.value,
    isMobile: isMobile.value,
    isTablet: isTablet.value,
    isDesktop: isDesktop.value
  }))

  // 响应式网格配置
  const gridConfig = computed(() => {
    switch (currentBreakpoint.value) {
      case 'xs':
        return { cols: 1, xGap: 8, yGap: 8 }
      case 'sm':
        return { cols: 1, xGap: 12, yGap: 12 }
      case 'md':
        return { cols: 2, xGap: 16, yGap: 16 }
      case 'lg':
        return { cols: 2, xGap: 20, yGap: 20 }
      case 'xl':
        return { cols: 3, xGap: 24, yGap: 24 }
      default:
        return { cols: 1, xGap: 12, yGap: 12 }
    }
  })

  // 响应式间距
  const spaceSize = computed(() => {
    switch (currentBreakpoint.value) {
      case 'xs':
        return 'small' as const
      case 'sm':
        return 'small' as const
      case 'md':
        return 'medium' as const
      case 'lg':
        return 'medium' as const
      case 'xl':
        return 'large' as const
      default:
        return 'medium' as const
    }
  })

  // 响应式按钮大小
  const buttonSize = computed(() => {
    switch (currentBreakpoint.value) {
      case 'xs':
        return 'small' as const
      case 'sm':
        return 'small' as const
      default:
        return 'medium' as const
    }
  })

  // 响应式输入框大小
  const inputSize = computed(() => {
    switch (currentBreakpoint.value) {
      case 'xs':
        return 'small' as const
      case 'sm':
        return 'medium' as const
      default:
        return 'medium' as const
    }
  })

  // 响应式模态框宽度
  const modalWidth = computed(() => {
    switch (currentBreakpoint.value) {
      case 'xs':
        return '95vw'
      case 'sm':
        return '90vw'
      case 'md':
        return '80vw'
      case 'lg':
        return '70vw'
      case 'xl':
        return '60vw'
      default:
        return '80vw'
    }
  })

  // 响应式卡片内边距
  const cardPadding = computed(() => {
    switch (currentBreakpoint.value) {
      case 'xs':
        return '12px'
      case 'sm':
        return '16px'
      default:
        return '20px'
    }
  })

  // 是否应该使用垂直布局
  const shouldUseVerticalLayout = computed(() => {
    return isMobile.value || isTablet.value
  })

  // 是否应该使用紧凑模式
  const shouldUseCompactMode = computed(() => {
    return isMobile.value
  })

  // 响应式字体大小
  const fontSize = computed(() => {
    switch (currentBreakpoint.value) {
      case 'xs':
        return { small: '12px', medium: '14px', large: '16px' }
      case 'sm':
        return { small: '13px', medium: '15px', large: '17px' }
      default:
        return { small: '14px', medium: '16px', large: '18px' }
    }
  })

  onMounted(() => {
    window.addEventListener('resize', updateWidth)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth)
  })

  return {
    // 基础响应式状态
    windowWidth,
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    responsiveConfig,
    
    // 组件配置
    gridConfig,
    spaceSize,
    buttonSize,
    inputSize,
    modalWidth,
    cardPadding,
    fontSize,
    
    // 布局决策
    shouldUseVerticalLayout,
    shouldUseCompactMode,
    
    // 断点配置
    breakpoints
  }
}