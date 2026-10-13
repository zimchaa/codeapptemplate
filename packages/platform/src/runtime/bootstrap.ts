import { resolveAccess } from '../access/resolve.ts'
import { createDataverseProvider, resolveDataSourceNames, type DataverseClient, type PowerConfigLike } from '../data/dataverse.ts'
import { createMockProvider } from '../data/mock.ts'
import type { DataProvider } from '../data/types.ts'
import type { WorkspaceModule } from '../modules/types.ts'
import { createNaming, DEFAULT_PREFIX, type Naming } from '../schema/naming.ts'
import {
  moduleStateTable,
  platformTables,
  roleAssignmentTable,
  roleTable,
  settingKeys,
  settingTable,
  type ModuleStateRecord,
  type RoleRecord,
} from '../schema/platform-tables.ts'
import type { AnyTableDef } from '../schema/types.ts'
import { getMockHostContext, getPowerAppsHostContext, type HostContext, type WorkspaceUser } from './identity.ts'

export type DataMode = 'mock' | 'powerapps'

export interface WorkspaceConfig {
  /** Every module compiled into the app (the registry). */
  modules: readonly WorkspaceModule[]
  dataMode: DataMode
  /** Dataverse publisher prefix (default `spg`). */
  prefix?: string
  /** Contents of power.config.json (powerapps mode). */
  powerConfig?: PowerConfigLike
  /** Generated `.power/schemas/appschemas/dataSourcesInfo` (powerapps mode). */
  dataSourcesInfo?: unknown
  /** localStorage key for mock data. */
  mockStorageKey?: string
}

export interface WorkspaceRuntime {
  mode: DataMode
  host: HostContext
  user: WorkspaceUser
  provider: DataProvider
  naming: Naming
  tables: readonly AnyTableDef[]
  settings: ReadonlyMap<string, string>
  roles: RoleRecord[]
  capabilities: string[]
  moduleStates: ReadonlyMap<string, ModuleStateRecord>
  /** Dataverse tables not yet added with `pa app add data-source` (logical names). */
  missingTables: string[]
  /** True when the platform's own tables are missing: show the setup page. */
  setupRequired: boolean
  resetMockData?: () => void
}

export function allTables(modules: readonly WorkspaceModule[]): AnyTableDef[] {
  const tables = new Map<string, AnyTableDef>()
  for (const t of [...platformTables, ...modules.flatMap((m) => m.tables ?? [])]) tables.set(t.name, t)
  return [...tables.values()]
}

async function createProvider(config: WorkspaceConfig, naming: Naming, tables: AnyTableDef[], getPrefix: () => number) {
  if (config.dataMode === 'mock') {
    const provider = createMockProvider({ tables, storageKey: config.mockStorageKey ?? 'ws-mock-data' })
    return { provider: provider as DataProvider, missing: [] as string[], reset: provider.reset }
  }
  if (!config.dataSourcesInfo) {
    return { provider: null, missing: tables.map((t) => naming.table(t)), reset: undefined }
  }
  const { getClient } = await import('@microsoft/power-apps/data')
  const client = getClient(config.dataSourcesInfo as Parameters<typeof getClient>[0]) as unknown as DataverseClient
  const provider = createDataverseProvider({
    client,
    naming,
    dataSourceNames: resolveDataSourceNames(config.powerConfig),
    optionValuePrefix: getPrefix,
  })
  return { provider: provider as DataProvider, missing: provider.missingTables(tables), reset: undefined }
}

/** Everything that must happen before the first render. */
export async function bootstrapWorkspace(config: WorkspaceConfig): Promise<WorkspaceRuntime> {
  const naming = createNaming(config.prefix || DEFAULT_PREFIX)
  const tables = allTables(config.modules)
  const host = config.dataMode === 'mock' ? getMockHostContext() : await getPowerAppsHostContext()

  let settings = new Map<string, string>()
  const optionPrefix = () => Number(settings.get(settingKeys.choicePrefix) ?? 10000) || 10000
  const { provider, missing, reset } = await createProvider(config, naming, tables, optionPrefix)

  const core = platformTables.map((t) => naming.table(t))
  const setupRequired = !provider || core.some((t) => missing.includes(t))
  const base = { mode: config.dataMode, host, user: host.user, naming, tables, missingTables: missing, resetMockData: reset }

  if (setupRequired || !provider) {
    return {
      ...base,
      provider: provider ?? createMockProvider({ tables: [] }),
      settings,
      roles: [],
      capabilities: [],
      moduleStates: new Map(),
      setupRequired: true,
    }
  }

  const [settingRows, roles, assignments, states] = await Promise.all([
    provider.table(settingTable).list(),
    provider.table(roleTable).list({ orderBy: { field: 'name' } }),
    provider.table(roleAssignmentTable).list({ where: { userUpn: host.user.upn } }),
    provider.table(moduleStateTable).list(),
  ])
  settings = new Map(settingRows.map((s) => [s.key, s.value]))
  const access = resolveAccess(host.user.upn, roles, assignments, settings.get(settingKeys.defaultRole) || undefined)

  return {
    ...base,
    provider,
    settings,
    roles: access.roles,
    capabilities: access.capabilities,
    moduleStates: new Map(states.map((s) => [s.key, s])),
    setupRequired: false,
  }
}
