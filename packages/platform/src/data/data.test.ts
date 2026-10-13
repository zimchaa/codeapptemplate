import { describe, expect, it } from 'vitest'
import { createNaming } from '../schema/naming.ts'
import { defineTable, type BaseRecord } from '../schema/types.ts'
import { createDataverseProvider, resolveDataSourceNames, type DataverseClient } from './dataverse.ts'
import { createMockProvider } from './mock.ts'
import { fromRow, toODataOptions, toRow } from './odata.ts'
import { TableNotConnectedError } from './types.ts'

interface Thing extends BaseRecord {
  title: string
  status: 'new' | 'done'
  parentId?: string
  count?: number
  flag?: boolean
}

const parent = defineTable<BaseRecord & { title: string }>({
  name: 'parent',
  displayName: 'Parent',
  displayCollectionName: 'Parents',
  description: '',
  ownership: 'organization',
  primaryField: 'title',
  fields: { title: { name: 'name', type: 'text', displayName: 'Title' } },
})

const things = defineTable<Thing>({
  name: 'thing',
  displayName: 'Thing',
  displayCollectionName: 'Things',
  description: '',
  ownership: 'user',
  primaryField: 'title',
  fields: {
    title: { name: 'name', type: 'text', displayName: 'Title' },
    status: { name: 'status', type: 'choice', displayName: 'Status', options: [{ value: 'new', label: 'New' }, { value: 'done', label: 'Done' }] },
    parentId: { name: 'parent', type: 'lookup', target: 'parent', displayName: 'Parent' },
    count: { name: 'count', type: 'integer', displayName: 'Count' },
    flag: { name: 'flag', type: 'boolean', displayName: 'Flag' },
  },
  samples: [
    { id: 'a', title: 'Alpha', status: 'new', count: 2 },
    { id: 'b', title: "O'Brien", status: 'done', count: 1 },
  ],
})

const naming = createNaming('spg')
const guid = '11111111-2222-4333-8444-555555555555'

describe('naming', () => {
  it('applies the prefix everywhere', () => {
    expect(naming.table(things)).toBe('spg_thing')
    expect(naming.entitySet('parent')).toBe('spg_parents')
    expect(naming.primaryId(things)).toBe('spg_thingid')
    expect(naming.lookupValue(things.fields.parentId)).toBe('_spg_parent_value')
  })
  it('rejects invalid prefixes', () => {
    expect(() => createNaming('Bad_')).toThrow()
  })
})

describe('odata mapping', () => {
  it('maps records to rows (choices, lookups, empty strings)', () => {
    expect(toRow(things, naming, { title: 'X', status: 'done', parentId: guid, count: 3 }, 10000)).toEqual({
      spg_name: 'X',
      spg_status: 100000001,
      'spg_parent@odata.bind': `/spg_parents(${guid})`,
      spg_count: 3,
    })
    expect(toRow(things, naming, { title: '' }, 10000)).toEqual({ spg_name: null })
    expect(() => toRow(things, naming, { parentId: 'not-a-guid' }, 10000)).toThrow(/GUID/)
  })

  it('maps rows to records using the option index (any publisher prefix)', () => {
    const record = fromRow(things, naming, {
      spg_thingid: guid,
      spg_name: 'X',
      spg_status: 730310001,
      _spg_parent_value: guid,
      spg_flag: false,
      createdon: '2026-01-01T00:00:00Z',
    })
    expect(record).toEqual({ id: guid, title: 'X', status: 'done', parentId: guid, flag: false, createdOn: '2026-01-01T00:00:00Z', modifiedOn: undefined })
  })

  it('builds OData options', () => {
    const options = toODataOptions(
      things,
      naming,
      { where: { status: 'new', parentId: guid, flag: true }, search: "O'B", orderBy: { field: 'createdOn', direction: 'desc' }, top: 5 },
      10000,
    )
    expect(options.select).toContain('_spg_parent_value')
    expect(options.filter).toBe(
      `spg_status eq 100000000 and _spg_parent_value eq ${guid} and spg_flag eq true and contains(spg_name,'O''B')`,
    )
    expect(options.orderBy).toEqual(['createdon desc'])
    expect(options.top).toBe(5)
  })
})

