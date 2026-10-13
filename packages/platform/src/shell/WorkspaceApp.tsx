import { Alert, ThemeProvider, ToastProvider, TooltipProvider, type ThemeName } from '@codeapps/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RouterProvider } from 'react-router'
import { hasCapability } from '../access/capabilities.ts'
import { createWorkspaceRouter } from '../router/createRouter.tsx'
import { buildDeepLink, resolveDeepLink } from '../router/deepLinks.ts'
import { bootstrapWorkspace, type WorkspaceConfig, type WorkspaceRuntime } from '../runtime/bootstrap.ts'
import { WorkspaceContext, type AuditInput, type WorkspaceContextValue } from '../runtime/context.ts'
import { setMockPersona } from '../runtime/identity.ts'
import { auditEventTable, settingKeys } from '../schema/platform-tables.ts'
import { SetupRequired, Splash } from './StatusPages.tsx'

export interface WorkspaceAppProps {
  config: WorkspaceConfig
  defaultTheme?: ThemeName
}

/** The whole workspace: providers, bootstrap, router. Render this from main.tsx. */
export function WorkspaceApp({ config, defaultTheme }: WorkspaceAppProps) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      <TooltipProvider>
        <ToastProvider>
          <WorkspaceRoot config={config} />
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

function sortModules(config: WorkspaceConfig, runtime: WorkspaceRuntime) {
  const order = (id: string, fallback = 100) => runtime.moduleStates.get(id)?.sortOrder ?? fallback
  return [...config.modules].sort((a, b) => order(a.id, a.order) - order(b.id, b.order) || a.title.localeCompare(b.title))
}

function WorkspaceRoot({ config }: { config: WorkspaceConfig }) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ runtime?: WorkspaceRuntime; error?: unknown }>({})
  const router = useMemo(() => createWorkspaceRouter(config.modules), [config.modules])
  const deepLinkApplied = useRef(false)

  useEffect(() => {
    let cancelled = false
    bootstrapWorkspace(config).then(
      (runtime) => !cancelled && setState({ runtime }),
      (error: unknown) => !cancelled && setState((prev) => ({ ...prev, error })),
    )
    return () => {
      cancelled = true
    }
  }, [config, version])

  const runtime = state.runtime

  // Apply ?route=/... (or ?page=&id=) once, on first load only.
  useEffect(() => {
    if (!runtime || runtime.setupRequired || deepLinkApplied.current) return
    deepLinkApplied.current = true
    const target = resolveDeepLink(runtime.host.queryParams, config.modules)
    if (target && router.state.location.pathname === '/') void router.navigate(target, { replace: true })
  }, [runtime, router, config.modules])

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const value = useMemo<WorkspaceContextValue | null>(() => {
    if (!runtime) return null
    const can = (capability: string | undefined) => hasCapability(runtime.capabilities, capability)
    const isModuleEnabled = (id: string) => runtime.moduleStates.get(id)?.enabled ?? true
    const setting = (key: string) => runtime.settings.get(key) || undefined
    const registeredModules = sortModules(config, runtime)
    return {
      ...runtime,
      registeredModules,
      visibleModules: registeredModules.filter((m) => isModuleEnabled(m.id) && can(m.access)),
      can,
      isModuleEnabled,
      setting,
      deepLink: (path: string) =>
        buildDeepLink(path, {
          playUrl: setting(settingKeys.playUrl),
          playBaseUrl: setting(settingKeys.playBaseUrl),
          environmentId: runtime.host.environmentId,
          appId: runtime.host.appId,
          localUrl: typeof location !== 'undefined' ? location.href : '',
        }),
      async audit(event: AuditInput) {
        try {
          await runtime.provider.table(auditEventTable).create({
            action: event.action,
            module: event.module,
            entity: event.entity,
            recordId: event.recordId,
            actorUpn: runtime.user.upn,
            details: event.details === undefined ? undefined : JSON.stringify(event.details),
          })
        } catch (error) {
          console.warn('[workspace] audit write failed', error)
        }
      },
      refresh,
      switchPersona:
        runtime.mode === 'mock'
          ? (upn: string) => {
              setMockPersona(upn)
              refresh()
            }
          : undefined,
      resetMockData: runtime.resetMockData
        ? () => {
            runtime.resetMockData?.()
            refresh()
          }
        : undefined,
    }
  }, [runtime, config, refresh])

  if (state.error && !runtime) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Alert tone="danger" title="The workspace could not start">
          <p className="break-words">{state.error instanceof Error ? state.error.message : String(state.error)}</p>
          <p className="mt-2">
            In Power Apps mode, open the app through its Local Play or published URL. For offline development run <code>pnpm dev</code>.
          </p>
        </Alert>
      </div>
    )
  }
  if (!value) return <Splash />

  return (
    <WorkspaceContext.Provider value={value}>
      {value.setupRequired ? <SetupRequired /> : <RouterProvider router={router} />}
    </WorkspaceContext.Provider>
  )
}
