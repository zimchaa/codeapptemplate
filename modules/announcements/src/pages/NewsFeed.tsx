import { Can, DataError, useData, useTable, useWorkspace } from '@codeapps/platform'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, formatDate, PageHeader, Skeleton, Table, TBody, TD, TH, THead, todayIso, TR } from '@codeapps/ui'
import { Megaphone, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { caps } from '../caps.ts'
import { announcementTable, currentAnnouncements, type AnnouncementRecord } from '../schema.ts'
import { AnnouncementEditor } from './AnnouncementEditor.tsx'

export function NewsFeed() {
  const { can, audit } = useWorkspace()
  const table = useTable(announcementTable)
  const { data, error, loading, reload } = useData(() => table.list({ orderBy: { field: 'publishOn', direction: 'desc' }, top: 200 }), [])
  const [editing, setEditing] = useState<{ record?: AnnouncementRecord } | null>(null)
  const today = todayIso()
  const current = currentAnnouncements(data ?? [], today)

  const remove = async (record: AnnouncementRecord) => {
    if (!window.confirm(`Delete "${record.title}"?`)) return
    await table.remove(record.id)
    await audit({ action: 'announcement.deleted', module: 'announcements', entity: 'announcement', recordId: record.id })
    reload()
  }

  return (
    <>
      <PageHeader
        title="News"
        description="Announcements for everyone in the workspace."
        actions={<Can capability={caps.manage}><Button onClick={() => setEditing({})}><Plus /> New announcement</Button></Can>}
      />
      {error ? (
        <DataError error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-40" />
      ) : current.length === 0 ? (
        <Card><EmptyState icon={<Megaphone />} title="Nothing new right now" /></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {current.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  {a.pinned && <Badge tone="primary"><Pin className="size-3" /> Pinned</Badge>}
                  <span>{formatDate(a.publishOn)}</span>
                  {a.authorName && <span>· {a.authorName}</span>}
                </div>
                <CardTitle className="text-lg">
                  <Link to={a.id} className="hover:text-primary hover:underline">{a.title}</Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {can(caps.manage) && data && (
        <section className="mt-10">
          <h2 className="mb-3 font-heading text-lg font-bold">Manage all announcements</h2>
          <Card>
            <Table>
              <THead><tr><TH>Title</TH><TH>Publish</TH><TH>Expires</TH><TH>State</TH><TH className="text-right">Actions</TH></tr></THead>
              <TBody>
                {data.map((a) => {
                  const state = a.publishOn > today ? 'Scheduled' : a.expiresOn && a.expiresOn < today ? 'Expired' : 'Live'
                  return (
                    <TR key={a.id}>
                      <TD className="font-semibold">{a.title}</TD>
                      <TD>{formatDate(a.publishOn)}</TD>
                      <TD>{formatDate(a.expiresOn)}</TD>
                      <TD><Badge tone={state === 'Live' ? 'success' : 'neutral'}>{state}</Badge></TD>
                      <TD className="text-right">
                        <Button size="icon" variant="ghost" aria-label={`Edit ${a.title}`} onClick={() => setEditing({ record: a })}><Pencil /></Button>
                        <Button size="icon" variant="ghost" aria-label={`Delete ${a.title}`} onClick={() => remove(a)}><Trash2 /></Button>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </Card>
        </section>
      )}
      <AnnouncementEditor open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} record={editing?.record} onSaved={reload} />
    </>
  )
}
