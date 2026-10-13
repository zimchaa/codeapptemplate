import { auditEventTable, DataError, RequireCapability, useData, useTable, useWorkspace } from '@codeapps/platform'
import { Card, EmptyState, formatDateTime, Select, Skeleton, Table, TBody, TD, TH, THead, TR } from '@codeapps/ui'
import { History } from 'lucide-react'
import { useState } from 'react'
import { caps } from '../caps.ts'

export default function Audit() {
  return (
    <RequireCapability capability={caps.audit}>
      <AuditPage />
    </RequireCapability>
  )
}

function AuditPage() {
  const { registeredModules } = useWorkspace()
  const table = useTable(auditEventTable)
  const [module, setModule] = useState('')
  const { data, error, reload } = useData(
    () => table.list({ where: { module: module || undefined }, orderBy: { field: 'createdOn', direction: 'desc' }, top: 200 }),
    [module],
  )
  return (
    <>
      <Select
        className="mb-4 max-w-60"
        aria-label="Module"
        value={module}
        placeholder="All modules"
        options={registeredModules.map((m) => ({ value: m.id, label: m.title }))}
        onChange={(e) => setModule(e.target.value)}
      />
      {error ? <DataError error={error} onRetry={reload} /> : !data ? <Skeleton className="h-48" /> : (
        <Card>
          {data.length === 0 ? <EmptyState icon={<History />} title="No audit events" /> : (
            <Table>
              <THead><tr><TH>When</TH><TH>Action</TH><TH>Who</TH><TH className="hidden md:table-cell">Record</TH><TH className="hidden lg:table-cell">Details</TH></tr></THead>
              <TBody>
                {data.map((e) => (
                  <TR key={e.id}>
                    <TD className="whitespace-nowrap text-muted">{formatDateTime(e.createdOn)}</TD>
                    <TD><span className="font-semibold">{e.action}</span><span className="block text-xs text-muted">{e.module}</span></TD>
                    <TD>{e.actorUpn}</TD>
                    <TD className="hidden font-mono text-xs md:table-cell">{e.entity}{e.recordId && <span className="block text-muted">{e.recordId}</span>}</TD>
                    <TD className="hidden max-w-xs truncate font-mono text-xs lg:table-cell" title={e.details}>{e.details}</TD>
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
