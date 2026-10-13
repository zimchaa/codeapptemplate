import type { ComponentType, LazyExoticComponent } from 'react'
import type { RouteObject } from 'react-router'
import type { CapabilityDef } from '../access/capabilities.ts'
import type { AnyTableDef } from '../schema/types.ts'

export type IconComponent = ComponentType<{ className?: string }>

export interface NavItem {
  label: string
  /** Path relative to the module base path ('' = module home). */
  to: string
  icon?: IconComponent
  access?: string
}

export interface DashboardWidget {
  id: string
  title: string
  access?: string
  /** Grid width on large screens. */
  size?: 'sm' | 'md' | 'lg'
  component: LazyExoticComponent<ComponentType> | ComponentType
}

export interface CommandItem {
  id: string
  label: string
  /** Path relative to the module base path. */
  to: string
  keywords?: string[]
  access?: string
}

/**
 * The contract every workspace module implements. Modules are plain packages
 * (`modules/<id>`) that export one of these; the app lists them in its
 * registry. See docs/workspace/modules.md.
 */
export interface WorkspaceModule {
  /** Stable id, also the default route segment and capability prefix. */
  id: string
  title: string
  description: string
  icon: IconComponent
  /** Route segment under the app root, e.g. `requests` -> `#/requests`. */
  basePath: string
  /** Sidebar group. */
  group?: 'apps' | 'admin'
  /** Default sort order (admins can override). */
  order?: number
  /** Capability needed to see the module at all. */
  access?: string
  /** Capabilities this module checks; shown in the admin role editor. */
  capabilities: readonly CapabilityDef[]
  /** Dataverse tables the module owns (provisioned + mocked). */
  tables?: readonly AnyTableDef[]
  /** Child routes, relative to basePath. Use `lazy` / React.lazy for code splitting. */
  routes: RouteObject[]
  nav?: readonly NavItem[]
  widgets?: readonly DashboardWidget[]
  commands?: readonly CommandItem[]
  /**
   * Turn deep-link query parameters into a path inside this module, e.g.
   * `?page=request&id=42` -> `42`. Return undefined to fall back to the module home.
   */
  deepLink?: (params: Record<string, string>) => string | undefined
}

/** Identity helper for type-checking module definitions. */
export function defineModule(module: WorkspaceModule): WorkspaceModule {
  return module
}