describe('mock provider', () => {
  it('lists with filters, search, ordering and supports CRUD', async () => {
    const provider = createMockProvider({ tables: [things], latencyMs: 0 })
    const table = provider.table(things)
    expect((await table.list({ orderBy: { field: 'count' } })).map((t) => t.id)).toEqual(['b', 'a'])
    expect((await table.list({ where: { status: 'done' } })).map((t) => t.id)).toEqual(['b'])
    expect((await table.list({ search: 'alp' })).map((t) => t.id)).toEqual(['a'])

    const created = await table.create({ title: 'New', status: 'new' })
    expect(created.id).toBeTruthy()
    const updated = await table.update(created.id, { status: 'done' })
    expect(updated.status).toBe('done')
    await table.remove(created.id)
    expect(await table.get(created.id)).toBeNull()

    provider.reset()
    expect(await table.list()).toHaveLength(2)
  })
})

describe('dataverse provider', () => {
  const powerConfig = {
    databaseReferences: {
      'default.cds': { dataSources: { things: { logicalName: 'spg_thing', entitySetName: 'spg_things' } } },
    },
  }

  function fakeClient() {
    const rows = new Map<string, Record<string, unknown>>()
    const calls: string[] = []
    const ok = <R>(data: R) => Promise.resolve({ success: true, data })
    const client: DataverseClient = {
      createRecordAsync: (table, record) => {
        const row = record as Record<string, unknown>
        calls.push(`create:${table}`)
        rows.set(String(row.spg_thingid), { ...row })
        return ok(row as never)
      },
      updateRecordAsync: (table, id, changes) => {
        calls.push(`update:${table}:${id}`)
        Object.assign(rows.get(id)!, changes)
        return ok(undefined as never)
      },
      deleteRecordAsync: (table, id) => {
        calls.push(`delete:${table}:${id}`)
        rows.delete(id)
        return ok(undefined)
      },
      retrieveRecordAsync: (_table, id) =>
        rows.has(id)
          ? ok(rows.get(id) as never)
          : Promise.resolve({ success: false, data: undefined as never, error: new Error('Entity Does Not Exist') }),
      retrieveMultipleRecordsAsync: (table, options) => {
        calls.push(`list:${table}:${options?.filter ?? ''}`)
        return ok([...rows.values()] as never)
      },
    }
    return { client, rows, calls }
  }

  it('resolves data source names from power.config.json', () => {
    expect(resolveDataSourceNames(powerConfig).get('spg_thing')).toBe('things')
  })

  it('uses data source names, client-generated ids and option prefixes', async () => {
    const { client, calls } = fakeClient()
    const provider = createDataverseProvider({
      client,
      naming,
      dataSourceNames: resolveDataSourceNames(powerConfig),
      optionValuePrefix: () => 73031,
    })
    const table = provider.table(things)
    const created = await table.create({ title: 'From app', status: 'done' })
    expect(created).toMatchObject({ title: 'From app', status: 'done' })
    await table.list({ where: { status: 'done' } })
    expect(calls).toContain('list:things:spg_status eq 730310001')
    await table.update(created.id, { title: 'Renamed' })
    expect((await table.get(created.id))?.title).toBe('Renamed')
    await table.remove(created.id)
    expect(await table.get(created.id)).toBeNull()
  })

  it('reports tables that were not added with pa app add data-source', async () => {
    const provider = createDataverseProvider({ client: fakeClient().client, naming, dataSourceNames: new Map(), optionValuePrefix: () => 10000 })
    expect(provider.missingTables([things, parent])).toEqual(['spg_thing', 'spg_parent'])
    await expect(provider.table(things).list()).rejects.toBeInstanceOf(TableNotConnectedError)
  })
})
