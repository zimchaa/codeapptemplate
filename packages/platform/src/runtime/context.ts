import { createContext, useContext } from 'react'
import type { WorkspaceModule } from '../modules/types.ts'
import type { WorkspaceServices } from '../services/types.ts'
import type { WorkspaceRuntime } from './bootstrap.ts'

export interface AuditInput {
  action: string
  module: string
  entity?: string
  recordId?: string
  details?: unknown
}

export interface WorkspaceContextValue extends WorkspaceRuntime {
  /** Every registered module (the app's registry), in display order. */
  registeredModules: readonly WorkspaceModule[]
  /** Modules that are enabled AND accessible to the current user, in display order. */
  visibleModules: readonly WorkspaceModule[]
  can(capability: string | undefined): boolean
  isModuleEnabled(id: string): boolean
  setting(key: string): string | undefined
  /** Shareable URL that opens the app at `path`. */
  deepLink(path: string): string
  /** Best-effort audit trail entry (never throws). */
  audit(event: AuditInput): Promise<void>
  /** Connector-backed services; any of them may be undefined. */
  services: WorkspaceServices
  /** Reload settings, roles and module states (after admin changes). */
  refresh(): void
  /** Mock mode only: switch persona (reloads). */
  switchPersona?: (upn: string) => void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used inside <WorkspaceApp>')
  return value
}
