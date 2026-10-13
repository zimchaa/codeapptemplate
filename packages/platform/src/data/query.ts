import type { BaseRecord, TableDef } from '../schema/types.ts'
import type { Query } from './types.ts'

/** Applies a Query to in-memory records (used by the mock provider and tests). */
export function applyQuery<T extends BaseRecord>(def: TableDef<T>, rows: readonly T[], query: Query<T> = {}): T[] {
  let result = rows.filter((row) => {
    for (const [field, expected] of Object.entries(query.where ?? {})) {
      if (expected === undefined) continue
      const actual = (row as Record<string, unknown>)[field]
      if (typeof expected === 'string' && typeof actual === 'string') {
        if (actual.toLowerCase() !== expected.toLowerCase()) return false
      } else if (actual !== expected) {
        return false
      }
    }
    return true
  })

  const search = query.search?.trim().toLowerCase()
  if (search) {
    result = result.filter((row) => String((row as Record<string, unknown>)[def.primaryField] ?? '').toLowerCase().includes(search))
  }

  if (query.orderBy) {
    const { field, direction = 'asc' } = query.orderBy
    const sign = direction === 'desc' ? -1 : 1
    result = [...result].sort((a, b) => {
      const x = (a as Record<string, unknown>)[field]
      const y = (b as Record<string, unknown>)[field]
      if (x === y) return 0
      if (x === undefined || x === null) return 1
      if (y === undefined || y === null) return -1
      return (x < y ? -1 : 1) * sign
    })
  }

  return query.top !== undefined ? result.slice(0, query.top) : result
}
