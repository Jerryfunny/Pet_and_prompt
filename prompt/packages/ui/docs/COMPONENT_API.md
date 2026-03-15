# Naive UI 重构组件文档

## 概述

本文档记录了经过 Naive UI 重构后的所有核心组件，包括新增的可访问性功能、性能优化和响应式支持。所有组件均符合 WCAG 2.1 AA/AAA 标准，提供完整的键盘导航和屏幕阅读器支持。

## 组件架构

### 设计原则
- **SOLID**: 单一职责、开闭原则、里氏替换、接口隔离、依赖倒置
- **KISS**: 保持简单，避免过度复杂的设计
- **DRY**: 避免重复代码，统一通用逻辑
- **YAGNI**: 只实现当前需要的功能

### 技术栈
- **Vue 3**: Composition API + TypeScript
- **Naive UI**: 现代化组件库
- **无障碍**: WCAG 2.1 AA/AAA 标准
- **响应式**: 移动端优先设计
- **性能**: 虚拟化、防抖节流、懒加载

## 核心组件

### 1. ContextEditor（上下文编辑器）

**描述**: 完全重构的上下文编辑器，提供消息管理、变量处理和工具配置功能。

**文件位置**: `packages/ui/src/components/ContextEditor.vue`

#### Props

```typescript
interface ContextEditorProps {
  /** 模态框可见性 */
  visible: boolean
  /** 上下文状态数据 */
  state: ContextState
  /** 只读模式 */
  readonly?: boolean
  /** 自定义样式类名 */
  customClass?: string
  /** 尺寸大小 */
  size?: 'small' | 'medium' | 'large'
  /** 全局可用变量（用于变量解析和预览） */
  availableVariables?: Record<string, string>
}

interface ContextState {
  /** 消息列表 */
  messages: ConversationMessage[]
  /** 变量映射 */
  variables: Record<string, string>
  /** 工具配置 */
  tools: ToolConfig[]
  /** 显示变量预览 */
  showVariablePreview: boolean
  /** 显示工具管理器 */
  showToolManager: boolean
  /** 编辑模式 */
  mode: 'edit' | 'preview'
}
```

#### Events

```typescript
interface ContextEditorEmits {
  /** 保存上下文 */
  save: (context: ContextState) => void
  /** 取消编辑 */
  cancel: () => void
  /** 更新可见性 */
  'update:visible': (visible: boolean) => void
  /** 上下文状态更新 */
  'update:state': (state: ContextState) => void
  /** 上下文内容变更 */
  contextChange: (context: ContextState) => void
}
```

#### Slots

```vue
<template>
  <ContextEditor>
    <!-- 自定义工具栏 -->
    <template #toolbar>
      <NButton>自定义按钮</NButton>
    </template>
    
    <!-- 自定义底部 -->
    <template #footer>
      <div class="custom-footer">自定义内容</div>
    </template>
  </ContextEditor>
</template>
```

#### 功能特性

- **多标签页界面**: 消息编辑、变量管理、工具配置三个标签页
- **变量管理**: 上下文级变量覆盖，不影响全局变量
- **预定义变量保护**: 防止覆盖系统预定义变量
- **变量预览与缺失检测**: 实时显示变量替换结果和缺失变量
- **直接持久化**: 编辑内容实时保存，无需手动保存
- **导入导出支持**: 支持上下文集合的批量导入导出

#### 变量标签页

变量标签页专门用于管理上下文级变量覆盖：

1. **变量列表**: 显示变量名、当前值、来源（覆盖/全局/预定义）和状态
2. **新增/编辑**: 支持添加或修改上下文变量，自动校验格式和预定义冲突
3. **删除覆盖**: 删除覆盖项后回退到全局或预定义值
4. **缺失变量处理**: 点击缺失变量按钮直接进入上下文变量编辑

#### 可访问性特性

- **ARIA**: 完整的 `role`、`aria-label`、`aria-describedby` 支持
- **键盘导航**: Tab、Enter、Escape、方向键导航
- **屏幕阅读器**: 实时状态通知和上下文变更提示
- **焦点管理**: 自动焦点陷阱和还原

#### 使用示例

