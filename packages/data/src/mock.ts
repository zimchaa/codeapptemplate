import type { CurrentUser, DataService, WorkItem } from './types.ts'

export interface MockDataOptions {
  user?: CurrentUser
  items?: WorkItem[]
  /** Artificial latency so loading states are visible during local dev. */
  latencyMs?: number
}

const defaultItems: WorkItem[] = [
  { id: '1', title: 'Install with pnpm (no native binaries)', status: 'done' },
  { id: '2', title: 'Run the app offline against mock data', status: 'done' },
  { id: '3', title: 'Run `pa app init` and switch to Power Apps data', status: 'open' },
]

export function createMockDataService(options: MockDataOptions = {}): DataService {
  const {
    user = { displayName: 'Local Developer', email: 'dev@localhost' },
    items = defaultItems,
    latencyMs = 150,
  } = options

  const delay = <T>(value: T) =>
    new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), latencyMs))

  return {
    mode: 'mock',
    getCurrentUser: () => delay(user),
    listItems: () => delay(items),
  }
}
