// ---------------------------------------------------------------------------
// The module registry. To add a module:
//   1. pnpm new-module <id>              (creates modules/<id>)
//   2. add "@codeapps/module-<id>": "workspace:*" to this app's package.json
//   3. import it here and add it to `modules`
//   4. if it has Dataverse tables, add them to src/workspace.schema.ts
// See docs/workspace/modules.md.
// ---------------------------------------------------------------------------
import { adminModule } from '@codeapps/module-admin'
import { announcementsModule } from '@codeapps/module-announcements'
import { linksModule } from '@codeapps/module-links'
import { requestsModule } from '@codeapps/module-requests'
import type { WorkspaceModule } from '@codeapps/platform'

export const modules: readonly WorkspaceModule[] = [requestsModule, announcementsModule, linksModule, adminModule]
