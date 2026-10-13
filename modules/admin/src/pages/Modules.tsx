import { DataError, moduleStateTable, RequireCapability, useData, useTable, useWorkspace, type WorkspaceModule } from '@codeapps/platform'
import { Badge, Card, Input, Skeleton, Switch, Table, TBody, TD, TH, THead, TR, useToast } from '@codeapps/ui'
import { caps } from '../caps.ts'

export default function Modules() {
  return (
    <RequireCapability capability={caps.modules}>
      <ModulesPage />
    </RequireCapability>
  )
}

function ModulesPage() {
  const { registeredModules, naming, audit, refresh } = useWorkspace()
  const table = useTable(moduleStateTable)
  const { toast } = useToast()
  const { data, error, reload } = useData(() => table.list(), [])

  if (error) return <DataError error={error} onRetry={reload} />
  if (!data) return <Skeleton className="h-48" />

  const stateOf = (id: string) => data.find((s) => s.key === id)

  // Modules without a row are enabled with their default order; the first change creates the row.
  const save = async (module: WorkspaceModule, changes: { enabled?: boolean; sortOrder?: number }) => {
    if (module.id === 'admin' && changes.enabled === false) {
      toast({ title: "The admin module can't be turned off", tone: 'warning' })
      return
    }
    const existing = stateOf(module.id)
    const saved = existing
      ? await table.update(existing.id, changes)
      : await table.create({ key: module.id, enabled: changes.enabled ?? true, sortOrder: changes.sortOrder ?? module.order ?? 100 })
    await audit({ action: 'module.updated', module: 'admin', entity: 'workspacemodule', recordId: saved.id, details: { module: module.id, ...changes } })
    reload()
    refresh()
  }

  return (
    <Card>
      <Table>
        <THead>
          <tr><TH>Module</TH><TH>Route</TH><TH className="hidden md:table-cell">Requires</TH><TH className="hidden lg:table-cell">Dataverse tables</TH><TH>Order</TH><TH>Enabled</TH></tr>
        </THead>
        <TBody>
          {registeredModules.map((m) => {
            const state = stateOf(m.id)
            const enabled = state?.enabled ?? true
            return (
              <TR key={m.id}>
                <TD>
                  <span className="flex items-center gap-2 font-semibold"><m.icon className="size-4 text-primary" /> {m.title}</span>
                  <span className="block text-xs text-muted">{m.description}</span>
                </TD>
                <TD><code className="text-xs">#/{m.basePath}</code></TD>
                <TD className="hidden md:table-cell">{m.access ? <Badge tone="outline">{m.access}</Badge> : <span className="text-muted">—</span>}</TD>
                <TD className="hidden text-xs lg:table-cell">{(m.tables ?? []).map((t) => naming.table(t)).join(', ') || <span className="text-muted">—</span>}</TD>
                <TD>
                  <Input
                    type="number"
                    className="h-8 w-20"
                    aria-label={`Order of ${m.title}`}
                    defaultValue={state?.sortOrder ?? m.order ?? 100}
                    onBlur={(e) => {
                      const value = Number(e.target.value)
                      if (value !== (state?.sortOrder ?? m.order ?? 100)) void save(m, { sortOrder: value })
                    }}
                  />
                </TD>
                <TD><Switch checked={enabled} label={`Enable ${m.title}`} disabled={m.id === 'admin'} onCheckedChange={(on) => void save(m, { enabled: on })} /></TD>
              </TR>
            )
          })}
        </TBody>
      </Table>
    </Card>
  )
}
