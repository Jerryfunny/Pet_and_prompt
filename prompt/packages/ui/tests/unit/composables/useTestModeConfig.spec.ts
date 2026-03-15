import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTestModeConfig } from '../../../src/composables/ui/useTestModeConfig'

type OptimizationMode = 'system' | 'user'

describe('useTestModeConfig', () => {
  it('基础初始化测试', () => {
    const optimizationMode = ref<OptimizationMode>('system')
    const testModeConfig = useTestModeConfig(optimizationMode)

    expect(testModeConfig).toBeDefined()
    expect(testModeConfig.currentModeConfig).toBeDefined()
  })
})