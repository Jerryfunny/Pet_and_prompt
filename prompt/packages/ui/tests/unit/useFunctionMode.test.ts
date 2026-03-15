import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useFunctionMode } from '../../src/composables/mode/useFunctionMode'

const makeServices = () => {
  const store = new Map<string, any>()
  const preferenceService = {
    async get<T>(key: string, def: T): Promise<T> {
      return (store.has(key) ? store.get(key) : def) as T
    },
    async set<T>(key: string, value: T) { store.set(key, value) },
    async delete() {},
    async keys() { return Array.from(store.keys()) },
    async clear() { store.clear() },
    async getAll() { const obj: Record<string,string> = {}; for (const [k,v] of store) obj[k]=String(v); return obj }
  }
  return ref({ preferenceService } as any)
}

describe('useFunctionMode', () => {
  let services: any
  beforeEach(() => { services = makeServices() })

  it('defaults to basic when unset', async () => {
    const { functionMode, ensureInitialized } = useFunctionMode(services)
    await ensureInitialized()
    expect(functionMode.value).toBe('basic')
  })

  it('can switch to pro and persist', async () => {
    const { functionMode, setFunctionMode, ensureInitialized } = useFunctionMode(services)
    await ensureInitialized()
    await setFunctionMode('pro')
    expect(functionMode.value).toBe('pro')
  })

  it('supports image mode', async () => {
    const { functionMode, setFunctionMode, ensureInitialized } = useFunctionMode(services)
    await ensureInitialized()
    await setFunctionMode('image' as any)
    expect(functionMode.value).toBe('image')
  })
})
