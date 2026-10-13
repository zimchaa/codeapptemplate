// React-free list of every Dataverse table this app uses. Read by
// `pnpm dataverse:provision` (Node imports this file directly) and checked
// against the module registry by src/workspace.test.ts.
import { requestTables } from '@codeapps/module-requests/schema'
import { announcementTable } from '@codeapps/module-announcements/schema'
import { quickLinkTable } from '@codeapps/module-links/schema'
import { platformTables, type AnyTableDef } from '@codeapps/platform/schema'

export const tables: readonly AnyTableDef[] = [...platformTables, ...requestTables, announcementTable, quickLinkTable]
