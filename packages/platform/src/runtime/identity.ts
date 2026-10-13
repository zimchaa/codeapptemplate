export interface WorkspaceUser {
  /** User principal name, lower case. The key for role assignments. */
  upn: string
  displayName: string
  objectId?: string
  tenantId?: string
}

/** Fictional personas for offline development (contoso.example is a reserved domain). */
export const mockPersonas: readonly WorkspaceUser[] = [
  { upn: 'ada@contoso.example', displayName: 'Ada Admin' },
  { upn: 'max@contoso.example', displayName: 'Max Manager' },
  { upn: 'mia@contoso.example', displayName: 'Mia Member' },
  { upn: 'val@contoso.example', displayName: 'Val Viewer' },
]

const personaKey = 'ws-mock-persona'

export function currentMockPersona(): WorkspaceUser {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(personaKey) : null
  return mockPersonas.find((p) => p.upn === stored) ?? mockPersonas[0]
}

export function setMockPersona(upn: string): void {
  localStorage.setItem(personaKey, upn)
}

export interface HostContext {
  user: WorkspaceUser
  environmentId?: string
  appId?: string
  queryParams: Record<string, string>
}

/** Read identity and launch parameters from the Power Apps host. */
export async function getPowerAppsHostContext(): Promise<HostContext> {
  const { getContext } = await import('@microsoft/power-apps/app')
  const ctx = await getContext()
  const upn = (ctx.user.userPrincipalName ?? '').toLowerCase()
  return {
    user: {
      upn,
      displayName: ctx.user.fullName || upn || 'Unknown user',
      objectId: ctx.user.objectId,
      tenantId: ctx.user.tenantId,
    },
    environmentId: ctx.app.environmentId,
    appId: ctx.app.appId,
    queryParams: ctx.app.queryParams ?? {},
  }
}

/** Offline equivalent: persona + the page's own query string (e.g. ?route=/requests). */
export function getMockHostContext(): HostContext {
  const queryParams: Record<string, string> = {}
  if (typeof location !== 'undefined') {
    for (const [k, v] of new URLSearchParams(location.search)) queryParams[k] = v
  }
  return { user: currentMockPersona(), queryParams }
}
