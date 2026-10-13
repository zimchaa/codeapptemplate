import { Outlet } from 'react-router'
import { useWorkspace } from '../runtime/context.ts'
import { ModuleDisabled, NotFound, Forbidden } from './StatusPages.tsx'

/** Wraps every module's routes: enabled? accessible? */
export function ModuleGate({ moduleId }: { moduleId: string }) {
  const { registeredModules, isModuleEnabled, can } = useWorkspace()
  const module = registeredModules.find((m) => m.id === moduleId)
  if (!module) return <NotFound />
  if (!isModuleEnabled(module.id)) return <ModuleDisabled title={module.title} />
  if (!can(module.access)) return <Forbidden capability={module.access} />
  return <Outlet />
}
