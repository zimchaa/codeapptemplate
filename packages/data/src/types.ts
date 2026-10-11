/** Which implementation backs the {@link DataService}. */
export type DataMode = 'mock' | 'powerapps'

export interface CurrentUser {
  displayName: string
  email?: string
}

export interface WorkItem {
  id: string
  title: string
  status: 'open' | 'done'
}

/**
 * Everything the UI is allowed to know about data access. Components depend
 * on this interface only, never on `@microsoft/power-apps` directly, so the
 * whole app runs offline against the mock implementation.
 */
export interface DataService {
  readonly mode: DataMode
  getCurrentUser(): Promise<CurrentUser>
  listItems(): Promise<WorkItem[]>
}
