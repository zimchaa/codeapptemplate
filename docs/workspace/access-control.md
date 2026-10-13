# Access control

Two layers. **Both are needed.**

| Layer | Controls | Where |
|---|---|---|
| **Workspace roles → capabilities** | What the app *shows*: modules, pages, buttons, widgets, launcher links | `spg_approle`, `spg_roleassignment`, Admin → Users & roles / Roles |
| **Dataverse security roles** | What data a user can *read and write* through the API | Power Platform admin center / solution |

The app's checks run in the browser, so a determined user can bypass them. Dataverse security is
what protects data.

## Capabilities

A capability is a dotted string, by convention `<module>.<action>`: `requests.read`,
`requests.manage`, `admin.roles.manage`.

A role holds **patterns**, one per line:

| Pattern | Grants |
|---|---|
| `*` | everything |
| `requests.*` | every capability starting with `requests.` |
| `requests.read` | exactly that |

Lines starting with `#` (and anything after `#`) are comments. Modules declare the capabilities they
check (`capabilities: [...]`), so the role editor lists them automatically.

## Roles and assignment

- **Seeded roles:**
  - `admin` (`*`);
  - `manager` (`requests.*`, `announcements.*`, `links.*`);
  - `member` (read and raise requests, read news and links);
  - `viewer` (read-only).

  Seeded roles are marked *System*: they can be edited but not deleted.
- **Assignments map a user principal name** (lower case, as returned by
  `getContext().user.userPrincipalName`) to a role. Manage them in **Admin → Users & roles**, or
  directly in the `spg_roleassignment` table, e.g. from a flow that syncs an Entra group.
- **Default role:** setting `access.defaultRole` (seed: `member`) is granted to every signed-in user
  in addition to their assignments. Set it empty to make access opt-in.
- **Effective capabilities** are the union over all the user's roles, computed at startup. After
  admin changes, the app refreshes them for the current user. Other users pick them up on their next
  load.

### Checking in code

```tsx
const { can } = useWorkspace()
{can('requests.manage') && <AssignButton />}

<Can capability="announcements.manage"><Button>New</Button></Can>

<RequireCapability capability="admin.roles.manage"><RolesPage /></RequireCapability>
```

Module-level `access` is enforced by the router (`ModuleGate`). Per-record rules, like "requesters
can see their own requests", live in the module.

### Trying it offline

Use the avatar menu to switch personas:
- **Ada:** Administrator;
- **Max:** Manager;
- **Mia:** no assignment, so the default Member role;
- **Val:** Viewer.

## Dataverse security roles

Code apps call Dataverse **as the signed-in user**, so users need table privileges. Create a security
role in the `WorkspaceApp` solution, e.g. **Workspace User**, and a **Workspace Admin** role:

| Table | Workspace User | Workspace Admin |
|---|---|---|
| `spg_workspacemodule`, `spg_approle`, `spg_appsetting` | Read (Organization) | Create, Read, Write, Delete (Organization) |
| `spg_roleassignment` | Read (Organization)¹ | Create, Read, Write, Delete (Organization) |
| `spg_auditevent` | Create (User) | Create, Read (Organization) |
| `spg_request` | Create, Read, Write (User)² | all (Organization) |
| `spg_requestcomment` | Create, Read (User)² | all (Organization) |
| `spg_announcement`, `spg_quicklink` | Read (Organization) | all (Organization) |

1. The app reads only the current user's assignments, but Dataverse can't filter by UPN without
   custom logic. Organization read is the simplest option; it reveals who holds which workspace role.
2. **User scope** means users see only rows they own. Managers who handle everyone's requests need
   Organization (or Business Unit) read/write on `spg_request` and `spg_requestcomment`. Give that
   through a third role (e.g. **Workspace Manager**) that matches the app's `manager` role.

Assign the security roles to **Microsoft Entra group teams**, so membership is managed in Entra.
Keep the workspace role assignments in step: for example, give the `manager` workspace role to the
same people as Workspace Manager.