```vue
<template>
  <div>
    <NButton @click="showEditor = true">
      打开编辑器
    </NButton>
    
    <ContextEditor
      v-model:visible="showEditor"
      :state="contextState"
      :available-variables="availableVariables"
      @save="handleSave"
      @cancel="handleCancel"
      @update:state="handleStateUpdate"
      @contextChange="handleContextChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ContextEditor, type ContextState } from '@prompt-optimizer/ui'

const showEditor = ref(false)

// 上下文状态数据
const contextState = ref<ContextState>({
  messages: [
    { role: 'user', content: 'Hello {{name}}' },
    { role: 'assistant', content: 'Hi there!' }
  ],
  variables: { name: 'World' }, // 上下文覆盖变量
  tools: [],
  showVariablePreview: true,
  showToolManager: true,
  mode: 'edit'
})

// 全局可用变量（包括预定义和全局变量）
const availableVariables = ref<Record<string, string>>({
  currentDate: new Date().toISOString(),
  userName: 'Default User',
  // 其他全局变量...
})

const handleSave = (context: ContextState) => {
  console.log('Context saved:', context)
  showEditor.value = false
}

const handleCancel = () => {
  showEditor.value = false
}

const handleStateUpdate = (state: ContextState) => {
  console.log('State updated:', state)
  // 实时持久化逻辑
}

const handleContextChange = (context: ContextState) => {
  console.log('Context changed:', context)
  // 上下文变更处理逻辑
}
</script>
```

---

### 2. ToolCallDisplay（工具调用显示）

**描述**: 用于显示和管理工具调用结果的折叠面板组件。

**文件位置**: `packages/ui/src/components/ToolCallDisplay.vue`

#### Props

```typescript
interface ToolCallDisplayProps {
  /** 工具调用列表 */
  toolCalls?: ToolCall[]
  /** 初始折叠状态 */
  collapsed?: boolean
  /** 组件大小 */
  size?: 'small' | 'medium' | 'large'
  /** 最大显示数量 */
  maxItems?: number
}

interface ToolCall {
  /** 调用ID */
  id: string
  /** 工具名称 */
  name: string
  /** 调用参数 */
  arguments?: Record<string, any>
  /** 调用结果 */
  result?: any
  /** 错误信息 */
  error?: string
  /** 调用状态 */
  status: 'pending' | 'success' | 'error'
  /** 时间戳 */
  timestamp: number
}
```

#### 特性

- **智能折叠**: 根据内容长度自动调整显示
- **状态标识**: 成功、失败、等待状态的视觉区分
- **JSON 格式化**: 美化显示复杂参数和结果
- **错误处理**: 优雅处理循环引用和无效数据
- **性能优化**: 虚拟滚动支持大量数据

#### 使用示例

```vue
<template>
  <ToolCallDisplay
    :tool-calls="toolCalls"
    :collapsed="false"
    size="medium"
    :max-items="50"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ToolCallDisplay, type ToolCall } from '@prompt-optimizer/ui'

const toolCalls = ref<ToolCall[]>([
  {
    id: 'call_1',
    name: 'get_weather',
    arguments: { location: 'Beijing', unit: 'celsius' },
    result: { temperature: 25, condition: 'sunny' },
    status: 'success',
    timestamp: Date.now()
  },
  {
    id: 'call_2',
    name: 'send_email',
    arguments: { to: 'user@example.com', subject: 'Test' },
    error: 'Network timeout',
    status: 'error',
    timestamp: Date.now()
  }
])
</script>
```

---

### 3. ScreenReaderSupport（屏幕阅读器支持）

**描述**: 专门为屏幕阅读器用户提供增强支持的组件。

**文件位置**: `packages/ui/src/components/ScreenReaderSupport.vue`

#### Props

```typescript
interface ScreenReaderSupportProps {
  /** 增强模式 */
  enhanced?: boolean
  /** 显示导航帮助 */
  showNavigationHelp?: boolean
  /** 显示快捷键帮助 */
  showShortcutHelp?: boolean
  /** 自动通知 */
  autoAnnounce?: boolean
}
```

#### 功能特性

- **实时区域**: `aria-live` 区域用于状态更新通知
- **快捷键支持**: 全局键盘快捷键处理
- **导航提示**: 页面结构和导航帮助
- **上下文感知**: 根据当前焦点提供相关提示

#### Methods

```typescript
interface ScreenReaderSupportMethods {
  /** 发送通知消息 */
  announce(message: string, priority: 'polite' | 'assertive'): void
  /** 显示快捷键帮助 */
  showShortcuts(): void
  /** 显示导航帮助 */
  showNavigation(): void
}
```

#### 使用示例

