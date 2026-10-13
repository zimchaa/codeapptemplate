// ---------------------------------------------------------------------------
// Connector-backed services used by modules (see WorkspaceServices in
// @codeapps/platform). Offline (mock mode) notifications appear as toasts;
// in Power Apps mode nothing is sent until you wire a connector here.
//
// Example: email notifications through the Office 365 Outlook connector.
//   1. cd apps/workspace
//      pa connection create --connector shared_office365        (or reuse one)
//      pa app add data-source --connector shared_office365 --connection-id <id>
//   2. Uncomment and adjust to the generated service's exact method/types
//      (open src/generated/services/Office365OutlookService.ts):
//
// import { Office365OutlookService } from './generated/services/Office365OutlookService'
//
// export const services: WorkspaceServices = {
//   notifications: {
//     async notify({ toUpns, subject, body, link }) {
//       await Office365OutlookService.SendEmailV2({
//         To: toUpns.join(';'),
//         Subject: subject,
//         Body: `<p>${body}</p>${link ? `<p><a href="${link}">Open in the workspace</a></p>` : ''}`,
//       })
//     },
//   },
// }
//
// The same pattern works for a Teams post (shared_teams connector) or a
// Power Automate flow (pa app add flow --flow-id <id>) that fans out
// notifications. See docs/workspace/modules.md#connector-backed-services.
// ---------------------------------------------------------------------------
import type { WorkspaceServices } from '@codeapps/platform'

export const services: WorkspaceServices = {}
