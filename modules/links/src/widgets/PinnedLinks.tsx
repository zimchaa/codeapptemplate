import { DataError } from '@codeapps/platform'
import { Skeleton } from '@codeapps/ui'
import { ExternalLink } from 'lucide-react'
import { useVisibleLinks } from '../useVisibleLinks.ts'

export function PinnedLinksWidget() {
  const { visible, data, error } = useVisibleLinks()
  if (error) return <DataError error={error} />
  if (!data) return <Skeleton className="h-24" />
  const pinned = visible.filter((l) => l.pinned).slice(0, 6)
  if (!pinned.length) return <p className="text-sm text-muted">No pinned apps yet.</p>
  return (
    <ul className="grid grid-cols-2 gap-2 text-sm">
      {pinned.map((l) => (
        <li key={l.id}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded border border-border p-2 font-semibold hover:border-primary hover:text-primary">
            <span className="truncate">{l.title}</span>
            <ExternalLink className="size-3 shrink-0 text-muted" aria-label="(opens in a new tab)" />
          </a>
        </li>
      ))}
    </ul>
  )
}
