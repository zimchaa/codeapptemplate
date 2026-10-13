import { DataError, RequireCapability, roleAssignmentTable, roleTable, settingKeys, useData, useTable, useWorkspace } from '@codeapps/platform'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Field, Input, Select, Skeleton, Table, TBody, TD, TH, THead, TR, useToast } from '@codeapps/ui'
import { Trash2, Users as UsersIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { caps } from '../caps.ts'

export default function Users() {
  return (
    <RequireCapability capability={caps.users}>
      <UsersPage />
    </RequireCapability>
  )
}

function UsersPage() {
  const { user, audit, refresh, setting } = useWorkspace()
  const assignments = useTable(roleAssignmentTable)
  const rolesTable = useTable(roleTable)
  const { toast } = useToast()
  const { data, error, reload } = useData(
    async () => {
      const [a, r] = await Promise.all([assignments.list({ orderBy: { field: 'userUpn' } }), rolesTable.list({ orderBy: { field: 'name' } })])
      return { assignments: a, roles: r }
    },
    [],
  )
  const [upn, setUpn] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [roleId, setRoleId] = useState('')
  const [filter, setFilter] = useState('')
  const [formError, setFormError] = useState<string>()

  if (error) return <DataError error={error} onRetry={reload} />
  if (!data) return <Skeleton className="h-48" />

  const roleName = (id: string) => data.roles.find((r) => r.id === id)?.name ?? 'Unknown role'
  const defaultRole = data.roles.find((r) => r.key === setting(settingKeys.defaultRole))
  const q = filter.trim().toLowerCase()
  const rows = data.assignments.filter((a) => !q || `${a.userUpn} ${a.userDisplayName ?? ''} ${roleName(a.roleId)}`.toLowerCase().includes(q))

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const email = upn.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Enter a valid user principal name (name@company.com).')
    if (!roleId) return setFormError('Choose a role.')
    if (data.assignments.some((a) => a.userUpn.toLowerCase() === email && a.roleId === roleId)) return setFormError('That user already has this role.')
    setFormError(undefined)
    const created = await assignments.create({ name: `${email}: ${roleName(roleId)}`, userUpn: email, userDisplayName: displayName.trim() || undefined, roleId })
    await audit({ action: 'role.assigned', module: 'admin', entity: 'roleassignment', recordId: created.id, details: { upn: email, role: roleName(roleId) } })
    toast({ title: `${roleName(roleId)} assigned to ${email}`, tone: 'success' })
    setUpn('')
    setDisplayName('')
    reload()
    if (email === user.upn) refresh()
  }

  const remove = async (id: string, email: string, role: string) => {
    if (!window.confirm(`Remove ${role} from ${email}?`)) return
    await assignments.remove(id)
    await audit({ action: 'role.unassigned', module: 'admin', entity: 'roleassignment', recordId: id, details: { upn: email, role } })
    reload()
    if (email.toLowerCase() === user.upn) refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Role assignments</CardTitle>
          <Input className="max-w-60" placeholder="Filter" aria-label="Filter assignments" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </CardHeader>
        {rows.length === 0 ? (
          <EmptyState icon={<UsersIcon />} title="No assignments" />
        ) : (
          <Table>
            <THead><tr><TH>User</TH><TH>Role</TH><TH className="text-right">Remove</TH></tr></THead>
            <TBody>
              {rows.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <span className="font-semibold">{a.userDisplayName || a.userUpn}</span>
                    {a.userDisplayName && <span className="block text-xs text-muted">{a.userUpn}</span>}
                  </TD>
                  <TD><Badge>{roleName(a.roleId)}</Badge></TD>
                  <TD className="text-right">
                    <Button size="icon" variant="ghost" aria-label={`Remove ${roleName(a.roleId)} from ${a.userUpn}`} onClick={() => remove(a.id, a.userUpn, roleName(a.roleId))}>
                      <Trash2 />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle>Assign a role</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="flex flex-col gap-4" noValidate>
              {formError && <Alert tone="danger">{formError}</Alert>}
              <Field label="User principal name" required>{(id) => <Input id={id} type="email" value={upn} placeholder="name@company.com" onChange={(e) => setUpn(e.target.value)} />}</Field>
              <Field label="Display name">{(id) => <Input id={id} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />}</Field>
              <Field label="Role" required>
                {(id) => <Select id={id} value={roleId} placeholder="Choose a role" options={data.roles.map((r) => ({ value: r.id, label: r.name }))} onChange={(e) => setRoleId(e.target.value)} />}
              </Field>
              <Button type="submit">Assign</Button>
            </form>
          </CardContent>
        </Card>
        <Alert tone="info" title="Default role">
          {defaultRole ? <>Everyone who signs in also gets <strong>{defaultRole.name}</strong>. Change it in Settings (<code>{settingKeys.defaultRole}</code>).</> : 'No default role: users only get roles assigned here.'}
        </Alert>
      </div>
    </div>
  )
}
