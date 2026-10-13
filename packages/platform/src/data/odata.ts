import { choiceIndex, choiceValue, type Naming } from '../schema/naming.ts'
import type { BaseRecord, ColumnDef, TableDef } from '../schema/types.ts'
import type { Query } from './types.ts'

export type Row = Record<string, unknown>

/** Options shape accepted by the code apps client's retrieve calls. */
export interface ODataOptions {
  select?: string[]
  filter?: string
  orderBy?: string[]
  top?: number
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isGuid(value: unknown): value is string {
  return typeof value === 'string' && GUID.test(value)
}

/** Escape a string for an OData literal: O'Neil -> 'O''Neil'. */
export function odataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function readColumn(col: ColumnDef, naming: Naming, row: Row): unknown {
  if (col.type === 'lookup') return row[naming.lookupValue(col)] ?? undefined
  const raw = row[naming.column(col)]
  if (raw === null || raw === undefined) return undefined
  if (col.type === 'choice') return col.options[choiceIndex(Number(raw))]?.value
  return raw
}

/** Dataverse row -> app record. */
export function fromRow<T extends BaseRecord>(def: TableDef<T>, naming: Naming, row: Row): T {
  const record: Record<string, unknown> = {
    id: row[naming.primaryId(def)],
    createdOn: row.createdon ?? undefined,
    modifiedOn: row.modifiedon ?? undefined,
  }
  for (const [field, col] of Object.entries(def.fields) as [string, ColumnDef][]) {
    const value = readColumn(col, naming, row)
    if (value !== undefined) record[field] = value
  }
  return record as T
}

/**
 * App record (or partial) -> Dataverse row for create/update. Lookups become
 * `<nav>@odata.bind`; choices become numeric option values.
 */
export function toRow<T extends BaseRecord>(
  def: TableDef<T>,
  naming: Naming,
  values: Partial<T>,
  optionValuePrefix: number,
): Row {
  const row: Row = {}
  for (const [field, col] of Object.entries(def.fields) as [string, ColumnDef][]) {
    if (!(field in values)) continue
    const value = (values as Record<string, unknown>)[field]
    if (value === undefined) continue
    switch (col.type) {
      case 'lookup':
        // Clearing a lookup needs a separate $ref DELETE; not supported here.
        if (value === null || value === '') continue
        if (!isGuid(value)) throw new Error(`${def.displayName}.${field} must be a GUID, got "${String(value)}"`)
        row[`${naming.navigationProperty(col)}@odata.bind`] = `/${naming.entitySet(col.target)}(${value})`
        break
      case 'choice': {
        const index = col.options.findIndex((o) => o.value === value)
        if (index < 0) throw new Error(`${def.displayName}.${field}: unknown option "${String(value)}"`)
        row[naming.column(col)] = choiceValue(optionValuePrefix, index)
        break
      }
      default:
        row[naming.column(col)] = value === '' ? null : value
    }
  }
  return row
}

function literal(col: ColumnDef, value: unknown, optionValuePrefix: number): string {
  switch (col.type) {
    case 'lookup':
      if (!isGuid(value)) throw new Error(`Lookup filter value must be a GUID, got "${String(value)}"`)
      return value
    case 'choice': {
      const index = col.options.findIndex((o) => o.value === value)
      if (index < 0) throw new Error(`Unknown option "${String(value)}"`)
      return String(choiceValue(optionValuePrefix, index))
    }
    case 'boolean':
      return value ? 'true' : 'false'
    case 'integer':
      return String(Number(value))
    default:
      return odataString(String(value))
  }
}

/** Query -> OData options ($select, $filter, $orderby, $top). */
export function toODataOptions<T extends BaseRecord>(
  def: TableDef<T>,
  naming: Naming,
  query: Query<T> = {},
  optionValuePrefix: number,
): ODataOptions {
  const fields = Object.entries(def.fields) as [string, ColumnDef][]
  const select = [
    naming.primaryId(def),
    'createdon',
    'modifiedon',
    ...fields.map(([, col]) => (col.type === 'lookup' ? naming.lookupValue(col) : naming.column(col))),
  ]

  const filters: string[] = []
  for (const [field, value] of Object.entries(query.where ?? {})) {
    if (value === undefined) continue
    const col = (def.fields as Record<string, ColumnDef>)[field]
    if (!col) throw new Error(`Unknown field ${def.name}.${field}`)
    const name = col.type === 'lookup' ? naming.lookupValue(col) : naming.column(col)
    filters.push(value === null ? `${name} eq null` : `${name} eq ${literal(col, value, optionValuePrefix)}`)
  }
  const search = query.search?.trim()
  if (search) {
    const primary = (def.fields as Record<string, ColumnDef>)[def.primaryField]
    filters.push(`contains(${naming.column(primary)},${odataString(search)})`)
  }

  const options: ODataOptions = { select }
  if (filters.length) options.filter = filters.join(' and ')
  if (query.orderBy) {
    const { field, direction = 'asc' } = query.orderBy
    const column =
      field === 'createdOn' ? 'createdon'
      : field === 'modifiedOn' ? 'modifiedon'
      : field === 'id' ? naming.primaryId(def)
      : (() => {
          const col = (def.fields as Record<string, ColumnDef>)[field]
          if (!col) throw new Error(`Unknown field ${def.name}.${field}`)
          return col.type === 'lookup' ? naming.lookupValue(col) : naming.column(col)
        })()
    options.orderBy = [`${column} ${direction}`]
  }
  if (query.top !== undefined) options.top = query.top
  return options
}
