import { DataError, useData, useTable, useWorkspace } from '@codeapps/platform'
import { Badge, Skeleton, Stat } from '@codeapps/ui'
import { Link } from 'react-router'
import { openStatuses, requestTable } from '../schema.ts'
import { statusLabel, statusTone } from '../ui.ts'

export function MyRequestsWidget() {
  const { user } = useWorkspace()
  const table = useTable(requestTable)
  const { data, error } = useData(
    async () => {
      const [mine, assigned] = await Promise.all([
        table.list({ where: { requesterUpn: user.upn }, orderBy: { field: 'modifiedOn', direction: 'desc' } }),
        table.list({ where: { assigneeUpn: user.upn } }),
      ])
      return {
        mine: mine.filter((r) => openStatuses.includes(r.status)),
        assigned: assigned.filter((r) => openStatuses.includes(r.status)),
      }
    },
    [user.upn],
  )
  if (error) return <DataError error={error} />
  if (!data) return <Skeleton className="h-24" />
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-8">
        <Stat label="Open, raised by me" value={data.mine.length} />
        <Stat label="Assigned to me" value={data.assigned.length} />
      </div>
      <ul className="divide-y divide-border text-sm">
        {data.mine.slice(0, 3).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 py-2">
            <Link to={`/requests/${r.id}`} className="truncate font-semibold hover:text-primary hover:underline">{r.title}</Link>
            <Badge tone={statusTone[r.status]}>{statusLabel(r.status)}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
