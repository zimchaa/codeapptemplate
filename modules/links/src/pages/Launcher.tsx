import { Can, DataError, useTable, useWorkspace } from '@codeapps/platform'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Skeleton,
  useToast,
} from '@codeapps/ui'
import { ExternalLink, LayoutGrid, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { caps } from '../caps.ts'
import { quickLinkTable, type QuickLinkRecord } from '../schema.ts'
import { useVisibleLinks } from '../useVisibleLinks.ts'

export function Launcher() {
  const { can, audit } = useWorkspace()
  const { visible, error, loading, data, reload, table } = useVisibleLinks()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<{ record?: QuickLinkRecord } | null>(null)
  const canManage = can(caps.manage)

  const q = search.trim().toLowerCase()
  const filtered = visible.filter((l) => !q || `${l.title} ${l.description ?? ''} ${l.category}`.toLowerCase().includes(q))
  const categories = [...new Set(filtered.map((l) => l.category))].sort()

  const remove = async (link: QuickLinkRecord) => {
    if (!window.confirm(`Remove "${link.title}"?`)) return
    await table.remove(link.id)
    await audit({ action: 'link.deleted', module: 'links', entity: 'quicklink', recordId: link.id })
    reload()
  }

  return (
    <>
      <PageHeader
        title="App launcher"
        description="Apps and tools for your role. Links open in a new tab."
        actions={<Can capability={caps.manage}><Button onClick={() => setEditing({})}><Plus /> Add link</Button></Can>}
      />
      <Input className="mb-6 max-w-sm" placeholder="Filter apps" aria-label="Filter apps" value={search} onChange={(e) => setSearch(e.target.value)} />
      {error ? (
        <DataError error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-40" />
      ) : categories.length === 0 ? (
        <Card><EmptyState icon={<LayoutGrid />} title="No apps to show" /></Card>
      ) : (
        <div className="flex flex-col gap-8">
          {categories.map((category) => (
            <section key={category} aria-label={category}>
              <h2 className="mb-3 font-heading text-lg font-bold">{category}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.filter((l) => l.category === category).map((l) => (
                  <Card key={l.id} className="group relative flex items-start gap-3 p-4 transition-shadow hover:shadow-lg">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded bg-primary-subtle font-bold text-primary">
                      {l.title[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold after:absolute after:inset-0 hover:text-primary">
                        {l.title}
                        <ExternalLink className="ml-1 inline size-3 text-muted" aria-label="(opens in a new tab)" />
                      </a>
                      {l.description && <p className="truncate text-sm text-muted">{l.description}</p>}
                    </div>
                    {l.pinned && <Pin className="size-4 shrink-0 text-primary" aria-label="Pinned" />}
                    {canManage && (
                      <div className="relative z-10 flex opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                        <Button size="icon" variant="ghost" aria-label={`Edit ${l.title}`} onClick={() => setEditing({ record: l })}><Pencil /></Button>
                        <Button size="icon" variant="ghost" aria-label={`Remove ${l.title}`} onClick={() => remove(l)}><Trash2 /></Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <LinkForm key={editing.record?.id ?? 'new'} record={editing.record} onDone={() => { setEditing(null); reload() }} />}
      </Dialog>
    </>
  )
}

function LinkForm({ record, onDone }: { record?: QuickLinkRecord; onDone: () => void }) {
  const table = useTable(quickLinkTable)
  const { audit } = useWorkspace()
  const { toast } = useToast()
  const [form, setForm] = useState({
    title: record?.title ?? '',
    url: record?.url ?? 'https://',
    description: record?.description ?? '',
    category: record?.category ?? '',
    sortOrder: record?.sortOrder ?? 100,
    requiredCapability: record?.requiredCapability ?? '',
    pinned: record?.pinned ?? false,
  })
  const [error, setError] = useState<string>()
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.category.trim()) return setError('Title and category are required.')
    if (!/^https:\/\/\S+$/i.test(form.url)) return setError('URL must start with https://')
    try {
      const saved = record ? await table.update(record.id, form) : await table.create(form)
      await audit({ action: record ? 'link.updated' : 'link.created', module: 'links', entity: 'quicklink', recordId: saved.id })
      toast({ title: 'Link saved', tone: 'success' })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <DialogContent title={record ? 'Edit link' : 'Add link'}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Title" required>{(id) => <Input id={id} value={form.title} onChange={(e) => set('title', e.target.value)} />}</Field>
        <Field label="URL" required>{(id) => <Input id={id} type="url" value={form.url} onChange={(e) => set('url', e.target.value)} />}</Field>
        <Field label="Description">{(id) => <Input id={id} value={form.description} onChange={(e) => set('description', e.target.value)} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required>{(id) => <Input id={id} value={form.category} onChange={(e) => set('category', e.target.value)} />}</Field>
          <Field label="Sort order">{(id) => <Input id={id} type="number" min={0} value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} />}</Field>
        </div>
        <Field label="Required capability" hint="Optional, e.g. admin.access. Leave empty for everyone.">
          {(id) => <Input id={id} value={form.requiredCapability} onChange={(e) => set('requiredCapability', e.target.value)} />}
        </Field>
        <Checkbox label="Pin to the dashboard" checked={form.pinned} onChange={(e) => set('pinned', e.target.checked)} />
        <DialogFooter>
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
