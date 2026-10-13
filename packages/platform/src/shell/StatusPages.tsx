import { Alert, Button, buttonVariants, Card, CardContent, EmptyState, PageHeader, Spinner } from '@codeapps/ui'
import { Ban, Compass, PlugZap, PowerOff } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { TableNotConnectedError } from '../data/types.ts'
import { useWorkspace } from '../runtime/context.ts'
import { settingKeys } from '../schema/platform-tables.ts'

function SupportHint() {
  const { setting } = useWorkspace()
  const email = setting(settingKeys.supportEmail)
  return email ? (
    <p className="text-sm text-muted">
      Need help? Contact <a className="text-primary underline" href={`mailto:${email}`}>{email}</a>.
    </p>
  ) : null
}

export function Forbidden({ capability }: { capability?: string }) {
  return (
    <EmptyState
      icon={<Ban />}
      title="You don't have access to this"
      description={
        <>
          This page needs the <code className="rounded bg-surface-muted px-1">{capability ?? 'required'}</code> capability.
          Ask a workspace administrator to assign you a role that includes it.
          <span className="mt-2 block"><SupportHint /></span>
        </>
      }
      action={<Link className={buttonVariants({ variant: 'outline' })} to="/">Go to home</Link>}
    />
  )
}

export function NotFound() {
  return (
    <EmptyState
      icon={<Compass />}
      title="Page not found"
      description="The link may be out of date, or the module may have moved."
      action={<Link className={buttonVariants({ variant: 'outline' })} to="/">Go to home</Link>}
    />
  )
}

export function ModuleDisabled({ title }: { title: string }) {
  return (
    <EmptyState
      icon={<PowerOff />}
      title={`${title} is turned off`}
      description="An administrator has disabled this module."
      action={<Link className={buttonVariants({ variant: 'outline' })} to="/">Go to home</Link>}
    />
  )
}

export function Splash({ label = 'Starting workspace' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner label={label} />
    </div>
  )
}

/** Shows Dataverse "table not connected" errors with the fix, other errors plainly. */
export function DataError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof TableNotConnectedError) {
    return (
      <Alert tone="warning" title={`${error.table.displayCollectionName} isn't connected yet`}>
        <p>Add the table to this code app, then rebuild:</p>
        <pre className="mt-2 overflow-x-auto rounded bg-surface-muted p-2 text-xs">
          pa app add data-source --connector dataverse --table {error.logicalName}
        </pre>
      </Alert>
    )
  }
  const message = error instanceof Error ? error.message : String(error)
  return (
    <Alert tone="danger" title="Something went wrong loading data">
      <p className="break-words">{message}</p>
      {onRetry && (
        <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Alert>
  )
}

export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />
  return (
    <div className="p-6">
      <DataError error={error instanceof Error ? error : new Error(String((error as { statusText?: string })?.statusText ?? error))} />
    </div>
  )
}

/** Shown when the platform's own Dataverse tables aren't connected to the app yet. */
export function SetupRequired() {
  const { missingTables, user } = useWorkspace()
  const commands = missingTables.map((t) => `pa app add data-source --connector dataverse --table ${t}`)
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
      <PageHeader
        title="Workspace setup required"
        description={`Signed in as ${user.displayName || user.upn}. The app is running in Power Apps mode but its Dataverse tables aren't connected yet.`}
      />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex items-center gap-2 font-semibold"><PlugZap className="size-5 text-primary" /> Finish setup</div>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Create the tables and seed data: <code>pnpm dataverse:provision</code> (see the app README).</li>
            <li>From <code>apps/workspace</code>, connect each table to the app:</li>
          </ol>
          <pre className="max-h-72 overflow-auto rounded bg-surface-muted p-3 text-xs">{commands.join('\n') || '(no tables missing)'}</pre>
          <ol start={3} className="list-decimal space-y-2 pl-5 text-sm">
            <li>Rebuild / restart <code>pnpm dev:powerapps</code> and reload.</li>
          </ol>
          <Alert tone="info">Developing offline? Run <code>pnpm dev</code> (mock data) instead.</Alert>
        </CardContent>
      </Card>
    </div>
  )
}
