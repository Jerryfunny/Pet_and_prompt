import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

const messageMock = {
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('naive-ui', async () => {
  const actual = await vi.importActual<any>('naive-ui')
  const stubComponent = (name: string) =>
    defineComponent({
      name,
      props: ['value', 'checked', 'options', 'size', 'type', 'bordered'],
      emits: ['update:value', 'update:checked', 'click'],
      setup(props, { emit, slots }) {
        return () =>
          h(
            'div',
            {
              class: `stub-${name}`,
              'data-value': props.value,
              'data-checked': props.checked,
              onClick: () => emit('click')
            },
            slots.default?.()
          )
      }
    })

  return {
    ...actual,
    useMessage: () => messageMock,
    NForm: stubComponent('NForm'),
    NFormItem: stubComponent('NFormItem')
  }
})

vi.mock('@prompt-optimizer/core', async () => {
  const actual = await vi.importActual<any>('@prompt-optimizer/core')
  return {
    ...actual,
    isSafeCustomKey: (key: string) => /^[A-Za-z0-9._\-:/]+$/.test(key)
  }
})

import ModelParameterEditor from '../../../src/components/ModelParameterEditor.vue'

const createSelectStub = () =>
  defineComponent({
    name: 'NSelect',
    props: {
      options: {
        type: Array,
        default: () => []
      },
      value: {
        type: [String, Number, Array],
        default: ''
      }
    },
    emits: ['update:value'],
    setup(props, { emit, attrs }) {
      return () =>
        h(
          'select',
          {
            'data-test': attrs['data-test'],
            value: props.value as string | number | undefined,
            onChange: (event: Event) => {
              const target = event.target as HTMLSelectElement
              emit('update:value', target.value)
            }
          },
          (props.options as Array<{ value: string; label?: string }>).map((option) =>
            h('option', { value: option.value }, option.label ?? option.value)
          )
        )
    }
  })

const createInputStub = () =>
  defineComponent({
    name: 'NInput',
    props: {
      value: {
        type: [String, Number],
        default: ''
      }
    },
    emits: ['update:value'],
    setup(props, { emit, attrs, slots }) {
      return () => {
        const isTextarea = attrs.type === 'textarea'
        const common = {
          'data-test': attrs['data-test'],
          value: props.value,
          onInput: (event: Event) => {
            const target = event.target as HTMLInputElement | HTMLTextAreaElement
            emit('update:value', target.value)
          }
        }
        return isTextarea
          ? h('textarea', common, slots.default?.())
          : h('input', common)
      }
    }
  })

const createInputNumberStub = () =>
  defineComponent({
    name: 'NInputNumber',
    props: {
      value: {
        type: Number,
        default: undefined
      }
    },
    emits: ['update:value'],
    setup(props, { emit, attrs }) {
      return () =>
        h('input', {
          type: 'number',
          'data-test': attrs['data-test'],
          value: props.value ?? '',
          onInput: (event: Event) => {
            const target = event.target as HTMLInputElement
            emit('update:value', target.value === '' ? undefined : Number(target.value))
          }
        })
    }
  })

const createCheckboxStub = () =>
  defineComponent({
    name: 'NCheckbox',
    props: {
      checked: {
        type: Boolean,
        default: false
      }
    },
    emits: ['update:checked'],
    setup(props, { emit, slots }) {
      return () =>
        h('label', { class: 'checkbox-stub' }, [
          h('input', {
            type: 'checkbox',
            checked: props.checked,
            onChange: (event: Event) => {
              const target = event.target as HTMLInputElement
              emit('update:checked', target.checked)
            }
          }),
          slots.default?.()
        ])
    }
  })

const createButtonStub = () =>
  defineComponent({
    name: 'NButton',
    emits: ['click'],
    setup(_, { emit, attrs, slots }) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            'data-test': attrs['data-test'],
            onClick: () => emit('click')
          },
          [slots.icon?.(), slots.default?.()]
        )
    }
  })

const createSimpleStub = (name: string) =>
  defineComponent({
    name,
    setup(_, { slots }) {
      return () => h('div', { class: name }, slots.default?.())
    }
  })

