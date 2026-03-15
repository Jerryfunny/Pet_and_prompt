# 可访问性功能完整指南

## 概述

本文档详细介绍了Prompt Optimizer UI组件库中的可访问性功能。我们的组件完全符合WCAG 2.1 AA/AAA标准，为所有用户（包括残障用户）提供平等的使用体验。

## 核心特性

### 🎯 WCAG 2.1 合规性
- **A级**: 基础可访问性要求
- **AA级**: 推荐的可访问性标准
- **AAA级**: 最高级别的可访问性支持

### ⌨️ 键盘导航
- Tab键循环导航
- Enter键激活元素
- Escape键关闭模态框
- 方向键导航列表和菜单
- Home/End键快速定位

### 🔊 屏幕阅读器支持
- 完整的ARIA标签体系
- 实时区域状态通知
- 语义化HTML结构
- 上下文敏感的描述

### 👀 视觉辅助
- 高对比度模式
- 可调节字体大小
- 聚焦指示器
- 减少动画选项

## 详细功能介绍

### 1. useAccessibility Composable

这是我们可访问性功能的核心，提供完整的可访问性支持：

```typescript
import { useAccessibility } from '@prompt-optimizer/ui'

const {
  keyboard,      // 键盘导航
  aria,         // ARIA标签管理
  announce,     // 屏幕阅读器通知
  features,     // 可访问性特性检测
  enableFocusTrap,  // 启用焦点陷阱
  disableFocusTrap  // 禁用焦点陷阱
} = useAccessibility('MyComponent')
```

#### 键盘导航支持

```vue
<template>
  <div @keydown="keyboard.handleKeyPress">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      :tabindex="index === currentFocusIndex ? 0 : -1"
      @focus="currentFocusIndex = index"
    >
      {{ item.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAccessibility } from '@prompt-optimizer/ui'

const items = ref([
  { id: 1, name: '选项1' },
  { id: 2, name: '选项2' },
  { id: 3, name: '选项3' }
])

const {
  keyboard,
  currentFocusIndex,
  focusableElements
} = useAccessibility('MenuComponent')

onMounted(() => {
  // 设置可聚焦元素
  const buttons = document.querySelectorAll('button')
  keyboard.setFocusableElements(Array.from(buttons))
})
</script>
```

#### ARIA标签管理

```vue
<template>
  <div>
    <button
      :aria-label="aria.getLabel('save', '保存按钮')"
      :aria-describedby="aria.getDescription('save', '保存当前编辑的内容')"
      role="button"
    >
      保存
    </button>
    
    <div
      role="status"
      :aria-live="aria.getLiveRegionText('status')"
      class="sr-only"
    >
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAccessibility } from '@prompt-optimizer/ui'

const { aria, announce } = useAccessibility('SaveButton')
const statusMessage = ref('')

const handleSave = () => {
  statusMessage.value = '正在保存...'
  announce('正在保存内容', 'polite')
  
  // 模拟保存操作
  setTimeout(() => {
    statusMessage.value = '保存完成'
    announce('内容已成功保存', 'polite')
  }, 1000)
}
</script>
```

### 2. 焦点管理系统

#### useFocusManager Composable

专业的焦点管理，支持焦点陷阱和自动恢复：

```vue
<template>
  <div ref="containerRef" class="modal">
    <h2>模态框标题</h2>
    <input v-model="inputValue" placeholder="输入内容" />
    <div class="button-group">
      <button @click="confirm">确认</button>
      <button @click="cancel">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFocusManager } from '@prompt-optimizer/ui'

const containerRef = ref<HTMLElement>()
const inputValue = ref('')

const {
  trapFocus,
  releaseFocus,
  moveFocusNext,
  moveFocusPrevious,
  isTrapped
} = useFocusManager({
  container: containerRef,
  restoreFocus: true
})

onMounted(() => {
  // 自动启用焦点陷阱
  trapFocus()
  
  // 监听键盘事件
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  releaseFocus()
  document.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
  if (!isTrapped.value) return
  
  switch (e.key) {
    case 'Tab':
      e.preventDefault()
      if (e.shiftKey) {
        moveFocusPrevious()
      } else {
        moveFocusNext()
      }
      break
    case 'Escape':
      cancel()
      break
  }
}

const confirm = () => {
  console.log('确认:', inputValue.value)
  releaseFocus()
}

const cancel = () => {
  releaseFocus()
}
</script>
```

