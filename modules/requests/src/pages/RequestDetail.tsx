import { DataError, NotFound, ShareMenu, teamsChatLink, useData, useTable, useWorkspace } from '@codeapps/platform'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  formatDate,
  formatDateTime,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  timeAgo,
  useToast,
} from '@codeapps/ui'
import { MessageSquare, MessagesSquare } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { requestCommentTable, requestTable, statusOptions, type RequestRecord, type RequestStatus } from '../schema.ts'
import { caps, priorityLabel, priorityTone, statusLabel, statusTone } from '../ui.ts'

export function RequestDetail() {
  const { id = '' } = useParams()
  const table = useTable(requestTable)
  const { data: request, error, loading, reload } = useData(() => table.get(id), [id])

  if (error) return <DataError error={error} onRetry={reload} />
  if (loading && !request) return <Skeleton className="h-64 w-full" />
  if (!request) return <NotFound />
  return <RequestView request={request} onChanged={reload} />
}

function RequestView({ request, onChanged }: { request: RequestRecord; onChanged: () => void }) {
  const { user, can } = useWorkspace()
  const isRequester = request.requesterUpn.toLowerCase() === user.upn
  const isAssignee = request.assigneeUpn?.toLowerCase() === user.upn
  // UI-level rule; also enforce with Dataverse security roles (docs/workspace/access-control.md).
  const canSee = can(caps.manage) || isRequester || isAssignee
  if (!canSee) return <NotFound />

  const chatWith = [isRequester ? request.assigneeUpn : request.requesterUpn].filter((u): u is string => !!u && u !== user.upn)

  return (
    <>
      <PageHeader
        eyebrow={<Link to=".." className="hover:underline">Requests</Link>}
        title={request.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[request.status]}>{statusLabel(request.status)}</Badge>
            <Badge tone={priorityTone[request.priority]}>{priorityLabel(request.priority)} priority</Badge>
            {request.category && <Badge tone="outline">{request.category}</Badge>}
            <span>Raised {timeAgo(request.createdOn)} by {request.requesterName ?? request.requesterUpn}</span>
          </span>
        }
        actions={
          <>
            {chatWith.length > 0 && (
              <a
                className="inline-flex h-10 items-center gap-2 rounded border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
                href={teamsChatLink(chatWith, `About request "${request.title}"`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessagesSquare className="size-4" /> Chat in Teams
              </a>
            )}
            <ShareMenu path={`/requests/${request.id}`} title={`Request: ${request.title}`} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{request.description || <span className="text-muted">No description.</span>}</p>
            </CardContent>
          </Card>
          <Comments requestId={request.id} />
        </div>
        <div className="flex flex-col gap-6">
          <Details request={request} />
          <Manage request={request} isRequester={isRequester} onChanged={onChanged} />
        </div>
      </div>
    </>
  )
}

function Details({ request }: { request: RequestRecord }) {
  const rows: [string, string][] = [
    ['Requester', request.requesterName ?? request.requesterUpn],
    ['Assignee', request.assigneeName || request.assigneeUpn || 'Unassigned'],
    ['Needed by', formatDate(request.dueDate)],
    ['Created', formatDateTime(request.createdOn)],
    ['Last updated', formatDateTime(request.modifiedOn)],
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function Manage({ request, isRequester, onChanged }: { request: RequestRecord; isRequester: boolean; onChanged: () => void }) {
  const { can, user, audit } = useWorkspace()
  const table = useTable(requestTable)
  const { toast } = useToast()
  const canManage = can(caps.manage)
  const [status, setStatus] = useState<RequestStatus>(request.status)
  const [assigneeUpn, setAssigneeUpn] = useState(request.assigneeUpn ?? '')
  const [saving, setSaving] = useState(false)

  if (!canManage && !isRequester) return null

  const save = async (changes: Partial<RequestRecord>, action: string) => {
    setSaving(true)
    try {
      await table.update(request.id, changes)
      await audit({ action, module: 'requests', entity: 'request', recordId: request.id, details: changes })
      toast({ title: 'Request updated', tone: 'success' })
      onChanged()
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : String(err), tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    // Requesters can close their own request.
    return request.status === 'closed' ? null : (
      <Card>
        <CardContent className="pt-5">
          <Button variant="outline" disabled={saving} onClick={() => save({ status: 'closed' }, 'request.closed')}>
            Close my request
          </Button>
        </CardContent>
      </Card>
    )
  }

  const assignee = assigneeUpn.trim().toLowerCase()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Status">
          {(id) => <Select id={id} value={status} options={statusOptions} onChange={(e) => setStatus(e.target.value as RequestStatus)} />}
        </Field>
        <Field label="Assignee (UPN)" hint={<button type="button" className="text-primary hover:underline" onClick={() => setAssigneeUpn(user.upn)}>Assign to me</button>}>
          {(id) => <Input id={id} type="email" value={assigneeUpn} placeholder="name@company.com" onChange={(e) => setAssigneeUpn(e.target.value)} />}
        </Field>
        <Button
          disabled={saving || (status === request.status && assignee === (request.assigneeUpn ?? '').toLowerCase())}
          onClick={() =>
            save(
              {
                status,
                // '' clears the column (null in Dataverse).
                assigneeUpn: assignee,
                assigneeName: assignee === user.upn ? user.displayName : assignee === request.assigneeUpn ? (request.assigneeName ?? '') : '',
              },
              'request.updated',
            )
          }
        >
          Save changes
        </Button>
      </CardContent>
    </Card>
  )
}

function Comments({ requestId }: { requestId: string }) {
  const { user, audit } = useWorkspace()
  const table = useTable(requestCommentTable)
  const { data, error, loading, reload } = useData(
    () => table.list({ where: { requestId }, orderBy: { field: 'createdOn', direction: 'asc' } }),
    [requestId],
  )
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSaving(true)
    try {
      const created = await table.create({
        summary: text.split('\n')[0].slice(0, 200),
        body: text,
        requestId,
        authorUpn: user.upn,
        authorName: user.displayName,
      })
      await audit({ action: 'request.commented', module: 'requests', entity: 'requestcomment', recordId: created.id })
      setBody('')
      reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discussion</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <DataError error={error} onRetry={reload} />
        ) : loading && !data ? (
          <Skeleton className="h-16" />
        ) : !data?.length ? (
          <EmptyState icon={<MessageSquare />} title="No comments yet" className="py-6" />
        ) : (
          <ol className="flex flex-col gap-4">
            {data.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.authorName ?? c.authorUpn} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{c.authorName ?? c.authorUpn}</span>{' '}
                    <span className="text-xs text-muted">{timeAgo(c.createdOn)}</span>
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <form onSubmit={submit} className="flex flex-col gap-2 border-t border-border pt-4">
          <Field label="Add a comment">
            {(id) => <Textarea id={id} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />}
          </Field>
          <Button type="submit" className="self-end" disabled={saving || !body.trim()}>
            {saving ? 'Posting…' : 'Post comment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
