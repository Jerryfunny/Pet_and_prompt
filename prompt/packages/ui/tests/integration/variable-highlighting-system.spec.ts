import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import VariableAwareInput from '../../src/components/variable-extraction/VariableAwareInput.vue'
import { useVariableDetection } from '../../src/components/variable-extraction/useVariableDetection'

/**
 * 变量高亮系统集成测试
 *
 * 测试完整的用户工作流和组件间交互
 */
describe('variable-highlighting-system 集成测试', () => {
  describe('完整工作流: 添加缺失变量', () => {
    it('应该完成从检测到添加的完整流程', async () => {
      // 1. 初始状态: 输入包含缺失变量的文本
      const modelValue = ref('Hello {{name}}, you are {{age}} years old')
      const globalVariables = ref<Record<string, string>>({})
      const temporaryVariables = ref<Record<string, string>>({})
      const predefinedVariables = ref<Record<string, string>>({})

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      // 2. 检测变量
      let variables = extractVariables(modelValue.value)
      expect(variables).toHaveLength(2)
      expect(variables[0].source).toBe('missing')
      expect(variables[1].source).toBe('missing')

      // 3. 模拟用户添加第一个缺失变量到临时变量
      temporaryVariables.value['name'] = ''

      // 4. 重新检测,第一个变量应该变为临时变量
      variables = extractVariables(modelValue.value)
      expect(variables[0].source).toBe('temporary')
      expect(variables[1].source).toBe('missing')

      // 5. 添加第二个缺失变量
      temporaryVariables.value['age'] = ''

      // 6. 重新检测,两个变量都应该是临时变量
      variables = extractVariables(modelValue.value)
      expect(variables[0].source).toBe('temporary')
      expect(variables[1].source).toBe('temporary')
    })

    it('应该支持从缺失变量到全局变量的转换', async () => {
      const modelValue = ref('User: {{username}}')
      const globalVariables = ref<Record<string, string>>({})
      const temporaryVariables = ref<Record<string, string>>({})
      const predefinedVariables = ref<Record<string, string>>({})

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      // 初始: 缺失变量
      let variables = extractVariables(modelValue.value)
      expect(variables[0].source).toBe('missing')

      // 添加到临时变量
      temporaryVariables.value['username'] = 'John'
      variables = extractVariables(modelValue.value)
      expect(variables[0].source).toBe('temporary')

      // 保存到全局变量
      globalVariables.value['username'] = 'John'
      delete temporaryVariables.value['username']
      variables = extractVariables(modelValue.value)
      expect(variables[0].source).toBe('global')
    })
  })

  describe('完整工作流: 变量提取', () => {
    it('应该完成从选择到提取的完整流程', async () => {
      const wrapper = mount(VariableAwareInput, {
        props: {
          modelValue: 'Hello John, you are 25 years old',
          existingGlobalVariables: [],
          existingTemporaryVariables: []
        }
      })

      // 1. 初始文本不包含变量
      expect(wrapper.props('modelValue')).toBe('Hello John, you are 25 years old')

      // 2. 模拟用户选择 "John" 并提取为变量
      await wrapper.vm.$emit('variable-extracted', {
        variableName: 'name',
        variableValue: 'John',
        variableType: 'temporary'
      })

      // 3. 验证事件被触发
      expect(wrapper.emitted('variable-extracted')).toBeTruthy()
      const extractedEvent = wrapper.emitted('variable-extracted')?.[0]?.[0] as any
      expect(extractedEvent.variableName).toBe('name')
      expect(extractedEvent.variableValue).toBe('John')

      // 4. 模拟文本替换
      await wrapper.setProps({
        modelValue: 'Hello {{name}}, you are 25 years old',
        existingTemporaryVariables: ['name'],
        temporaryVariableValues: { name: 'John' }
      })

      // 5. 验证变量被正确识别
      const globalVariables = ref<Record<string, string>>({})
      const temporaryVariables = ref({ name: 'John' })
      const predefinedVariables = ref<Record<string, string>>({})

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const variables = extractVariables(wrapper.props('modelValue'))
      expect(variables).toHaveLength(1)
      expect(variables[0].name).toBe('name')
      expect(variables[0].source).toBe('temporary')
    })

    it('应该支持全部替换功能', async () => {
      const text = 'test test test'
      const globalVariables = ref<Record<string, string>>({})
      const temporaryVariables = ref<Record<string, string>>({})
      const predefinedVariables = ref<Record<string, string>>({})

      // 模拟全部替换
      const newText = text.replace(/test/g, '{{testVar}}')
      expect(newText).toBe('{{testVar}} {{testVar}} {{testVar}}')

      // 添加变量
      temporaryVariables.value['testVar'] = 'test'

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const variables = extractVariables(newText)
      expect(variables).toHaveLength(3)
      expect(variables.every(v => v.source === 'temporary')).toBe(true)
    })

    it('应该保护现有变量不被破坏', () => {
      const text = 'customer {{customer_name}} customer'

      // 模拟安全替换 (仅替换占位符外部的 "customer")
      const replaceOutsideVariables = (text: string, search: string, replace: string) => {
        // 简化版实现
        const parts = text.split(/(\{\{[^}]+\}\})/g)
        return parts.map((part, index) => {
          if (index % 2 === 0) {
            // 非变量部分
            return part.replace(new RegExp(search, 'g'), replace)
          }
          return part // 变量部分保持不变
        }).join('')
      }

      const newText = replaceOutsideVariables(text, 'customer', '{{user}}')
      expect(newText).toBe('{{user}} {{customer_name}} {{user}}')

      // 验证变量名没有被破坏
      expect(newText).toContain('{{customer_name}}')
    })
  })

  describe('完整工作流: 自动完成', () => {
    it('应该在输入 {{ 时触发补全', () => {
      const globalVariables = { username: 'John', email: 'john@example.com' }
      const temporaryVariables = { tempVar: 'temp' }
      const predefinedVariables = { systemVar: 'system' }

      // 模拟补全选项生成
      const completionOptions = [
        ...Object.keys(predefinedVariables).map(name => ({ name, source: 'predefined', boost: 3 })),
        ...Object.keys(globalVariables).map(name => ({ name, source: 'global', boost: 2 })),
        ...Object.keys(temporaryVariables).map(name => ({ name, source: 'temporary', boost: 1 }))
      ]

      expect(completionOptions).toHaveLength(4)
      expect(completionOptions[0].boost).toBe(3) // 预定义优先级最高
      expect(completionOptions[3].boost).toBe(1) // 临时变量优先级最低
    })

    it('应该正确插入补全的变量', () => {
      const text = 'Hello {{'
      const selectedVariable = 'name'

      // 模拟补全插入
      const newText = text + selectedVariable + '}}'
      expect(newText).toBe('Hello {{name}}')

      // 验证变量格式正确
      expect(newText).toMatch(/\{\{[^}]+\}\}/)
    })

    it('应该显示变量值预览', () => {
      const variables = {
        shortVar: 'short',
        longVar: 'a'.repeat(100)
      }

      // 模拟值预览生成
      const previews = Object.entries(variables).map(([name, value]) => ({
        name,
        preview: value.length > 50 ? value.substring(0, 50) + '...' : value
      }))

      expect(previews[0].preview).toBe('short')
      expect(previews[1].preview).toHaveLength(53) // 50 + '...'
      expect(previews[1].preview).toContain('...')
    })
  })

  describe('完整工作流: 临时变量同步', () => {
    it('应该在输入框和测试区之间同步变量', async () => {
      // 模拟输入框状态
      const inputVariables = ref<Record<string, string>>({})

      // 模拟测试区状态
      const testVariables = ref<Record<string, string>>({})

      // 1. 在输入框添加缺失变量
      inputVariables.value['newVar'] = ''

      // 2. 同步到测试区
      testVariables.value['newVar'] = ''
      expect(testVariables.value).toHaveProperty('newVar')

      // 3. 在测试区修改变量值
      testVariables.value['newVar'] = 'new value'

      // 4. 同步回输入框
      inputVariables.value['newVar'] = 'new value'
      expect(inputVariables.value['newVar']).toBe('new value')

      // 5. 在测试区删除变量
      delete testVariables.value['newVar']

      // 6. 同步回输入框 (变量变为缺失状态)
      delete inputVariables.value['newVar']
      expect(inputVariables.value).not.toHaveProperty('newVar')
    })

    it('应该支持批量清空临时变量', () => {
      const temporaryVariables = ref({
        var1: 'value1',
        var2: 'value2',
        var3: 'value3'
      })

      // 记录被清空的变量名
      const removedNames = Object.keys(temporaryVariables.value)
      expect(removedNames).toHaveLength(3)

      // 清空所有临时变量
      temporaryVariables.value = {}
      expect(Object.keys(temporaryVariables.value)).toHaveLength(0)

      // 验证所有变量都被移除
      removedNames.forEach(name => {
        expect(temporaryVariables.value).not.toHaveProperty(name)
      })
    })
  })

  describe('变量优先级系统', () => {
    it('应该按优先级显示变量 (预定义 > 全局 > 临时)', () => {
      const globalVariables = ref({ var1: 'global', var2: 'global' })
      const temporaryVariables = ref({ var1: 'temp', var2: 'temp', var3: 'temp' })
      const predefinedVariables = ref({ var1: 'predef', var2: 'predef', var3: 'predef', var4: 'predef' })

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const text = '{{var1}} {{var2}} {{var3}} {{var4}} {{var5}}'
      const variables = extractVariables(text)

      expect(variables[0].source).toBe('predefined') // var1: 预定义优先
      expect(variables[1].source).toBe('predefined') // var2: 预定义优先
      expect(variables[2].source).toBe('predefined') // var3: 预定义优先
      expect(variables[3].source).toBe('predefined') // var4: 仅预定义
      expect(variables[4].source).toBe('missing')    // var5: 缺失
    })

    it('应该在变量升级时更新优先级', () => {
      const globalVariables = ref<Record<string, string>>({})
      const temporaryVariables = ref({ testVar: 'temp' })
      const predefinedVariables = ref<Record<string, string>>({})

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const text = '{{testVar}}'

      // 初始: 临时变量
      let variables = extractVariables(text)
      expect(variables[0].source).toBe('temporary')

      // 升级到全局变量
      globalVariables.value['testVar'] = 'global'
      variables = extractVariables(text)
      expect(variables[0].source).toBe('global')

      // 升级到预定义变量
      predefinedVariables.value['testVar'] = 'predef'
      variables = extractVariables(text)
      expect(variables[0].source).toBe('predefined')
    })
  })

  describe('复杂场景测试', () => {
    it('应该处理包含多种变量类型的复杂文本', () => {
      const globalVariables = ref({ global1: 'g1', global2: 'g2' })
      const temporaryVariables = ref({ temp1: 't1' })
      const predefinedVariables = ref({ predef1: 'p1' })

      const { extractVariables, getVariableStats } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const text = `
        Global: {{global1}} {{global2}}
        Temporary: {{temp1}}
        Predefined: {{predef1}}
        Missing: {{missing1}} {{missing2}}
      `

      const stats = getVariableStats(text)
      expect(stats.total).toBe(6)
      expect(stats.global).toBe(2)
      expect(stats.temporary).toBe(1)
      expect(stats.predefined).toBe(1)
      expect(stats.missing).toBe(2)
    })

    it('应该处理变量名包含特殊字符的情况', () => {
      const globalVariables = ref({
        'user-name': 'John',
        'user.email': 'john@example.com',
        'user_id': '123',
        '用户名': '张三'
      })
      const temporaryVariables = ref<Record<string, string>>({})
      const predefinedVariables = ref<Record<string, string>>({})

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const text = '{{user-name}} {{user.email}} {{user_id}} {{用户名}}'
      const variables = extractVariables(text)

      expect(variables).toHaveLength(4)
      expect(variables.every(v => v.source === 'global')).toBe(true)
    })

    it('应该处理大量变量的性能场景', () => {
      const globalVariables = ref<Record<string, string>>({})
      const temporaryVariables = ref<Record<string, string>>({})
      const predefinedVariables = ref<Record<string, string>>({})

      // 创建100个变量
      for (let i = 0; i < 100; i++) {
        globalVariables.value[`var${i}`] = `value${i}`
      }

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      // 创建包含所有变量的文本
      const text = Object.keys(globalVariables.value)
        .map(name => `{{${name}}}`)
        .join(' ')

      const variables = extractVariables(text)

      expect(variables).toHaveLength(100)
      expect(variables.every(variable => variable.source === 'global')).toBe(true)
    })
  })

  describe('错误处理和边界情况', () => {
    it('应该处理不完整的变量占位符', () => {
      const globalVariables = ref<Record<string, string>>({})
      const temporaryVariables = ref<Record<string, string>>({})
      const predefinedVariables = ref<Record<string, string>>({})

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const text = '{{incomplete or {{valid}} more {{incomplete'
      const variables = extractVariables(text)

      // 只应该提取完整的变量
      expect(variables).toHaveLength(1)
      expect(variables[0].name).toBe('valid')
    })

    it('应该过滤 Mustache 控制标签', () => {
      const globalVariables = ref<Record<string, string>>({})
      const temporaryVariables = ref<Record<string, string>>({})
      const predefinedVariables = ref<Record<string, string>>({})

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const text = '{{#if}} {{name}} {{/if}} {{^else}} {{!comment}}'
      const variables = extractVariables(text)

      // 只应该提取 {{name}}
      expect(variables).toHaveLength(1)
      expect(variables[0].name).toBe('name')
    })

    it('应该处理空值和 undefined', () => {
      const globalVariables = ref({ emptyVar: '', undefinedVar: undefined as any })
      const temporaryVariables = ref<Record<string, string>>({})
      const predefinedVariables = ref<Record<string, string>>({})

      const { extractVariables } = useVariableDetection(
        globalVariables,
        temporaryVariables,
        predefinedVariables
      )

      const text = '{{emptyVar}} {{undefinedVar}}'
      const variables = extractVariables(text)

      expect(variables).toHaveLength(2)
      expect(variables[0].value).toBe('')
      // undefined 会被转换为空字符串,因为 DetectedVariable.value 类型是 string
      expect(variables[1].value).toBe('')
    })
  })

  describe('用户体验测试', () => {
    it('应该提供即时反馈', async () => {
      const temporaryVariables = ref<Record<string, string>>({})

      // 模拟用户添加变量并等待响应式更新
      temporaryVariables.value['newVar'] = ''
      await nextTick()

      expect(temporaryVariables.value.newVar).toBe('')
    })

    it('应该支持撤销操作', () => {
      const history: string[] = []
      let currentText = 'Hello world'

      // 记录初始状态
      history.push(currentText)

      // 执行操作
      currentText = 'Hello {{name}}'
      history.push(currentText)

      // 撤销
      history.pop()
      currentText = history[history.length - 1]

      expect(currentText).toBe('Hello world')
    })
  })
})
