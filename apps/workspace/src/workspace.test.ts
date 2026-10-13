import { allTables } from '@codeapps/platform'
import { describe, expect, it } from 'vitest'
import { modules } from './modules.ts'
import { tables } from './workspace.schema.ts'

describe('workspace registry', () => {
  it('provisions exactly the tables the registered modules use', () => {
    expect(tables.map((t) => t.name).sort()).toEqual(allTables(modules).map((t) => t.name).sort())
  })

  it('has unique module ids and base paths', () => {
    expect(new Set(modules.map((m) => m.id)).size).toBe(modules.length)
    expect(new Set(modules.map((m) => m.basePath)).size).toBe(modules.length)
  })

  it('declares every module access capability in its capability list', () => {
    for (const m of modules) {
      if (m.access) expect(m.capabilities.map((c) => c.id)).toContain(m.access)
    }
  })
})