```vue
<template>
  <div>
    <ScreenReaderSupport
      ref="screenReader"
      :enhanced="accessibilityMode"
      :show-navigation-help="showNav"
      :show-shortcut-help="showShortcuts"
      @shortcut="handleShortcut"
    />
    
    <NButton @click="notifyUser">
      发送通知
    </NButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ScreenReaderSupport } from '@prompt-optimizer/ui'

const screenReader = ref<InstanceType<typeof ScreenReaderSupport>>()
const accessibilityMode = ref(false)
const showNav = ref(false)
const showShortcuts = ref(false)

const notifyUser = () => {
  screenReader.value?.announce('操作完成', 'polite')
}

const handleShortcut = (key: string) => {
  console.log('快捷键触发:', key)
}
</script>
```

---

## Composables（组合式函数）

### 1. useAccessibility（可访问性支持）

**描述**: 提供全面的可访问性功能，包括键盘导航、ARIA 管理和屏幕阅读器支持。

**文件位置**: `packages/ui/src/composables/useAccessibility.ts`

#### API

```typescript
function useAccessibility(componentName?: string): {
  // 键盘导航
  keyboard: {
    handleKeyPress: (event: KeyboardEvent) => boolean
    setFocusableElements: (elements: HTMLElement[]) => void
    focusNext: () => void
    focusPrevious: () => void
    focusFirst: () => void
    focusLast: () => void
  }
  
  // ARIA 标签管理
  aria: {
    getLabel: (key: string, fallback?: string) => string
    getDescription: (key: string, fallback?: string) => string
    getRole: (elementType: string) => string
    getLiveRegionText: (key: string) => string
  }
  
  // 消息通知
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  
  // 焦点管理
  enableFocusTrap: () => void
  disableFocusTrap: () => void
  
  // 响应式状态
  focusableElements: Ref<HTMLElement[]>
  currentFocusIndex: Ref<number>
  trapFocus: Ref<boolean>
  isAccessibilityMode: Ref<boolean>
  accessibilityClasses: Ref<Record<string, boolean>>
  liveRegionMessage: Ref<string>
  announcements: Ref<string[]>
  features: Ref<AccessibilityFeatures>
}

interface AccessibilityFeatures {
  reduceMotion: boolean
  highContrast: boolean
  screenReaderMode: boolean
  keyboardOnly: boolean
}
```

#### 使用示例

```vue
<template>
  <div :class="accessibilityClasses">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      :aria-label="aria.getLabel('item', item.name)"
      @keydown="keyboard.handleKeyPress"
    >
      {{ item.name }}
    </button>
    
    <div
      role="status"
      aria-live="polite"
      class="sr-only"
    >
      {{ liveRegionMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAccessibility } from '@prompt-optimizer/ui'

const items = ref([
  { id: 1, name: '项目1' },
  { id: 2, name: '项目2' },
  { id: 3, name: '项目3' }
])

const {
  keyboard,
  aria,
  announce,
  enableFocusTrap,
  disableFocusTrap,
  accessibilityClasses,
  liveRegionMessage
} = useAccessibility('MyComponent')

onMounted(() => {
  const buttons = document.querySelectorAll('button')
  keyboard.setFocusableElements(Array.from(buttons) as HTMLElement[])
  enableFocusTrap()
  
  announce('组件已加载', 'polite')
})
</script>
```

---

### 2. useFocusManager（焦点管理）

**描述**: 专业的焦点管理系统，支持焦点陷阱、键盘导航和自动焦点恢复。

**文件位置**: `packages/ui/src/composables/useFocusManager.ts`

#### API

```typescript
function useFocusManager(options: FocusManagerOptions = {}): {
  // 核心方法
  trapFocus: () => Promise<void>
  releaseFocus: () => void
  moveFocusNext: () => boolean
  moveFocusPrevious: () => boolean
  focusFirstElement: () => boolean
  focusLastElement: () => boolean
  
  // 工具方法
  updateFocusableElements: () => HTMLElement[]
  isFocusable: (element: HTMLElement) => boolean
  
  // 响应式状态
  focusableElements: Ref<HTMLElement[]>
  currentFocusIndex: Ref<number>
  isTrapped: Ref<boolean>
  lastFocusedElement: Ref<HTMLElement | null>
}

interface FocusManagerOptions {
  container?: string | HTMLElement
  autoTrap?: boolean
  restoreFocus?: boolean
  skipHidden?: boolean
}
```

#### 使用示例

