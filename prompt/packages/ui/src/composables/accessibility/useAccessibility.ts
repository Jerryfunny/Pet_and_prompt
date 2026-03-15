import { ref, computed, onMounted, onUnmounted } from 'vue'

import { useI18n } from 'vue-i18n'

export interface KeyboardNavigation {
  handleKeyPress: (event: KeyboardEvent) => boolean
  focusNext: () => void
  focusPrevious: () => void
  focusFirst: () => void
  focusLast: () => void
  setFocusableElements: (elements: HTMLElement[]) => void
}

export interface ARIALabels {
  getLabel: (key: string, fallback?: string) => string
  getDescription: (key: string, fallback?: string) => string
  getRole: (element: string) => string
  getLiveRegionText: (key: string) => string
}

export interface AccessibilityFeatures {
  reduceMotion: boolean
  highContrast: boolean
  screenReaderMode: boolean
  keyboardOnly: boolean
}

export function useAccessibility(componentName: string = 'Component') {
  const { t } = useI18n()
  
  // 焦点管理
  const focusableElements = ref<HTMLElement[]>([])
  const currentFocusIndex = ref(-1)
  const trapFocus = ref(false)
  
  // 辅助功能检测
  const features = ref<AccessibilityFeatures>({
    reduceMotion: false,
    highContrast: false,
    screenReaderMode: false,
    keyboardOnly: false
  })
  
  // 实时区域消息
  const liveRegionMessage = ref('')
  const announcements = ref<string[]>([])
  
  // 键盘导航处理
  const keyboard: KeyboardNavigation = {
    handleKeyPress: (event: KeyboardEvent): boolean => {
      // 简化键盘支持：仅在启用焦点陷阱时处理 Tab 循环与 Escape 通知，避免影响正常输入（如箭头键移动光标）
      if (!trapFocus.value || focusableElements.value.length === 0) {
        return false
      }

      const target = event.target as HTMLElement | null
      const isEditable = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable === true
      )

      switch (event.key) {
        case 'Tab':
          // 在输入区域放行 Tab，不做拦截；非输入区域才用于焦点循环
          if (isEditable) return false
          handleTabNavigation(event)
          return true
        case 'Escape':
          // 不阻止默认，仅发送 escape 事件，交由上层自行处理
          handleEscapeKey()
          return false
        default:
          // 不拦截其他按键（包含方向键/Home/End等）
          return false
      }
    },
    
    focusNext: () => {
      if (focusableElements.value.length === 0) return
      currentFocusIndex.value = Math.min(
        currentFocusIndex.value + 1,
        focusableElements.value.length - 1
      )
      focusableElements.value[currentFocusIndex.value]?.focus()
    },
    
    focusPrevious: () => {
      if (focusableElements.value.length === 0) return
      currentFocusIndex.value = Math.max(currentFocusIndex.value - 1, 0)
      focusableElements.value[currentFocusIndex.value]?.focus()
    },
    
    focusFirst: () => {
      if (focusableElements.value.length === 0) return
      currentFocusIndex.value = 0
      focusableElements.value[0]?.focus()
    },
    
    focusLast: () => {
      if (focusableElements.value.length === 0) return
      currentFocusIndex.value = focusableElements.value.length - 1
      focusableElements.value[currentFocusIndex.value]?.focus()
    },
    
    setFocusableElements: (elements: HTMLElement[]) => {
      focusableElements.value = elements
      currentFocusIndex.value = elements.length > 0 ? 0 : -1
    }
  }
  
  // ARIA标签管理
  const aria: ARIALabels = {
    getLabel: (key: string, fallback?: string): string => {
      return t(`accessibility.labels.${key}`, fallback || key)
    },
    
    getDescription: (key: string, fallback?: string): string => {
      return t(`accessibility.descriptions.${key}`, fallback || '')
    },
    
    getRole: (element: string): string => {
      const roleMap: Record<string, string> = {
        button: 'button',
        input: 'textbox',
        select: 'combobox',
        checkbox: 'checkbox',
        radio: 'radio',
        link: 'link',
        tab: 'tab',
        tabpanel: 'tabpanel',
        dialog: 'dialog',
        menu: 'menu',
        menuitem: 'menuitem',
        list: 'list',
        listitem: 'listitem',
        alert: 'alert',
        status: 'status'
      }
      return roleMap[element] || 'generic'
    },
    
    getLiveRegionText: (key: string): string => {
      return t(`accessibility.liveRegion.${key}`, key)
    }
  }
  
  // Tab导航处理
  const handleTabNavigation = (event: KeyboardEvent) => {
    const isShiftTab = event.shiftKey
    const focusedElement = document.activeElement as HTMLElement
    const currentIndex = focusableElements.value.indexOf(focusedElement)
    
    if (currentIndex !== -1) {
      currentFocusIndex.value = currentIndex
    }
    
    event.preventDefault()
    
    if (isShiftTab) {
      keyboard.focusPrevious()
    } else {
      keyboard.focusNext()
    }
  }
  
  // Escape键处理
  const handleEscapeKey = () => {
    // 发出escape事件让父组件处理
    document.dispatchEvent(new CustomEvent('accessibility:escape', {
      detail: { componentName }
    }))
  }
  
  // 查找可聚焦元素
  const updateFocusableElements = (container?: HTMLElement) => {
    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')
    
    const containerEl = container || document.body
    const elements = Array.from(
      containerEl.querySelectorAll(focusableSelector)
    ) as HTMLElement[]
    
    keyboard.setFocusableElements(elements)
  }
  
  // 宣布消息给屏幕阅读器
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announcements.value.push(message)
    liveRegionMessage.value = message
    
    // 清除消息，让屏幕阅读器重新读取
    setTimeout(() => {
      liveRegionMessage.value = ''
    }, 100)
    
    // 限制消息队列长度
    if (announcements.value.length > 5) {
      announcements.value = announcements.value.slice(-5)
    }
  }
  
  // 检测辅助功能偏好
  const detectAccessibilityFeatures = () => {
    if (typeof window === 'undefined') return
    
    // 检测动画偏好
    if (window.matchMedia) {
      const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      features.value.reduceMotion = reduceMotionQuery.matches
      
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
      features.value.highContrast = highContrastQuery.matches
      
      // 监听变化
      reduceMotionQuery.addEventListener('change', (e) => {
        features.value.reduceMotion = e.matches
      })
      
      highContrastQuery.addEventListener('change', (e) => {
        features.value.highContrast = e.matches
      })
    }
    
    // 检测屏幕阅读器
    features.value.screenReaderMode = window.navigator.userAgent.includes('NVDA') ||
      window.navigator.userAgent.includes('JAWS') ||
      !!document.querySelector('[data-screen-reader]')
    
    // 检测仅键盘用户
    let hasMouseMovement = false
    const handleMouseMove = () => {
      if (!hasMouseMovement) {
        hasMouseMovement = true
        features.value.keyboardOnly = false
        document.removeEventListener('mousemove', handleMouseMove)
      }
    }
    
    const handleKeydown = () => {
      if (!hasMouseMovement) {
        features.value.keyboardOnly = true
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keydown', handleKeydown)
  }
  
  // 启用焦点陷阱
  const enableFocusTrap = (container?: HTMLElement) => {
    trapFocus.value = true
    updateFocusableElements(container)
    
    // 立即聚焦第一个元素
    if (focusableElements.value.length > 0) {
      focusableElements.value[0].focus()
    }
  }
  
  // 禁用焦点陷阱
  const disableFocusTrap = () => {
    trapFocus.value = false
    focusableElements.value = []
    currentFocusIndex.value = -1
  }
  
  // 计算属性
  const accessibilityClasses = computed(() => ({
    'reduce-motion': features.value.reduceMotion,
    'high-contrast': features.value.highContrast,
    'screen-reader': features.value.screenReaderMode,
    'keyboard-only': features.value.keyboardOnly
  }))
  
  const isAccessibilityMode = computed(() => 
    features.value.screenReaderMode || 
    features.value.keyboardOnly || 
    features.value.highContrast
  )
  
  // 生命周期
  onMounted(() => {
    detectAccessibilityFeatures()
    
    // 添加全局键盘事件监听
    document.addEventListener('keydown', keyboard.handleKeyPress)
  })
  
  onUnmounted(() => {
    document.removeEventListener('keydown', keyboard.handleKeyPress)
    disableFocusTrap()
  })
  
  return {
    // 状态
    features,
    focusableElements,
    currentFocusIndex,
    trapFocus,
    liveRegionMessage,
    announcements,
    
    // 计算属性
    accessibilityClasses,
    isAccessibilityMode,
    
    // 方法
    keyboard,
    aria,
    announce,
    enableFocusTrap,
    disableFocusTrap,
    updateFocusableElements,
    detectAccessibilityFeatures
  }
}

// 导出常用ARIA属性帮助函数
export const createAriaProps = (
  labelKey: string, 
  descriptionKey?: string,
  role?: string
) => ({
  'aria-label': labelKey,
  'aria-describedby': descriptionKey ? `${descriptionKey}-desc` : undefined,
  'role': role
})

// 导出键盘快捷键常量
export const KEYBOARD_SHORTCUTS = {
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End'
} as const