const createCardStub = () =>
  defineComponent({
    name: 'NCard',
    setup(_, { slots }) {
      return () =>
        h('div', { class: 'card-stub' }, [
          slots.header?.(),
          slots.default?.(),
          slots['header-extra']?.()
        ])
    }
  })

const createFormItemStub = () =>
  defineComponent({
    name: 'NFormItem',
    setup(_, { slots }) {
      return () =>
        h('div', { class: 'form-item-stub' }, [
          slots['label-extra']?.(),
          slots.default?.(),
          slots.feedback?.()
        ])
    }
  })

const stubs = {
  NForm: createSimpleStub('NForm'),
  'n-form': createSimpleStub('n-form'),
  NSelect: createSelectStub(),
  'n-select': createSelectStub(),
  NInput: createInputStub(),
  'n-input': createInputStub(),
  NInputNumber: createInputNumberStub(),
  'n-input-number': createInputNumberStub(),
  NCheckbox: createCheckboxStub(),
  'n-checkbox': createCheckboxStub(),
  NButton: createButtonStub(),
  'n-button': createButtonStub(),
  NCard: createCardStub(),
  'n-card': createCardStub(),
  NFormItem: createFormItemStub(),
  'n-form-item': createFormItemStub(),
  NSpace: createSimpleStub('NSpace'),
  'n-space': createSimpleStub('n-space'),
  NTag: createSimpleStub('NTag'),
  'n-tag': createSimpleStub('n-tag'),
  NText: createSimpleStub('NText'),
  'n-text': createSimpleStub('n-text'),
  NAlert: createSimpleStub('NAlert'),
  'n-alert': createSimpleStub('n-alert')
}

const baseSchema = [
  {
    name: 'temperature',
    type: 'number' as const,
    defaultValue: 0.7,
    minValue: 0,
    maxValue: 2,
    step: 0.1,
    labelKey: 'params.temperature.label'
  }
]

describe('ModelParameterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountComponent = (overrideProps: Record<string, unknown> = {}) =>
    mount(ModelParameterEditor, {
      props: {
        mode: 'text',
        schema: baseSchema,
        paramOverrides: {},
        ...overrideProps
      },
      global: {
        stubs
      }
    })

  it('emits update when adding a definition', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as {
      handleAddDefinition: (name: string) => void
    }

    vm.handleAddDefinition('temperature')
    await nextTick()

    const emitted = wrapper.emitted<'update:paramOverrides'>('update:paramOverrides')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0][0]).toEqual({ temperature: 0.7 })
  })

  it('updates value when handleValueChange is called', async () => {
    const wrapper = mountComponent({
      paramOverrides: { temperature: 0.5 }
    })
    const vm = wrapper.vm as unknown as {
      handleValueChange: (definition: any, raw: unknown) => void
    }

    vm.handleValueChange(baseSchema[0], 0.8)
    await nextTick()

    const emitted = wrapper.emitted<'update:paramOverrides'>('update:paramOverrides')
    expect(emitted).toBeTruthy()
    expect(emitted?.[emitted.length - 1][0]).toEqual({ temperature: 0.8 })
  })

  it('removes override when value becomes empty', async () => {
    const wrapper = mountComponent({
      paramOverrides: { temperature: 0.9 }
    })
    const vm = wrapper.vm as unknown as {
      handleValueChange: (definition: any, raw: unknown) => void
    }

    vm.handleValueChange(baseSchema[0], '')
    await nextTick()

    const emitted = wrapper.emitted<'update:paramOverrides'>('update:paramOverrides')
    expect(emitted).toBeTruthy()
    expect(emitted?.[emitted.length - 1][0]).toEqual({})
  })

  it('handles custom parameter updates', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as {
      handleCustomValueChange: (key: string, value: string) => void
    }

    vm.handleCustomValueChange('foo', 'bar')
    await nextTick()

    let emitted = wrapper.emitted<'update:paramOverrides'>('update:paramOverrides')
    expect(emitted).toBeTruthy()
    expect(emitted?.[emitted.length - 1][0]).toEqual({ foo: 'bar' })

    vm.handleCustomValueChange('foo', '')
    await nextTick()
    emitted = wrapper.emitted<'update:paramOverrides'>('update:paramOverrides')
    expect(emitted?.[emitted.length - 1][0]).toEqual({})
  })
})
