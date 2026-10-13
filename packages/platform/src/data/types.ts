import type { AnyTableDef, BaseRecord, FieldsOf, NewRecord, TableDef } from '../schema/types.ts'

export interface Query<T extends BaseRecord> {
  /** Equality filters, ANDed. `undefined` values are ignored. */
  where?: { [K in FieldsOf<T>]?: T[K] }
  /** Case-insensitive "contains" on the table's primary field. */
  search?: string
  orderBy?: { field: keyof T & string; direction?: 'asc' | 'desc' }
  top?: number
}

export interface TableClient<T extends BaseRecord> {
  list(query?: Query<T>): Promise<T[]>
  get(id: string): Promise<T | null>
  create(values: NewRecord<T>): Promise<T>
  update(id: string, changes: Partial<NewRecord<T>>): Promise<T>
  remove(id: string): Promise<void>
}

export interface DataProvider {
  readonly kind: 'mock' | 'dataverse'
  table<T extends BaseRecord>(def: TableDef<T>): TableClient<T>
}

/** Thrown when a table hasn't been added to the code app with `pa app add data-source`. */
export class TableNotConnectedError extends Error {
  readonly table: AnyTableDef
  readonly logicalName: string
  constructor(table: AnyTableDef, logicalName: string) {
    super(
      `Dataverse table "${logicalName}" is not connected to this app. ` +
        `Run: pa app add data-source --connector dataverse --table ${logicalName}`,
    )
    this.name = 'TableNotConnectedError'
    this.table = table
    this.logicalName = logicalName
  }
}
