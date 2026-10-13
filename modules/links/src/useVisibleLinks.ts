import { useData, useTable, useWorkspace } from '@codeapps/platform'
import { quickLinkTable } from './schema.ts'

/** All links, plus those the current user may see. */
export function useVisibleLinks() {
  const { can } = useWorkspace()
  const table = useTable(quickLinkTable)
  const state = useData(() => table.list({ orderBy: { field: 'sortOrder' } }), [])
  const visible = (state.data ?? []).filter((l) => can(l.requiredCapability || undefined))
  return { ...state, table, visible }
}
