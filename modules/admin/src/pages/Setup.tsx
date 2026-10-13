import { useWorkspace } from '@codeapps/platform'
import { Alert, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TBody, TD, TH, THead, TR } from '@codeapps/ui'

export default function Setup() {
  const { mode, naming, tables, missingTables, user, host } = useWorkspace()
  const commands = tables.map((t) => `pa app add data-source --connector dataverse --table ${naming.table(t)}`)
  return (
    <div className="flex flex-col gap-6">
      {mode === 'mock' ? (
        <Alert tone="info" title="Offline mode">
          Running against sample data in your browser. Use <code>pnpm dev:powerapps</code> with a connected environment for real data.
        </Alert>
      ) : missingTables.length > 0 ? (
        <Alert tone="warning" title={`${missingTables.length} table(s) not connected`}>Run the commands below from <code>apps/workspace</code>, then rebuild.</Alert>
      ) : (
        <Alert tone="success" title="All tables connected">Signed in as {user.upn} · environment {host.environmentId}</Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Dataverse tables</CardTitle>
          <CardDescription>Publisher prefix <code>{naming.prefix}_</code>. Created by <code>pnpm dataverse:provision</code>; see apps/workspace/README.md.</CardDescription>
        </CardHeader>
        <Table>
          <THead><tr><TH>Table</TH><TH>Logical name</TH><TH>Entity set</TH><TH>Status</TH></tr></THead>
          <TBody>
            {tables.map((t) => {
              const logical = naming.table(t)
              const ok = mode === 'mock' || !missingTables.includes(logical)
              return (
                <TR key={t.name}>
                  <TD className="font-semibold">{t.displayName}<span className="block text-xs font-normal text-muted">{t.description}</span></TD>
                  <TD><code className="text-xs">{logical}</code></TD>
                  <TD><code className="text-xs">{naming.entitySet(t)}</code></TD>
                  <TD><Badge tone={ok ? 'success' : 'warning'}>{mode === 'mock' ? 'Mock' : ok ? 'Connected' : 'Missing'}</Badge></TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      </Card>
      <Card>
        <CardHeader><CardTitle>Connect all tables</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-surface-muted p-3 text-xs">{`cd apps/workspace\n${commands.join('\n')}`}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
