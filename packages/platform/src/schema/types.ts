// Schema types. This folder must stay React-free and use only erasable
// TypeScript (no enums / namespaces / parameter properties) because the
// provisioning script imports it directly with Node's type stripping.

/** Fields every record has, regardless of table. */
export interface BaseRecord {
  id: string
  createdOn?: string
  modifiedOn?: string
}

/** Names of a record's own (non-base) fields. */
export type FieldsOf<T> = Exclude<keyof T, keyof BaseRecord> & string

/** A record as passed to create(): everything except the base fields. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>

export interface ChoiceOption {
  /** Stable key used in app code (e.g. `in_progress`). */
  value: string
  label: string
}

interface ColumnBase {
  /** Column name WITHOUT publisher prefix, e.g. `status` -> `spg_status`. */
  name: string
  displayName: string
  description?: string
  required?: boolean
}

export type ColumnDef =
  | (ColumnBase & { type: 'text' | 'email' | 'url'; maxLength?: number })
  | (ColumnBase & { type: 'multiline'; maxLength?: number })
  | (ColumnBase & { type: 'boolean'; defaultValue?: boolean })
  | (ColumnBase & { type: 'integer'; min?: number; max?: number })
  | (ColumnBase & { type: 'datetime' | 'dateonly' })
  /**
   * Dataverse choice. Option values are assigned as
   * `<publisher option prefix> * 10000 + index`, so ORDER MATTERS: only ever
   * append new options.
   */
  | (ColumnBase & { type: 'choice'; options: readonly ChoiceOption[] })
  /** Lookup to another table defined in this schema (unprefixed name). */
  | (ColumnBase & { type: 'lookup'; target: string })

export interface TableDef<T extends BaseRecord = BaseRecord> {
  /** Table name WITHOUT prefix, singular, lower case: `request` -> `spg_request`. */
  name: string
  displayName: string
  displayCollectionName: string
  description: string
  /** `user` tables get owner + row-level security; `organization` tables don't. */
  ownership: 'user' | 'organization'
  /** The field that is the table's primary name column (must be type text). */
  primaryField: FieldsOf<T>
  fields: { [K in FieldsOf<T>]-?: ColumnDef }
  /** Rows every environment needs (roles, settings). Upserted by id. */
  seed?: readonly T[]
  /** Demo rows: always used by the mock provider; provisioned with --with-samples. */
  samples?: readonly T[]
}

/** Identity helper that keeps the record type attached to the definition. */
export function defineTable<T extends BaseRecord>(def: TableDef<T>): TableDef<T> {
  return def
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTableDef = TableDef<any>

/** Everything a schema module contributes. */
export interface SchemaBundle {
  tables: readonly AnyTableDef[]
}
