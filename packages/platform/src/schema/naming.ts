import type { AnyTableDef, ColumnDef } from './types.ts'

/**
 * Turns unprefixed schema names into Dataverse logical names for a given
 * publisher prefix (default `spg`). Every place that talks to Dataverse goes
 * through this, so the prefix lives in exactly one setting.
 */
export interface Naming {
  prefix: string
  table(def: AnyTableDef): string
  /** Entity set name used in URLs and @odata.bind. */
  entitySet(def: AnyTableDef | string): string
  primaryId(def: AnyTableDef): string
  column(col: ColumnDef): string
  /** Read-side name of a lookup column: `_spg_request_value`. */
  lookupValue(col: ColumnDef): string
  /** Write-side navigation property for a lookup (set explicitly when provisioning). */
  navigationProperty(col: ColumnDef): string
}

export const DEFAULT_PREFIX = 'spg'

export function isValidPrefix(prefix: string): boolean {
  return /^[a-z][a-z0-9]{1,7}$/.test(prefix)
}

export function createNaming(prefix: string = DEFAULT_PREFIX): Naming {
  if (!isValidPrefix(prefix)) {
    throw new Error(`Invalid publisher prefix "${prefix}": 2-8 lower-case letters/digits, starting with a letter.`)
  }
  const p = (name: string) => `${prefix}_${name}`
  const tableName = (def: AnyTableDef | string) => p(typeof def === 'string' ? def : def.name)
  return {
    prefix,
    table: tableName,
    // Set explicitly at provisioning time, so it is always logical name + "s".
    entitySet: (def) => `${tableName(def)}s`,
    primaryId: (def) => `${tableName(def)}id`,
    column: (col) => p(col.name),
    lookupValue: (col) => `_${p(col.name)}_value`,
    navigationProperty: (col) => p(col.name),
  }
}

/** Dataverse value of a choice option at `index` for a publisher option prefix (e.g. 10000). */
export function choiceValue(optionValuePrefix: number, index: number): number {
  return optionValuePrefix * 10000 + index
}

/** Index of a choice option from its Dataverse value (independent of prefix). */
export function choiceIndex(value: number): number {
  return value % 10000
}
