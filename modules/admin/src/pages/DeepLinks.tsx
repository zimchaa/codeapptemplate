import { emailLink, teamsShareLink, useWorkspace } from '@codeapps/platform'
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Select, useToast } from '@codeapps/ui'
import { Link2, Mail, MessageSquare } from 'lucide-react'
import { useState } from 'react'

export default function DeepLinks() {
  const { visibleModules, deepLink, host, mode } = useWorkspace()
  const { toast } = useToast()
  const [moduleId, setModuleId] = useState(visibleModules[0]?.id ?? '')
  const [sub, setSub] = useState('')
  const module = visibleModules.find((m) => m.id === moduleId)
  const path = module ? `/${module.basePath}${sub.trim() ? `/${sub.trim().replace(/^\/+/, '')}` : ''}` : '/'
  const url = deepLink(path)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copied', tone: 'success' })
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Build a link</CardTitle>
          <CardDescription>Links open the app straight on a module, page or record, from email, Teams, SharePoint or anywhere else.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Module">{(id) => <Select id={id} value={moduleId} options={visibleModules.map((m) => ({ value: m.id, label: m.title }))} onChange={(e) => setModuleId(e.target.value)} />}</Field>
          <Field label="Page or record id" hint="Optional, e.g. a request id, or new">{(id) => <Input id={id} value={sub} onChange={(e) => setSub(e.target.value)} />}</Field>
          <Field label="Link">{(id) => <Input id={id} readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.target.select()} />}</Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}><Link2 /> Copy</Button>
            <Button variant="outline" onClick={() => window.open(emailLink(url, module?.title ?? 'Workspace'), '_blank', 'noopener')}><Mail /> Email</Button>
            <Button variant="outline" onClick={() => window.open(teamsShareLink(url, module?.title ?? 'Workspace'), '_blank', 'noopener')}><MessageSquare /> Teams</Button>
          </div>
          {(mode === 'mock' || !host.appId || host.appId === 'local') && (
            <Alert tone="warning" title="This is a local link">
              Published links need the app id. Set <code>app.playUrl</code> in Settings to the published app URL (from Power Apps → app → Details → Web link) after the first <code>pa app push</code>.
            </Alert>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Link formats</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>The app reads the query string passed to Power Apps. Both forms work:</p>
          <pre className="overflow-x-auto rounded bg-surface-muted p-3 text-xs">{`…/play/e/<environmentId>/app/<appId>?route=/requests/<id>
…/play/e/<environmentId>/app/<appId>?page=request&id=<id>`}</pre>
          <p>Inside the app, routes use the URL hash (<code>#/requests/…</code>), so the browser back button works within the Power Apps frame.</p>
          <p>Flows can build the same links, e.g. a Power Automate step that emails <code>{'<playUrl>?route=/requests/@{triggerOutputs()?[\'body/spg_requestid\']}'}</code>.</p>
        </CardContent>
      </Card>
    </div>
  )
}