### 3. 屏幕阅读器支持组件

#### ScreenReaderSupport 组件

专门为屏幕阅读器用户提供增强支持：

```vue
<template>
  <div>
    <!-- 您的应用内容 -->
    <main role="main">
      <h1>应用标题</h1>
      <p>应用内容...</p>
    </main>
    
    <!-- 屏幕阅读器支持组件 -->
    <ScreenReaderSupport
      ref="screenReader"
      :enhanced="true"
      :show-navigation-help="showNavHelp"
      :show-shortcut-help="showShortcutHelp"
      @shortcut="handleShortcut"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ScreenReaderSupport } from '@prompt-optimizer/ui'

const screenReader = ref<InstanceType<typeof ScreenReaderSupport>>()
const showNavHelp = ref(false)
const showShortcutHelp = ref(false)

const handleShortcut = (shortcut: string) => {
  switch (shortcut) {
    case 'Ctrl+/':
      showShortcutHelp.value = !showShortcutHelp.value
      break
    case 'Alt+H':
      showNavHelp.value = !showNavHelp.value
      break
    case 'Alt+S':
      // 跳转到搜索框
      document.querySelector('input[type="search"]')?.focus()
      break
  }
}

// 发送通知给屏幕阅读器
const notifyUser = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  screenReader.value?.announce(message, priority)
}

// 在操作完成后发送通知
const handleSave = () => {
  // 保存逻辑
  notifyUser('内容已保存')
}

const handleError = () => {
  // 错误处理
  notifyUser('保存失败，请重试', 'assertive')
}
</script>
```

### 4. 可访问性测试工具

#### useAccessibilityTesting Composable

自动化的可访问性合规性检查：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAccessibilityTesting } from '@prompt-optimizer/ui'

const testResults = ref<any>(null)
const isLoading = ref(false)

const { runTest, runSingleRule, getAvailableRules } = useAccessibilityTesting()

onMounted(async () => {
  await runAccessibilityTests()
})

