import type { ReactNode } from 'react'
import { useWorkspace } from '../runtime/context.ts'
import { Forbidden } from '../shell/StatusPages.tsx'

/** Render children only if the user has the capability (else `fallback`). */
export function Can({ capability, children, fallback = null }: { capability: string | undefined; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useWorkspace()
  return <>{can(capability) ? children : fallback}</>
}

/** Page-level guard: shows the access-denied page instead of the children. */
export function RequireCapability({ capability, children }: { capability: string | undefined; children: ReactNode }) {
  const { can } = useWorkspace()
  return can(capability) ? <>{children}</> : <Forbidden capability={capability} />
}
