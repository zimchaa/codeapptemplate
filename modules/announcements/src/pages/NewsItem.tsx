import { DataError, NotFound, ShareMenu, useData, useTable } from '@codeapps/platform'
import { Badge, Card, CardContent, formatDate, PageHeader, Skeleton } from '@codeapps/ui'
import { ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { announcementTable } from '../schema.ts'

export function NewsItem() {
  const { id = '' } = useParams()
  const table = useTable(announcementTable)
  const { data, error, loading, reload } = useData(() => table.get(id), [id])
  if (error) return <DataError error={error} onRetry={reload} />
  if (loading && !data) return <Skeleton className="h-48" />
  if (!data) return <NotFound />
  return (
    <>
      <PageHeader
        eyebrow={<Link to=".." className="hover:underline">News</Link>}
        title={data.title}
        description={
          <span className="flex items-center gap-2">
            {data.pinned && <Badge tone="primary">Pinned</Badge>}
            {formatDate(data.publishOn)}{data.authorName && ` · ${data.authorName}`}
          </span>
        }
        actions={<ShareMenu path={`/news/${data.id}`} title={data.title} />}
      />
      <Card className="max-w-3xl">
        <CardContent className="flex flex-col gap-4 pt-5">
          <p className="whitespace-pre-wrap leading-relaxed">{data.body}</p>
          {data.link && (
            <a href={data.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Read more <ExternalLink className="size-4" />
            </a>
          )}
        </CardContent>
      </Card>
    </>
  )
}