const runAccessibilityTests = async () => {
  isLoading.value = true
  
  try {
    // 运行完整的可访问性测试
    const result = await runTest({
      scope: document.body,
      wcagLevel: 'AA',
      includeWarnings: true
    })
    
    testResults.value = result
    
    // 报告结果
    console.log('可访问性测试结果:')
    console.log(`总体分数: ${result.score}`)
    console.log(`通过的规则: ${result.passedRules.length}`)
    console.log(`发现的问题: ${result.issues.length}`)
    console.log(`警告: ${result.warnings.length}`)
    
    // 处理严重问题
    const criticalIssues = result.issues.filter(
      issue => issue.severity === 'critical'
    )
    
    if (criticalIssues.length > 0) {
      console.error('发现严重可访问性问题:')
      criticalIssues.forEach(issue => {
        console.error(`- ${issue.rule}: ${issue.message}`)
      })
    }
    
  } catch (error) {
    console.error('可访问性测试失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 测试特定规则
const testImageAlt = () => {
  const result = runSingleRule('img-alt')
  if (result.issues.length > 0) {
    console.warn('发现图片缺少alt属性:')
    result.issues.forEach(issue => {
      console.warn(`- ${issue.message}`)
    })
  }
}

// 获取所有可用的测试规则
const logAvailableRules = () => {
  const rules = getAvailableRules()
  console.log('可用的测试规则:')
  rules.forEach(rule => {
    console.log(`- ${rule.name} (${rule.wcagLevel}): ${rule.description}`)
  })
}
</script>
```

## 可访问性最佳实践

### 1. 语义化HTML

```vue
<template>
  <!-- ✅ 正确：使用语义化标签 -->
  <main role="main">
    <article>
      <header>
        <h1>文章标题</h1>
        <p>发布时间: <time datetime="2024-01-01">2024年1月1日</time></p>
      </header>
      <section>
        <h2>章节标题</h2>
        <p>章节内容...</p>
      </section>
    </article>
  </main>
  
  <!-- ❌ 错误：缺少语义化标签 -->
  <div>
    <div>文章标题</div>
    <div>文章内容</div>
  </div>
</template>
```

### 2. ARIA标签使用

```vue
<template>
  <!-- ✅ 正确：完整的ARIA标签 -->
  <button
    role="button"
    aria-label="保存文档"
    aria-describedby="save-help"
    :aria-pressed="isSaving"
    :disabled="isDisabled"
    @click="handleSave"
  >
    {{ isSaving ? '保存中...' : '保存' }}
  </button>
  <div id="save-help" class="sr-only">
    保存当前编辑的文档到本地存储
  </div>
  
  <!-- ❌ 错误：缺少ARIA标签 -->
  <div @click="handleSave">保存</div>
</template>
```

### 3. 键盘导航支持

```vue
<template>
  <!-- ✅ 正确：完整的键盘支持 -->
  <div
    role="tablist"
    @keydown="handleTabKeydown"
  >
    <button
      v-for="(tab, index) in tabs"
      :key="tab.id"
      role="tab"
      :aria-selected="activeTab === index"
      :tabindex="activeTab === index ? 0 : -1"
      @click="selectTab(index)"
      @focus="selectTab(index)"
    >
      {{ tab.title }}
    </button>
  </div>
  
  <div
    role="tabpanel"
    :aria-labelledby="`tab-${activeTab}`"
  >
    {{ tabs[activeTab]?.content }}
  </div>
</template>

<script setup lang="ts">
const handleTabKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault()
      selectTab((activeTab.value + 1) % tabs.length)
      break
    case 'ArrowLeft':
      e.preventDefault()
      selectTab((activeTab.value - 1 + tabs.length) % tabs.length)
      break
    case 'Home':
      e.preventDefault()
      selectTab(0)
      break
    case 'End':
      e.preventDefault()
      selectTab(tabs.length - 1)
      break
  }
}
</script>
```

### 4. 实时状态通知

```vue
<template>
  <div>
    <form @submit.prevent="handleSubmit">
      <input
        v-model="formData.name"
        :aria-invalid="errors.name ? 'true' : 'false'"
        aria-describedby="name-error"
        placeholder="请输入姓名"
      />
      <div
        id="name-error"
        role="alert"
        class="error-message"
        v-show="errors.name"
      >
        {{ errors.name }}
      </div>
      
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? '提交中...' : '提交' }}
      </button>
    </form>
    
    <!-- 实时状态区域 -->
    <div
      role="status"
      aria-live="polite"
      class="sr-only"
    >
      {{ statusMessage }}
    </div>
    
    <!-- 错误通知区域 -->
    <div
      role="alert"
      aria-live="assertive"
      class="sr-only"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAccessibility } from '@prompt-optimizer/ui'

const { announce } = useAccessibility('ContactForm')

const isSubmitting = ref(false)
const statusMessage = ref('')
const errorMessage = ref('')

const formData = reactive({
  name: ''
})

const errors = reactive({
  name: ''
})

const validateForm = () => {
  errors.name = formData.name ? '' : '姓名为必填项'
  return !errors.name
}

const handleSubmit = async () => {
  if (!validateForm()) {
    errorMessage.value = '请修正表单错误'
    announce('表单验证失败，请检查输入', 'assertive')
    return
  }
  
  isSubmitting.value = true
  statusMessage.value = '正在提交表单...'
  announce('正在提交表单', 'polite')
  
  try {
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    statusMessage.value = '表单提交成功'
    announce('表单提交成功', 'polite')
  } catch (error) {
    errorMessage.value = '提交失败，请重试'
    announce('提交失败，请重试', 'assertive')
  } finally {
    isSubmitting.value = false
  }
}
</script>
```

## 样式和视觉辅助

### 1. 聚焦指示器

```scss
// 高可见性的聚焦指示器
.focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  border-radius: 3px;
}

// 键盘聚焦样式
*:focus-visible {
  @extend .focus-visible;
}

// 移除鼠标点击时的聚焦样式
*:focus:not(:focus-visible) {
  outline: none;
}
```

### 2. 高对比度支持

```scss
// 高对比度模式样式
@media (prefers-contrast: high) {
  :root {
    --text-color: #000000;
    --background-color: #ffffff;
    --border-color: #000000;
    --focus-color: #0000ff;
  }
  
  .button {
    border: 2px solid var(--border-color);
    background: var(--background-color);
    color: var(--text-color);
  }
  
  .button:focus {
    outline: 3px solid var(--focus-color);
  }
}
```

### 3. 减少动画选项

```scss
// 尊重用户的动画偏好
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

