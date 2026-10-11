import { getContext } from '@microsoft/power-apps/app'
import { getClient } from '@microsoft/power-apps/data'
import type { DataService, WorkItem } from './types.ts'

/**
 * Shape of the `dataSourcesInfo` object that `pa app add data-source`
 * generates under `.power/schemas/appschemas/dataSourcesInfo.ts`.
 */
export type DataSourcesInfo = Parameters<typeof getClient>[0]

export interface PowerAppsItemsSource {
  /** Generated `dataSourcesInfo` from the app's `.power` folder. */
  dataSourcesInfo: DataSourcesInfo
  /** Data source name as it appears in `dataSourcesInfo` (e.g. `accounts`). */
  tableName: string
  /** Map a raw record to the UI's {@link WorkItem} shape. */
  toWorkItem: (record: Record<string, unknown>) => WorkItem
  /** Optional query options (select / filter / top ...). */
  query?: Parameters<ReturnType<typeof getClient>['retrieveMultipleRecordsAsync']>[1]
}

export interface PowerAppsDataOptions {
  /**
   * Where `listItems()` reads from. Leave undefined until you have added a
   * data source with `pa app add data-source`; `listItems()` then returns [].
   */
  items?: PowerAppsItemsSource
}

/**
 * Implementation backed by the code apps client library. Only works when the
 * app is hosted by Power Apps (Local Play URL or a published app).
 */
export function createPowerAppsDataService(options: PowerAppsDataOptions = {}): DataService {
  return {
    mode: 'powerapps',

    async getCurrentUser() {
      const { user } = await getContext()
      return {
        displayName: user.fullName ?? user.userPrincipalName ?? 'Unknown user',
        email: user.userPrincipalName,
      }
    },

    async listItems() {
      const source = options.items
      if (!source) return []

      const client = getClient(source.dataSourcesInfo)
      const result = await client.retrieveMultipleRecordsAsync<Record<string, unknown>>(
        source.tableName,
        source.query,
      )
      if (!result.success) {
        throw result.error ?? new Error(`Failed to read ${source.tableName}`)
      }
      return result.data.map(source.toWorkItem)
    },
  }
}
