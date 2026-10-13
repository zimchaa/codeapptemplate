import { auditEventTable, DataError, roleAssignmentTable, useData, useTable, useWorkspace } from '@codeapps/platform'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, Stat, timeAgo } from '@codeapps/ui'
import { Link } from 'react-router'
import { sections } from '../sections.ts'

export default function Overview() {
  const { registeredModules, isModuleEnabled, can, mode, naming } = useWorkspace()
  const assignments = useTable(roleAssignmentTable)
  const audit = useTable(auditEventTable)
  const { data, error } = useData(async () => {
    const [a, events] = await Promise.all([assignments.list(), audit.list({ orderBy: { field: 'createdOn', direction: 'desc' }, top: 5 })])
    return { users: new Set(a.map((x) => x.userUpn.toLowerCase())).size, assignments: a.length, events }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-5"><Stat label="Users with roles" value={data?.users ?? '…'} /></CardContent></Card>
        <Card><CardContent className="pt-5"><Stat label="Role assignments" value={data?.assignments ?? '…'} /></CardContent></Card>
        <Card>
          <CardContent className="pt-5">
            <Stat label="Modules enabled" value={`${registeredModules.filter((m) => isModuleEnabled(m.id)).length} / ${registeredModules.length}`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <Stat label="Data" value={mode === 'mock' ? 'Mock' : 'Dataverse'} hint={mode === 'mock' ? 'Offline sample data' : `Prefix ${naming.prefix}_`} />
          </CardContent>
        </Card>
      </div>
      {error ? <DataError error={error} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {!data ? <Skeleton className="h-24" /> : data.events.length === 0 ? <p className="text-sm text-muted">No events yet.</p> : (
              <ul className="divide-y divide-border text-sm">
                {data.events.map((e) => (
                  <li key={e.id} className="flex justify-between gap-4 py-2">
                    <span><span className="font-semibold">{e.action}</span> <span className="text-muted">by {e.actorUpn}</span></span>
                    <span className="shrink-0 text-muted">{timeAgo(e.createdOn)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Admin tasks</CardTitle><CardDescription>Shown according to your capabilities.</CardDescription></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {sections.slice(1).filter((s) => can(s.access)).map((s) => (
              <Link key={s.to} to={s.to} className="rounded border border-border p-3 text-sm font-semibold hover:border-primary hover:text-primary">{s.label}</Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
