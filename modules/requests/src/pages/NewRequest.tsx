import { RequireCapability, useTable, useWorkspace } from '@codeapps/platform'
import { Alert, Button, buttonVariants, Card, CardContent, Field, Input, PageHeader, Select, Textarea, todayIso, useToast } from '@codeapps/ui'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { priorityOptions, requestTable, type RequestPriority } from '../schema.ts'
import { caps } from '../ui.ts'

export function NewRequest() {
  return (
    <RequireCapability capability={caps.create}>
      <NewRequestForm />
    </RequireCapability>
  )
}

function NewRequestForm() {
  const { user, audit } = useWorkspace()
  const table = useTable(requestTable)
  const navigate = useNavigate()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<RequestPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const titleError = title.trim().length === 0 ? 'Give the request a short title.' : undefined
  const [touched, setTouched] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (titleError) return
    setSaving(true)
    setError(undefined)
    try {
      const created = await table.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        priority,
        status: 'new',
        dueDate: dueDate || undefined,
        requesterUpn: user.upn,
        requesterName: user.displayName,
      })
      await audit({ action: 'request.created', module: 'requests', entity: 'request', recordId: created.id })
      toast({ title: 'Request raised', description: created.title, tone: 'success' })
      navigate(`../${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="New request" description="Describe what you need. You'll get a link you can share in email or Teams." />
      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
            {error && <Alert tone="danger" title="Couldn't save the request">{error}</Alert>}
            <Field label="Title" required error={touched ? titleError : undefined}>
              {(id) => <Input id={id} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} aria-invalid={touched && !!titleError} autoFocus />}
            </Field>
            <Field label="Description" hint="Include links, dates and who is affected.">
              {(id) => <Textarea id={id} rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />}
            </Field>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Category">
                {(id) => <Input id={id} value={category} maxLength={100} placeholder="e.g. Access" onChange={(e) => setCategory(e.target.value)} />}
              </Field>
              <Field label="Priority">
                {(id) => <Select id={id} value={priority} options={priorityOptions} onChange={(e) => setPriority(e.target.value as RequestPriority)} />}
              </Field>
              <Field label="Needed by">
                {(id) => <Input id={id} type="date" min={todayIso()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Raise request'}</Button>
              <Link to=".." className={buttonVariants({ variant: 'ghost' })}>Cancel</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
