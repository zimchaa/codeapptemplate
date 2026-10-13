// Public API of @codeapps/platform (React). Schema-only consumers (Node
// scripts, module schema files) import '@codeapps/platform/schema' instead.

export * from './schema/index.ts'

export type { DataProvider, Query, TableClient } from './data/types.ts'
export { TableNotConnectedError } from './data/types.ts'
export { createMockProvider } from './data/mock.ts'
export type { MockProviderOptions } from './data/mock.ts'
export { createDataverseProvider, resolveDataSourceNames } from './data/dataverse.ts'
export type { DataverseClient, DataverseProviderOptions, PowerConfigLike } from './data/dataverse.ts'

export { capabilityMatches, hasCapability, parseCapabilities } from './access/capabilities.ts'
export type { CapabilityDef } from './access/capabilities.ts'
export { resolveAccess } from './access/resolve.ts'
export { Can, RequireCapability } from './access/components.tsx'

export { defineModule } from './modules/types.ts'
export type { CommandItem, DashboardWidget, IconComponent, NavItem, WorkspaceModule } from './modules/types.ts'

export { buildDeepLink, emailLink, resolveDeepLink, teamsChatLink, teamsShareLink } from './router/deepLinks.ts'
export type { DeepLinkContext } from './router/deepLinks.ts'

export { allTables, bootstrapWorkspace } from './runtime/bootstrap.ts'
export type { DataMode, WorkspaceConfig, WorkspaceRuntime } from './runtime/bootstrap.ts'
export { useWorkspace } from './runtime/context.ts'
export type { AuditInput, WorkspaceContextValue } from './runtime/context.ts'
export { mockPersonas } from './runtime/identity.ts'
export type { WorkspaceUser } from './runtime/identity.ts'

export { useAccess, useData, useTable } from './hooks/index.ts'
export type { DataState } from './hooks/index.ts'

export { WorkspaceApp } from './shell/WorkspaceApp.tsx'
export type { WorkspaceAppProps } from './shell/WorkspaceApp.tsx'
export { ShareMenu } from './shell/ShareMenu.tsx'
export type { ShareMenuProps } from './shell/ShareMenu.tsx'
export { DataError, Forbidden, NotFound } from './shell/StatusPages.tsx'
