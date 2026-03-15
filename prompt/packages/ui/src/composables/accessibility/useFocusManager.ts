import { ref, nextTick, computed } from 'vue'

import { useAccessibility } from './useAccessibility'

export interface FocusManagerOptions {
  /** 容器选择器或元素 */
  container?: HTMLElement | string
  /** 是否循环焦点 */
  loop?: boolean
  /** 是否包含隐藏元素 */
  includeHidden?: boolean
  /** 自定义可焦点元素选择器 */
  focusableSelector?: string
  /** 焦点变化回调 */
  onFocusChange?: (element: HTMLElement, index: number) => void
  /** 边界处理回调 */
  onBoundary?: (direction: 'start' | 'end') => void
}

export interface FocusState {
  currentIndex: number
  totalElements: number
  currentElement: HTMLElement | null
  isTrapped: boolean
  container: HTMLElement | null
}

export function useFocusManager(options: FocusManagerOptions = {}) {
  const { announce } = useAccessibility('FocusManager')
  
  // 状态管理
  const focusableElements = ref<HTMLElement[]>([])
  const currentFocusIndex = ref(-1)
  const isTrapped = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  const previousActiveElement = ref<Element | null>(null)
  
  // 默认可焦点元素选择器
  const defaultFocusableSelector = [
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'a[href]:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]:not([tabindex="-1"])',
    'audio[controls]:not([tabindex="-1"])',
    'video[controls]:not([tabindex="-1"])',
    'details summary:not([tabindex="-1"])'
  ].join(', ')
  
  // 计算属性
  const focusState = computed<FocusState>(() => ({
    currentIndex: currentFocusIndex.value,
    totalElements: focusableElements.value.length,
    currentElement: focusableElements.value[currentFocusIndex.value] || null,
    isTrapped: isTrapped.value,
    container: containerRef.value
  }))
  
  const hasValidFocus = computed(() => 
    currentFocusIndex.value >= 0 && 
    currentFocusIndex.value < focusableElements.value.length
  )
  
  // 获取容器元素
  const getContainer = (): HTMLElement => {
    if (containerRef.value) return containerRef.value
    
    const { container } = options
    if (!container) return document.body
    
    if (typeof container === 'string') {
      const element = document.querySelector(container) as HTMLElement
      if (!element) {
        console.warn(`FocusManager: Container "${container}" not found`)
        return document.body
      }
      containerRef.value = element
      return element
    }
    
    containerRef.value = container
    return container
  }
  
  // 查找可焦点元素
  const findFocusableElements = (): HTMLElement[] => {
    const container = getContainer()
    const selector = options.focusableSelector || defaultFocusableSelector
    
    const elements = Array.from(
      container.querySelectorAll(selector)
    ) as HTMLElement[]
    
    // 过滤掉不可见元素（除非特别指定包含）
    return elements.filter(element => {
      if (options.includeHidden) return true
      
      // 检查元素是否可见
      const style = window.getComputedStyle(element)
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             element.offsetWidth > 0 && 
             element.offsetHeight > 0
    })
  }
  
  // 更新可焦点元素列表
  const updateFocusableElements = () => {
    const elements = findFocusableElements()
    focusableElements.value = elements
    
    // 如果当前焦点索引无效，重置
    if (currentFocusIndex.value >= elements.length) {
      currentFocusIndex.value = elements.length > 0 ? 0 : -1
    }
    
    return elements
  }
  
  // 设置焦点到指定元素
  const focusElement = async (element: HTMLElement, announceChange = true) => {
    try {
      const index = focusableElements.value.indexOf(element)
      if (index === -1) {
        updateFocusableElements()
        const newIndex = focusableElements.value.indexOf(element)
        if (newIndex === -1) return false
        currentFocusIndex.value = newIndex
      } else {
        currentFocusIndex.value = index
      }
      
      await nextTick()
      element.focus()
      
      if (announceChange) {
        const role = element.getAttribute('role') || element.tagName.toLowerCase()
        const label = element.getAttribute('aria-label') || 
                     element.textContent?.trim() || 
                     element.getAttribute('title') || 
                     `${role} ${currentFocusIndex.value + 1}`
        
        announce(`已聚焦到 ${label}`, 'polite')
      }
      
      options.onFocusChange?.(element, currentFocusIndex.value)
      return true
      
    } catch (error) {
      console.warn('Failed to focus element:', error)
      return false
    }
  }
  
  // 设置焦点到指定索引
  const focusIndex = async (index: number, announceChange = true) => {
    const elements = focusableElements.value
    if (elements.length === 0 || index < 0 || index >= elements.length) {
      return false
    }
    
    return await focusElement(elements[index], announceChange)
  }
  
  // 移动焦点
  const moveFocus = async (direction: 'next' | 'previous' | 'first' | 'last') => {
    const elements = updateFocusableElements()
    if (elements.length === 0) return false
    
    let newIndex = currentFocusIndex.value
    
    switch (direction) {
      case 'next':
        newIndex = currentFocusIndex.value + 1
        if (newIndex >= elements.length) {
          if (options.loop) {
            newIndex = 0
          } else {
            options.onBoundary?.('end')
            return false
          }
        }
        break
        
      case 'previous':
        newIndex = currentFocusIndex.value - 1
        if (newIndex < 0) {
          if (options.loop) {
            newIndex = elements.length - 1
          } else {
            options.onBoundary?.('start')
            return false
          }
        }
        break
        
      case 'first':
        newIndex = 0
        break
        
      case 'last':
        newIndex = elements.length - 1
        break
    }
    
    return await focusIndex(newIndex)
  }
  
  // 启用焦点陷阱
  const trapFocus = async () => {
    if (isTrapped.value) return
    
    // 保存当前活动元素
    previousActiveElement.value = document.activeElement
    
    isTrapped.value = true
    const elements = updateFocusableElements()
    
    if (elements.length === 0) {
      console.warn('FocusManager: No focusable elements found')
      return
    }
    
    // 聚焦第一个元素
    await focusElement(elements[0])
    
    // 添加键盘事件监听
    const container = getContainer()
    container.addEventListener('keydown', handleKeyDown)
    
    announce('焦点已限制在当前区域内', 'assertive')
  }
  
  // 释放焦点陷阱
  const releaseFocus = () => {
    if (!isTrapped.value) return
    
    isTrapped.value = false
    
    // 移除键盘事件监听
    const container = getContainer()
    container.removeEventListener('keydown', handleKeyDown)
    
    // 恢复之前的焦点
    if (previousActiveElement.value && 
        typeof (previousActiveElement.value as HTMLElement).focus === 'function') {
      (previousActiveElement.value as HTMLElement).focus()
    }
    
    previousActiveElement.value = null
    announce('焦点限制已解除', 'polite')
  }
  
  // 键盘事件处理
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isTrapped.value) return
    
    switch (event.key) {
      case 'Tab':
        event.preventDefault()
        moveFocus(event.shiftKey ? 'previous' : 'next')
        break
        
      case 'ArrowDown':
      case 'ArrowRight':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          moveFocus('next')
        }
        break
        
      case 'ArrowUp':
      case 'ArrowLeft':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          moveFocus('previous')
        }
        break
        
      case 'Home':
        event.preventDefault()
        moveFocus('first')
        break
        
      case 'End':
        event.preventDefault()
        moveFocus('last')
        break
        
      case 'Escape':
        if (event.target !== getContainer()) {
          event.preventDefault()
          releaseFocus()
        }
        break
    }
  }
  
  // 查找最近的可焦点元素
  const findNearestFocusable = (targetElement: HTMLElement): HTMLElement | null => {
    const elements = updateFocusableElements()
    if (elements.length === 0) return null
    
    // 如果目标元素就在列表中
    const exactIndex = elements.indexOf(targetElement)
    if (exactIndex !== -1) return targetElement
    
    // 查找最近的元素
    const container = getContainer()
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          return elements.includes(node as HTMLElement) 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_SKIP
        }
      }
    )
    
    walker.currentNode = targetElement
    return walker.nextNode() as HTMLElement || walker.previousNode() as HTMLElement
  }
  
  // 确保焦点在可见区域内
  const ensureVisible = (element?: HTMLElement) => {
    const target = element || focusState.value.currentElement
    if (!target) return
    
    // 滚动到元素可见区域
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    })
  }
  
  // 创建焦点指示器
  const createFocusIndicator = () => {
    let indicator = document.getElementById('focus-manager-indicator')
    if (!indicator) {
      indicator = document.createElement('div')
      indicator.id = 'focus-manager-indicator'
      indicator.style.cssText = `
        position: absolute;
        border: 2px solid #0066cc;
        border-radius: 4px;
        pointer-events: none;
        z-index: 10000;
        transition: all 0.15s ease;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
      `
      document.body.appendChild(indicator)
    }
    return indicator
  }
  
  // 更新焦点指示器位置
  const updateFocusIndicator = () => {
    const element = focusState.value.currentElement
    if (!element) return
    
    const indicator = createFocusIndicator()
    const rect = element.getBoundingClientRect()
    
    indicator.style.left = `${rect.left - 2}px`
    indicator.style.top = `${rect.top - 2}px`
    indicator.style.width = `${rect.width + 4}px`
    indicator.style.height = `${rect.height + 4}px`
    indicator.style.display = 'block'
  }
  
  // 隐藏焦点指示器
  const hideFocusIndicator = () => {
    const indicator = document.getElementById('focus-manager-indicator')
    if (indicator) {
      indicator.style.display = 'none'
    }
  }
  
  // 清理资源
  const destroy = () => {
    releaseFocus()
    hideFocusIndicator()
    const indicator = document.getElementById('focus-manager-indicator')
    if (indicator) {
      indicator.remove()
    }
  }
  
  return {
    // 状态
    focusState,
    focusableElements: focusableElements,
    hasValidFocus,
    
    // 方法
    updateFocusableElements,
    focusElement,
    focusIndex,
    moveFocus,
    trapFocus,
    releaseFocus,
    findNearestFocusable,
    ensureVisible,
    updateFocusIndicator,
    hideFocusIndicator,
    destroy
  }
}