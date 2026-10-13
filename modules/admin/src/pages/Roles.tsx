import { DataError, parseCapabilities, RequireCapability, roleTable, useData, useTable, useWorkspace, type RoleRecord } from '@codeapps/platform'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from '@codeapps/ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { caps } from '../caps.ts'

export default function Roles() {
  return (
    <RequireCapability capability={caps.roles}>
      <RolesPage />
    </RequireCapability>
  )
}

function RolesPage() {
  const table = useTable(roleTable)
  const { audit, refresh } = useWorkspace()
  const { data, error, reload } = useData(() => table.list({ orderBy: { field: 'name' } }), [])
  const [editing, setEditing] = useState<{ role?: RoleRecord } | null>(null)

  if (error) return <DataError error={error} onRetry={reload} />
  if (!data) return <Skeleton className="h-48" />

  const remove = async (role: RoleRecord) => {
    if (!window.confirm(`Delete role "${role.name}"? Users assigned to it lose its capabilities.`)) return
    await table.remove(role.id)
    await audit({ action: 'role.deleted', module: 'admin', entity: 'approle', recordId: role.id, details: { key: role.key } })
    reload()
    refresh()
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({})}><Plus /> New role</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((role) => {
          const list = parseCapabilities(role.capabilities)
          return (
            <Card key={role.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {role.name} {role.isSystem && <Badge tone="outline">System</Badge>}
                  </CardTitle>
                  <CardDescription>{role.description} <code className="text-xs">({role.key})</code></CardDescription>
                </div>
                <div className="flex">
                  <Button size="icon" variant="ghost" aria-label={`Edit ${role.name}`} onClick={() => setEditing({ role })}><Pencil /></Button>
                  {!role.isSystem && (
                    <Button size="icon" variant="ghost" aria-label={`Delete ${role.name}`} onClick={() => remove(role)}><Trash2 /></Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {list.length === 0 ? <span className="text-sm text-muted">No capabilities</span> : list.map((c) => <Badge key={c} tone={c.includes('*') ? 'primary' : 'neutral'}>{c}</Badge>)}
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <RoleForm
            key={editing.role?.id ?? 'new'}
            role={editing.role}
            existingKeys={data.map((r) => r.key)}
            onDone={() => {
              setEditing(null)
              reload()
              refresh()
            }}
          />
        )}
      </Dialog>
    </>
  )
}

function RoleForm({ role, existingKeys, onDone }: { role?: RoleRecord; existingKeys: string[]; onDone: () => void }) {
  const { registeredModules, audit } = useWorkspace()
  const table = useTable(roleTable)
  const { toast } = useToast()
  const [name, setName] = useState(role?.name ?? '')
  const [key, setKey] = useState(role?.key ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const initial = parseCapabilities(role?.capabilities)
  const known = new Set(registeredModules.flatMap((m) => m.capabilities.map((c) => c.id)))
  const [selected, setSelected] = useState(() => new Set(initial.filter((c) => known.has(c))))
  const [patterns, setPatterns] = useState(initial.filter((c) => !known.has(c)).join('\n'))
  const [error, setError] = useState<string>()

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required.')
    if (!role && !/^[a-z][a-z0-9-]{1,49}$/.test(key)) return setError('Key: lower-case letters, digits and dashes, starting with a letter.')
    if (!role && existingKeys.includes(key)) return setError('A role with this key already exists.')
    const capabilities = [...selected, ...parseCapabilities(patterns)].join('\n')
    const values = { name: name.trim(), description: description.trim(), capabilities }
    const saved = role ? await table.update(role.id, values) : await table.create({ ...values, key, isSystem: false })
    await audit({ action: role ? 'role.updated' : 'role.created', module: 'admin', entity: 'approle', recordId: saved.id, details: { capabilities } })
    toast({ title: `Role "${saved.name}" saved`, tone: 'success' })
    onDone()
  }

  return (
    <DialogContent title={role ? `Edit ${role.name}` : 'New role'} description="Tick capabilities, or add patterns such as requests.* or *." className="max-w-3xl">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Key" required hint={role ? 'Keys cannot change.' : 'Used in settings, e.g. team-lead.'}>
            {(id) => <Input id={id} value={key} disabled={!!role} onChange={(e) => setKey(e.target.value.toLowerCase())} />}
          </Field>
        </div>
        <Field label="Description">{(id) => <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} />}</Field>
        <fieldset className="flex flex-col gap-4 rounded border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Capabilities by module</legend>
          {registeredModules.map((m) => (
            <div key={m.id}>
              <p className="mb-2 text-sm font-semibold">{m.title}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {m.capabilities.map((c) => (
                  <Checkbox key={c.id} label={<span>{c.label} <code className="text-xs text-muted">{c.id}</code></span>} checked={selected.has(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} />
                ))}
              </div>
            </div>
          ))}
        </fieldset>
        <Field label="Additional patterns" hint="One per line. * = everything, requests.* = all request capabilities.">
          {(id) => <Textarea id={id} rows={3} value={patterns} onChange={(e) => setPatterns(e.target.value)} className="font-mono" />}
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit">Save role</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
