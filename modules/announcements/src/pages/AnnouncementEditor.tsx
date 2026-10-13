import { useTable, useWorkspace } from '@codeapps/platform'
import { Alert, Button, Checkbox, Dialog, DialogContent, DialogFooter, Field, Input, Textarea, todayIso, useToast } from '@codeapps/ui'
import { useState, type FormEvent } from 'react'
import { announcementTable, type AnnouncementRecord } from '../schema.ts'

export interface AnnouncementEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing record to edit; omit to create. */
  record?: AnnouncementRecord
  onSaved: () => void
}

export function AnnouncementEditor(props: AnnouncementEditorProps) {
  // Remount the form for each record so its state starts fresh.
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <EditorForm key={props.record?.id ?? 'new'} {...props} />}
    </Dialog>
  )
}

function EditorForm({ onOpenChange, record, onSaved }: AnnouncementEditorProps) {
  const { user, audit } = useWorkspace()
  const table = useTable(announcementTable)
  const { toast } = useToast()
  const [form, setForm] = useState({
    title: record?.title ?? '',
    body: record?.body ?? '',
    publishOn: record?.publishOn ?? todayIso(),
    expiresOn: record?.expiresOn ?? '',
    pinned: record?.pinned ?? false,
    link: record?.link ?? '',
  })
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return setError('Title and body are required.')
    if (form.expiresOn && form.expiresOn < form.publishOn) return setError('Expiry must be on or after the publish date.')
    if (form.link && !/^https:\/\//i.test(form.link)) return setError('Links must start with https://')
    setSaving(true)
    try {
      const values = { ...form, title: form.title.trim(), body: form.body.trim() }
      const saved = record
        ? await table.update(record.id, values)
        : await table.create({ ...values, authorName: user.displayName })
      await audit({ action: record ? 'announcement.updated' : 'announcement.created', module: 'announcements', entity: 'announcement', recordId: saved.id })
      toast({ title: record ? 'Announcement updated' : 'Announcement published', tone: 'success' })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <DialogContent title={record ? 'Edit announcement' : 'New announcement'} className="max-w-2xl">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Title" required>{(id) => <Input id={id} value={form.title} maxLength={200} onChange={(e) => set('title', e.target.value)} />}</Field>
        <Field label="Body" required>{(id) => <Textarea id={id} rows={6} value={form.body} onChange={(e) => set('body', e.target.value)} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Publish on" required>{(id) => <Input id={id} type="date" value={form.publishOn} onChange={(e) => set('publishOn', e.target.value)} />}</Field>
          <Field label="Expires on" hint="Optional">{(id) => <Input id={id} type="date" value={form.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} />}</Field>
        </div>
        <Field label="Read-more link" hint="Optional, https:// only">{(id) => <Input id={id} type="url" value={form.link} onChange={(e) => set('link', e.target.value)} />}</Field>
        <Checkbox label="Pin to the top" checked={form.pinned} onChange={(e) => set('pinned', e.target.checked)} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