```vue
<template>
  <div ref="containerRef" class="focus-container">
    <h2>焦点管理示例</h2>
    <NButton @click="trapFocus">启用焦点陷阱</NButton>
    <NButton @click="releaseFocus">释放焦点陷阱</NButton>
    <NInput placeholder="输入框1" />
    <NInput placeholder="输入框2" />
    <NButton>确认</NButton>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFocusManager } from '@prompt-optimizer/ui'

const containerRef = ref<HTMLElement>()

const {
  trapFocus,
  releaseFocus,
  moveFocusNext,
  moveFocusPrevious,
  focusableElements,
  currentFocusIndex,
  isTrapped
} = useFocusManager({
  container: containerRef,
  restoreFocus: true
})

onMounted(() => {
  // 监听键盘事件
  document.addEventListener('keydown', (e) => {
    if (!isTrapped.value) return
    
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        moveFocusPrevious()
      } else {
        moveFocusNext()
      }
    }
  })
})
</script>
```

---

### 3. useAccessibilityTesting（可访问性测试）

**描述**: WCAG 合规性自动化测试工具，用于检测和验证可访问性问题。

**文件位置**: `packages/ui/src/composables/useAccessibilityTesting.ts`

#### API

```typescript
function useAccessibilityTesting(): {
  runTest: (options: TestOptions) => Promise<TestResult>
  runSingleRule: (rule: string, scope?: Element) => TestResult
  getAvailableRules: () => TestRule[]
}

interface TestOptions {
  scope?: Element
  wcagLevel?: 'A' | 'AA' | 'AAA'
  rules?: string[]
  includeWarnings?: boolean
}

interface TestResult {
  score: number
  issues: AccessibilityIssue[]
  warnings: AccessibilityIssue[]
  passedRules: string[]
  timestamp: number
}

interface AccessibilityIssue {
  rule: string
  severity: 'critical' | 'major' | 'minor'
  message: string
  element?: HTMLElement
  wcagLevel: 'A' | 'AA' | 'AAA'
}
```

#### 使用示例

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAccessibilityTesting } from '@prompt-optimizer/ui'

const { runTest, runSingleRule } = useAccessibilityTesting()

onMounted(async () => {
  // 运行全面测试
  const result = await runTest({
    scope: document.body,
    wcagLevel: 'AA',
    includeWarnings: true
  })
  
  console.log('可访问性测试结果:', result)
  
  if (result.score < 80) {
    console.warn('可访问性分数较低:', result.score)
    result.issues.forEach(issue => {
      console.error(`${issue.rule}: ${issue.message}`)
    })
  }
  
  // 单独测试某个规则
  const imgAltResult = runSingleRule('img-alt')
  if (imgAltResult.issues.length > 0) {
    console.warn('图片缺少alt属性')
  }
})
</script>
```

---

## 样式系统

### CSS 类命名约定

所有组件遵循统一的 CSS 类命名规范：

```scss
// 基础组件类
.component-name {
  // 基础样式
}

// 状态类
.component-name--state {
  // 状态样式
}

// 修饰符类
.component-name__element {
  // 元素样式
}

// 可访问性相关类
.sr-only {
  // 仅屏幕阅读器可见
}

.keyboard-focus {
  // 键盘焦点样式
}

.accessibility-mode {
  // 可访问性模式样式
}
```

### 响应式断点

```scss
// 移动端
@media (max-width: 767px) {
  .responsive-mobile { /* 样式 */ }
}

// 平板端
@media (min-width: 768px) and (max-width: 1023px) {
  .responsive-tablet { /* 样式 */ }
}

// 桌面端
@media (min-width: 1024px) {
  .responsive-desktop { /* 样式 */ }
}
```

---

## 性能优化

### 1. 懒加载和代码分割

```typescript
// 组件懒加载
const ContextEditor = defineAsyncComponent(
  () => import('./components/ContextEditor.vue')
)

// 路由级别代码分割
const routes = [
  {
    path: '/editor',
    component: () => import('./pages/EditorPage.vue')
  }
]
```

### 2. 虚拟化支持

```vue
<template>
  <!-- 大量数据的虚拟列表 -->
  <VirtualList
    :items="largeDataset"
    :item-height="50"
    :visible-count="10"
  >
    <template #item="{ item }">
      <div class="virtual-item">{{ item.name }}</div>
    </template>
  </VirtualList>
</template>
```

### 3. 防抖和节流

```typescript
import { useDebounceThrottle } from '@prompt-optimizer/ui'

const { debounce, throttle } = useDebounceThrottle()

// 搜索输入防抖
const handleSearch = debounce((query: string) => {
  // 执行搜索逻辑
}, 300)

