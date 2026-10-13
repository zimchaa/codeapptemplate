import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react'
import type { TableClient } from '../data/types.ts'
import { useWorkspace } from '../runtime/context.ts'
import type { BaseRecord, TableDef } from '../schema/types.ts'

export function useAccess() {
  const { can, capabilities, roles } = useWorkspace()
  return { can, capabilities, roles }
}

/** A typed client for one table from the active provider (mock or Dataverse). */
export function useTable<T extends BaseRecord>(def: TableDef<T>): TableClient<T> {
  const { provider } = useWorkspace()
  return useMemo(() => provider.table(def), [provider, def])
}

export interface DataState<R> {
  data: R | undefined
  error: unknown
  /** True while the latest request is in flight (previous data is kept). */
  loading: boolean
  reload: () => void
}

type Primitive = string | number | boolean | null | undefined

/**
 * Minimal async data hook. `deps` must be primitives; the loader re-runs when
 * they change or when reload() is called. Stale responses are ignored.
 */
export function useData<R>(load: () => Promise<R>, deps: readonly Primitive[]): DataState<R> {
  const [nonce, setNonce] = useState(0)
  const key = JSON.stringify([...deps, nonce])
  const [result, setResult] = useState<{ key: string; data?: R; error?: unknown } | null>(null)
  const run = useEffectEvent(load)

  useEffect(() => {
    let cancelled = false
    run().then(
      (data) => !cancelled && setResult({ key, data }),
      (error: unknown) => !cancelled && setResult((prev) => ({ key, data: prev?.data, error })),
    )
    return () => {
      cancelled = true
    }
  }, [key])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return {
    data: result?.data,
    error: result?.key === key ? result.error : undefined,
    loading: result?.key !== key,
    reload,
  }
}