// 为需要动画的用户提供平滑体验
@media (prefers-reduced-motion: no-preference) {
  .animated-element {
    transition: all 0.3s ease;
  }
}
```

## 测试指南

### 1. 键盘导航测试

```typescript
// E2E测试示例
describe('键盘导航测试', () => {
  it('应该支持Tab键导航', async () => {
    const page = await browser.newPage()
    await page.goto('http://localhost:3000')
    
    // 模拟Tab键导航
    await page.keyboard.press('Tab')
    const activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).toBe('BUTTON')
    
    // 模拟Enter键激活
    await page.keyboard.press('Enter')
    // 验证操作结果
  })
  
  it('应该支持方向键导航', async () => {
    await page.focus('[role="tablist"] [role="tab"]:first-child')
    await page.keyboard.press('ArrowRight')
    
    const activeTab = await page.evaluate(() => 
      document.activeElement?.getAttribute('aria-selected')
    )
    expect(activeTab).toBe('true')
  })
})
```

### 2. 屏幕阅读器测试

```typescript
describe('屏幕阅读器支持测试', () => {
  it('应该包含正确的ARIA标签', async () => {
    const button = await page.$('button')
    const ariaLabel = await button?.getAttribute('aria-label')
    const role = await button?.getAttribute('role')
    
    expect(ariaLabel).toBeTruthy()
    expect(role).toBe('button')
  })
  
  it('应该更新实时区域', async () => {
    await page.click('[data-testid="save-button"]')
    
    const liveRegion = await page.$('[role="status"]')
    const content = await liveRegion?.textContent()
    
    expect(content).toContain('已保存')
  })
})
```

## 常见问题解决

### Q: 如何处理动态内容的可访问性？

A: 使用实时区域和适当的ARIA标签：

```vue
<template>
  <div>
    <button @click="loadData">加载数据</button>
    
    <!-- 加载状态 -->
    <div
      v-if="isLoading"
      role="status"
      aria-live="polite"
    >
      正在加载数据...
    </div>
    
    <!-- 动态内容 -->
    <div
      v-if="data"
      role="region"
      :aria-label="`搜索结果，共${data.length}项`"
    >
      <div
        v-for="item in data"
        :key="item.id"
        role="listitem"
      >
        {{ item.name }}
      </div>
    </div>
  </div>
</template>
```

### Q: 如何处理复杂表单的可访问性？

A: 使用字段集、标签关联和错误处理：

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <fieldset>
      <legend>基本信息</legend>
      
      <div class="field">
        <label for="name">姓名（必填）</label>
        <input
          id="name"
          v-model="form.name"
          :aria-invalid="errors.name ? 'true' : 'false'"
          aria-describedby="name-help name-error"
          required
        />
        <div id="name-help" class="field-help">
          请输入您的真实姓名
        </div>
        <div
          v-if="errors.name"
          id="name-error"
          role="alert"
          class="field-error"
        >
          {{ errors.name }}
        </div>
      </div>
    </fieldset>
  </form>
</template>
```

### Q: 如何确保第三方组件的可访问性？

A: 包装第三方组件并添加可访问性支持：

```vue
<template>
  <div class="accessible-wrapper">
    <!-- 为第三方组件添加ARIA标签 -->
    <div
      role="application"
      :aria-label="aria.getLabel('chart', '数据图表')"
      aria-describedby="chart-description"
    >
      <ThirdPartyChart v-bind="chartProps" />
    </div>
    
    <div id="chart-description" class="sr-only">
      {{ chartDescription }}
    </div>
    
    <!-- 为不支持屏幕阅读器的图表提供数据表格替代 -->
    <details class="chart-alternative">
      <summary>查看图表数据表格</summary>
      <table>
        <thead>
          <tr>
            <th>类别</th>
            <th>数值</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in chartData" :key="item.id">
            <td>{{ item.category }}</td>
            <td>{{ item.value }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </div>
</template>
```

---

*本文档将持续更新，确保涵盖最新的可访问性最佳实践和功能特性。*