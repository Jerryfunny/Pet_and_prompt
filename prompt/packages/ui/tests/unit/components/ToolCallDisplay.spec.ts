import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolCallDisplay from '../../../src/components/ToolCallDisplay.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('ToolCallDisplay 基础测试', () => {
  const defaultProps = {
    toolCalls: []
  }

  it('应该正确渲染', () => {
    const wrapper = mount(ToolCallDisplay, {
      props: defaultProps,
      global: {
        stubs: ['NCard', 'NCollapse', 'NCollapseItem', 'NCode', 'NBadge', 'NTag']
      }
    })

    expect(wrapper.exists()).toBe(true)
  })
})