// 滚动事件节流
const handleScroll = throttle(() => {
  // 处理滚动逻辑
}, 16)
```

---

## 国际化支持

### 语言配置

```typescript
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})
```

### 可访问性文本

```typescript
// zh-CN.ts
export default {
  accessibility: {
    labels: {
      contextEditor: '上下文编辑器',
      closeButton: '关闭按钮',
      saveButton: '保存按钮'
    },
    descriptions: {
      contextEditor: '编辑消息、变量和工具配置',
      navigationHelp: '使用Tab键在元素间导航'
    },
    announcements: {
      saved: '内容已保存',
      loading: '正在加载中',
      error: '发生错误，请重试'
    }
  }
}
```

---

## 测试策略

### 1. 单元测试

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContextEditor from '../ContextEditor.vue'

describe('ContextEditor', () => {
  it('应该正确渲染基本结构', () => {
    const wrapper = mount(ContextEditor, {
      props: {
        visible: true,
        state: {
          messages: [],
          variables: {},
          tools: []
        }
      }
    })
    
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })
})
```

### 2. 可访问性测试

```typescript
import { useAccessibilityTesting } from '@prompt-optimizer/ui'

describe('Accessibility Tests', () => {
  it('应该通过WCAG AA标准', async () => {
    const { runTest } = useAccessibilityTesting()
    const result = await runTest({ wcagLevel: 'AA' })
    
    expect(result.score).toBeGreaterThan(80)
    expect(result.issues.filter(i => i.severity === 'critical')).toHaveLength(0)
  })
})
```

### 3. E2E 测试

```typescript
describe('端到端测试', () => {
  it('应该支持完整的用户流程', async () => {
    // 测试完整的用户交互流程
    await page.goto('/')
    await page.click('[data-testid="open-editor"]')
    await page.fill('[aria-label="消息输入框"]', '测试内容')
    await page.click('[aria-label="保存按钮"]')
    
    expect(await page.textContent('[role="status"]')).toContain('保存成功')
  })
})
```

---

## 部署和构建

### 1. 构建配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PromptOptimizerUI',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['vue', 'naive-ui'],
      output: {
        globals: {
          vue: 'Vue',
          'naive-ui': 'NaiveUI'
        }
      }
    }
  }
})
```

### 2. 包管理

```json
{
  "name": "@prompt-optimizer/ui",
  "version": "1.0.0",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./style": "./dist/style.css"
  }
}
```

---

## 最佳实践

### 1. 组件开发指南

1. **始终使用TypeScript**: 提供类型安全和更好的开发体验
2. **遵循可访问性标准**: 确保所有组件符合WCAG 2.1 AA标准
3. **编写测试**: 单元测试、集成测试和E2E测试覆盖
4. **性能优化**: 使用虚拟化、懒加载和防抖节流
5. **响应式设计**: 移动端优先，适配不同屏幕尺寸

### 2. 代码风格

```typescript
// 推荐的组件结构
<template>
  <div class="component-name" :class="componentClasses">
    <!-- 内容 -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAccessibility } from '../composables/useAccessibility'

// Props 定义
interface Props {
  visible: boolean
  readonly?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

// Emits 定义
interface Emits {
  'update:visible': [visible: boolean]
}
const emit = defineEmits<Emits>()

// 可访问性支持
const { accessibility } = useAccessibility('ComponentName')

// 响应式状态
const localVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 计算属性
const componentClasses = computed(() => ({
  'component-name--readonly': props.readonly,
  ...accessibility.classes.value
}))
</script>

<style scoped>
.component-name {
  /* 基础样式 */
}

.component-name--readonly {
  /* 只读状态样式 */
}
</style>
```

### 3. 可访问性检查清单

- [ ] 所有交互元素都有适当的ARIA标签
- [ ] 键盘导航功能完整
- [ ] 颜色对比度符合WCAG标准
- [ ] 屏幕阅读器兼容性测试通过
- [ ] 焦点管理正确实现
- [ ] 状态变更有适当的通知

---

## 更新日志

### v1.0.0 (2024-XX-XX)
- ✨ 完成Naive UI重构
- ✨ 新增完整可访问性支持
- ✨ 实现响应式布局
- ✨ 添加性能优化特性
- ✨ 完整的TypeScript类型支持
- ✨ 国际化支持
- ✨ 完整的测试套件

---

## 反馈和支持

如有问题或建议，请通过以下方式联系：

- **GitHub Issues**: [项目仓库](https://github.com/your-repo/prompt-optimizer)
- **文档更新**: 欢迎提交PR改进文档
- **功能请求**: 在Issues中标记为Feature Request

---

*最后更新时间: 2024年XX月XX日*