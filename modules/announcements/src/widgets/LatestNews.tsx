import { DataError, useData, useTable } from '@codeapps/platform'
import { formatDate, Skeleton, todayIso } from '@codeapps/ui'
import { Link } from 'react-router'
import { announcementTable, currentAnnouncements } from '../schema.ts'

export function LatestNewsWidget() {
  const table = useTable(announcementTable)
  const { data, error } = useData(() => table.list({ orderBy: { field: 'publishOn', direction: 'desc' }, top: 50 }), [])
  if (error) return <DataError error={error} />
  if (!data) return <Skeleton className="h-24" />
  const items = currentAnnouncements(data, todayIso()).slice(0, 3)
  if (!items.length) return <p className="text-sm text-muted">No announcements.</p>
  return (
    <ul className="flex flex-col gap-3 text-sm">
      {items.map((a) => (
        <li key={a.id}>
          <Link to={`/news/${a.id}`} className="font-semibold hover:text-primary hover:underline">{a.title}</Link>
          <p className="text-xs text-muted">{formatDate(a.publishOn)}</p>
        </li>
      ))}
    </ul>
  )
}
