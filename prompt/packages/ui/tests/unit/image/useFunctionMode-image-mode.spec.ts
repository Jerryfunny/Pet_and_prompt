import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useFunctionMode } from '../../../src/composables/mode/useFunctionMode'

const makeServices = () => {
  const store = new Map<string, any>()
  const preferenceService = {
    async get<T>(key: string, def: T): Promise<T> { return (store.has(key) ? store.get(key) : def) as T },
    async set<T>(key: string, value: T) { store.set(key, value) },
    async delete() {}, async keys() { return Array.from(store.keys()) }, async clear() { store.clear() }, async getAll() { return {} as any }
  }
  return ref({ preferenceService } as any)
}

describe('function mode image', () => {
  let services: any
  beforeEach(() => { services = makeServices() })
  it('can set image mode and persist', async () => {
    const { functionMode, setFunctionMode, ensureInitialized } = useFunctionMode(services)
    await ensureInitialized()
    await setFunctionMode('image' as any)
    expect(functionMode.value).toBe('image')
  })
})

