import { DataError, useData, useTable, useWorkspace } from '@codeapps/platform'
import {
  Badge,
  buttonVariants,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Table,
  Tabs,
  TabsList,
  TabsTrigger,
  TBody,
  TD,
  TH,
  THead,
  timeAgo,
  TR,
} from '@codeapps/ui'
import { Inbox, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { requestTable, statusOptions, type RequestStatus } from '../schema.ts'
import { caps, priorityLabel, priorityTone, statusLabel, statusTone } from '../ui.ts'

type View = 'mine' | 'assigned' | 'all'

export function RequestList() {
  const { user, can } = useWorkspace()
  const table = useTable(requestTable)
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const canManage = can(caps.manage)

  // View and status live in the URL (#/requests?view=all&status=new), so filtered lists are linkable.
  const requested = params.get('view') as View | null
  const view: View = requested === 'all' && !canManage ? 'mine' : (requested ?? (canManage ? 'all' : 'mine'))
  const status = (params.get('status') ?? '') as RequestStatus | ''

  const setParam = (key: string, value: string) =>
    setParams((p) => {
      if (value) p.set(key, value)
      else p.delete(key)
      return p
    })

  const { data, error, loading, reload } = useData(
    () =>
      table.list({
        where: {
          requesterUpn: view === 'mine' ? user.upn : undefined,
          assigneeUpn: view === 'assigned' ? user.upn : undefined,
          status: status || undefined,
        },
        search,
        orderBy: { field: 'modifiedOn', direction: 'desc' },
        top: 200,
      }),
    [view, status, search, user.upn],
  )

  return (
    <>
      <PageHeader
        title="Requests"
        description="Track work you've asked for or been assigned. Open a request to share a direct link."
        actions={
          can(caps.create) && (
            <Link to="new" className={buttonVariants()}>
              <Plus /> New request
            </Link>
          )
        }
      />
      <Tabs value={view} onValueChange={(v) => setParam('view', v)}>
        <TabsList>
          <TabsTrigger value="mine">Raised by me</TabsTrigger>
          <TabsTrigger value="assigned">Assigned to me</TabsTrigger>
          {canManage && <TabsTrigger value="all">All requests</TabsTrigger>}
        </TabsList>
      </Tabs>
      <div className="my-4 flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search titles" />
        <Select
          className="max-w-52"
          aria-label="Status"
          value={status}
          onChange={(e) => setParam('status', e.target.value)}
          placeholder="Any status"
          options={statusOptions}
        />
      </div>
      {error ? (
        <DataError error={error} onRetry={reload} />
      ) : (
        <Card>
          {loading && !data ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : !data?.length ? (
            <EmptyState icon={<Inbox />} title="No requests here" description="Try another tab or filter, or raise a new request." />
          ) : (
            <Table aria-busy={loading}>
              <THead>
                <tr>
                  <TH>Title</TH>
                  <TH>Status</TH>
                  <TH className="hidden md:table-cell">Priority</TH>
                  <TH className="hidden lg:table-cell">Requester</TH>
                  <TH className="hidden lg:table-cell">Assignee</TH>
                  <TH className="hidden sm:table-cell">Updated</TH>
                </tr>
              </THead>
              <TBody>
                {data.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link to={r.id} className="font-semibold text-foreground hover:text-primary hover:underline">
                        {r.title}
                      </Link>
                      {r.category && <span className="block text-xs text-muted">{r.category}</span>}
                    </TD>
                    <TD><Badge tone={statusTone[r.status]}>{statusLabel(r.status)}</Badge></TD>
                    <TD className="hidden md:table-cell"><Badge tone={priorityTone[r.priority]}>{priorityLabel(r.priority)}</Badge></TD>
                    <TD className="hidden lg:table-cell">{r.requesterName ?? r.requesterUpn}</TD>
                    <TD className="hidden lg:table-cell">{r.assigneeName || r.assigneeUpn || <span className="text-muted">Unassigned</span>}</TD>
                    <TD className="hidden text-muted sm:table-cell">{timeAgo(r.modifiedOn)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}
    </>
  )
}
