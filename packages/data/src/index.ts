import type { DataMode, DataService } from './types.ts'
import type { MockDataOptions } from './mock.ts'
import type { PowerAppsDataOptions } from './powerapps.ts'

export type { CurrentUser, DataMode, DataService, WorkItem } from './types.ts'
export type { MockDataOptions } from './mock.ts'
export type { DataSourcesInfo, PowerAppsDataOptions, PowerAppsItemsSource } from './powerapps.ts'

export interface CreateDataServiceOptions {
  mock?: MockDataOptions
  powerApps?: PowerAppsDataOptions
}

/** Normalise an env value (e.g. `import.meta.env.VITE_DATA_MODE`) to a {@link DataMode}. */
export function parseDataMode(value: string | undefined): DataMode {
  return value?.trim().toLowerCase() === 'powerapps' ? 'powerapps' : 'mock'
}

/**
 * Create the data service for the given mode. Implementations are loaded
 * with dynamic imports so the mock build never pulls in the Power Apps
 * client library and vice versa.
 */
export async function createDataService(
  mode: DataMode,
  options: CreateDataServiceOptions = {},
): Promise<DataService> {
  if (mode === 'powerapps') {
    const { createPowerAppsDataService } = await import('./powerapps.ts')
    return createPowerAppsDataService(options.powerApps)
  }
  const { createMockDataService } = await import('./mock.ts')
  return createMockDataService(options.mock)
}
