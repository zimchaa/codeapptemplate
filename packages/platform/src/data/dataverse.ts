import type { Naming } from '../schema/naming.ts'
import type { AnyTableDef, BaseRecord, NewRecord, TableDef } from '../schema/types.ts'
import { fromRow, toODataOptions, toRow, type ODataOptions, type Row } from './odata.ts'
import { TableNotConnectedError, type DataProvider, type TableClient } from './types.ts'

interface OperationResult<R> {
  success: boolean
  data: R
  error?: Error
}

/**
 * The subset of the `@microsoft/power-apps/data` DataClient this provider
 * uses. Structural, so tests can pass a fake.
 */
export interface DataverseClient {
  createRecordAsync<TInput, TResult>(tableName: string, record: TInput): Promise<OperationResult<TResult>>
  updateRecordAsync<TInput, TResult>(tableName: string, id: string, changes: TInput): Promise<OperationResult<TResult>>
  deleteRecordAsync(tableName: string, id: string): Promise<OperationResult<void>>
  retrieveRecordAsync<TResult>(tableName: string, id: string, options?: ODataOptions): Promise<OperationResult<TResult>>
  retrieveMultipleRecordsAsync<TResult>(tableName: string, options?: ODataOptions): Promise<OperationResult<TResult[]>>
}

/** The parts of power.config.json used to map tables to data source names. */
export interface PowerConfigLike {
  databaseReferences?: Record<string, { dataSources?: Record<string, { logicalName?: string } | undefined> } | undefined>
}

/**
 * `pa app add data-source --connector dataverse --table <logical>` records
 * each table under databaseReferences with a generated data source name
 * (derived from the display name). Read the real names instead of guessing.
 */
export function resolveDataSourceNames(powerConfig: PowerConfigLike | undefined): Map<string, string> {
  const names = new Map<string, string>()
  for (const db of Object.values(powerConfig?.databaseReferences ?? {})) {
    for (const [name, source] of Object.entries(db?.dataSources ?? {})) {
      if (source?.logicalName) names.set(source.logicalName.toLowerCase(), name)
    }
  }
  return names
}

export interface DataverseProviderOptions {
  client: DataverseClient
  naming: Naming
  /** logical table name -> data source name (see resolveDataSourceNames). */
  dataSourceNames: Map<string, string>
  /** Publisher option value prefix (setting `dataverse.optionValuePrefix`). */
  optionValuePrefix: () => number
}

function newGuid(): string {
  return crypto.randomUUID()
}

function unwrap<R>(result: OperationResult<R>, what: string): R {
  if (!result.success) throw result.error ?? new Error(`${what} failed`)
  return result.data
}

const notFound = /not\s*(exist|found)|\b404\b/i

export function createDataverseProvider(options: DataverseProviderOptions): DataProvider & {
  missingTables(tables: readonly AnyTableDef[]): string[]
} {
  const { client, naming, dataSourceNames, optionValuePrefix } = options

  function sourceFor(def: AnyTableDef): string {
    const logical = naming.table(def)
    const name = dataSourceNames.get(logical)
    if (!name) throw new TableNotConnectedError(def, logical)
    return name
  }

  function table<T extends BaseRecord>(def: TableDef<T>): TableClient<T> {
    const get = async (id: string): Promise<T | null> => {
      const result = await client.retrieveRecordAsync<Row>(sourceFor(def), id, {
        select: toODataOptions(def, naming, {}, optionValuePrefix()).select,
      })
      if (!result.success) {
        if (notFound.test(result.error?.message ?? '')) return null
        throw result.error ?? new Error(`Reading ${def.displayName} failed`)
      }
      return fromRow(def, naming, result.data)
    }
    const mustGet = async (id: string) => {
      const record = await get(id)
      if (!record) throw new Error(`${def.displayName} ${id} not found after save`)
      return record
    }

    return {
      async list(query) {
        const rows = unwrap(
          await client.retrieveMultipleRecordsAsync<Row>(sourceFor(def), toODataOptions(def, naming, query, optionValuePrefix())),
          `Listing ${def.displayCollectionName}`,
        )
        return rows.map((row) => fromRow(def, naming, row))
      },
      get,
      async create(values: NewRecord<T>) {
        // The id is generated client-side so the new row can be read back reliably.
        const id = newGuid()
        const row = { ...toRow(def, naming, values as Partial<T>, optionValuePrefix()), [naming.primaryId(def)]: id }
        unwrap(await client.createRecordAsync<Row, Row>(sourceFor(def), row), `Creating ${def.displayName}`)
        return mustGet(id)
      },
      async update(id, changes) {
        const row = toRow(def, naming, changes as Partial<T>, optionValuePrefix())
        unwrap(await client.updateRecordAsync<Row, Row>(sourceFor(def), id, row), `Updating ${def.displayName}`)
        return mustGet(id)
      },
      async remove(id) {
        unwrap(await client.deleteRecordAsync(sourceFor(def), id), `Deleting ${def.displayName}`)
      },
    }
  }

  return {
    kind: 'dataverse',
    table,
    missingTables: (tables) => tables.map((t) => naming.table(t)).filter((logical) => !dataSourceNames.has(logical)),
  }
}
