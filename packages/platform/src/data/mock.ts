import type { AnyTableDef, BaseRecord, NewRecord, TableDef } from '../schema/types.ts'
import { applyQuery } from './query.ts'
import type { DataProvider, TableClient } from './types.ts'

export interface MockProviderOptions {
  /** Every table the app uses; seeded with `seed` + `samples`. */
  tables: readonly AnyTableDef[]
  /** localStorage key; omit to keep data in memory only (tests). */
  storageKey?: string
  /** Simulated network latency in ms. */
  latencyMs?: number
}

type Store = Record<string, BaseRecord[]>

function seedStore(tables: readonly AnyTableDef[]): Store {
  const now = new Date().toISOString()
  const store: Store = {}
  for (const def of tables) {
    store[def.name] = [...(def.seed ?? []), ...(def.samples ?? [])].map((row) => ({
      createdOn: now,
      modifiedOn: now,
      ...structuredClone(row),
    }))
  }
  return store
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

/**
 * In-memory provider for offline development. Data survives reloads when a
 * storageKey is given; call `reset()` to restore the seed data.
 */
export function createMockProvider(options: MockProviderOptions): DataProvider & { reset(): void } {
  const { tables, storageKey, latencyMs = 120 } = options

  const load = (): Store => {
    const fresh = seedStore(tables)
    if (!storageKey || typeof localStorage === 'undefined') return fresh
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Store | null
      // New tables added since the data was saved get their seed rows.
      return saved ? { ...fresh, ...saved } : fresh
    } catch {
      return fresh
    }
  }

  let store = load()
  const save = () => {
    if (storageKey && typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(store))
  }
  const delay = <R>(value: R): Promise<R> =>
    new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), latencyMs))

  function table<T extends BaseRecord>(def: TableDef<T>): TableClient<T> {
    const rows = () => (store[def.name] ??= []) as unknown as T[]
    const find = (id: string) => rows().find((r) => r.id === id)
    return {
      list: (query) => delay(applyQuery(def, rows(), query)),
      get: (id) => delay(find(id) ?? null),
      async create(values: NewRecord<T>) {
        const now = new Date().toISOString()
        const record = { ...values, id: newId(), createdOn: now, modifiedOn: now } as unknown as T
        rows().push(record)
        save()
        return delay(record)
      },
      async update(id, changes) {
        const existing = find(id)
        if (!existing) throw new Error(`${def.displayName} ${id} not found`)
        Object.assign(existing, changes, { modifiedOn: new Date().toISOString() })
        save()
        return delay(existing)
      },
      async remove(id) {
        store[def.name] = rows().filter((r) => r.id !== id)
        save()
        return delay(undefined)
      },
    }
  }

  return {
    kind: 'mock',
    table,
    reset() {
      store = seedStore(tables)
      save()
    },
  }
}
