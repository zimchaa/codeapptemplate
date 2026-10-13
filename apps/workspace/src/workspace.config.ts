import type { PowerConfigLike, WorkspaceConfig } from '@codeapps/platform'
import { modules } from './modules.ts'

// Both files are created by the Power Apps CLI (`pa app init`,
// `pa app add data-source`) and are environment-specific. Globs resolve to
// nothing when they don't exist yet, so the app still builds and runs offline.
const powerConfigs = import.meta.glob<PowerConfigLike>('../power.config.json', { eager: true, import: 'default' })
const dataSourceInfos = import.meta.glob<unknown>('../.power/schemas/appschemas/dataSourcesInfo.ts', {
  eager: true,
  import: 'dataSourcesInfo',
})

export const workspaceConfig: WorkspaceConfig = {
  modules,
  dataMode: import.meta.env.VITE_DATA_MODE?.trim().toLowerCase() === 'powerapps' ? 'powerapps' : 'mock',
  prefix: import.meta.env.VITE_DATAVERSE_PREFIX?.trim() || 'spg',
  powerConfig: Object.values(powerConfigs)[0],
  dataSourcesInfo: Object.values(dataSourceInfos)[0],
  mockStorageKey: 'ws-mock-data:workspace',
}
