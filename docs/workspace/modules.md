# Writing a module

A module is a workspace package under `modules/<id>` that exports a `WorkspaceModule`. Generate one:

```powershell
pnpm new-module assets "Assets"
```

That creates the manifest, capabilities, a Dataverse table with sample rows, a list page, a deep-linkable
detail page and a dashboard widget. Then follow the printed steps:

1. **Add the dependency:** `"@codeapps/module-assets": "workspace:*"` in `apps/workspace/package.json`.
2. **Register it:** import it in `apps/workspace/src/modules.ts` and add it to `modules`.
3. **List its table:** import its table in `apps/workspace/src/workspace.schema.ts` and add it to
   `tables`. A unit test fails if the registry and the schema list disagree.
4. **Check:** `pnpm install && pnpm check`.
5. **Grant access:** in **Admin → Roles**, give roles the new capabilities. Until then only
   Administrators (`*`) see it.
6. **Dataverse:** run `pnpm dataverse:provision …` (adds only the new table), then
   `pa app add data-source --connector dataverse --table spg_asset`.

## The contract

```ts
export const assetsModule = defineModule({
  id: 'assets',                 // stable id; capability prefix by convention
  title: 'Assets',
  description: 'Shown on the home page and in the command palette.',
  icon: Boxes,                  // any lucide-react icon
  basePath: 'assets',           // #/assets/...
  group: 'apps',                // sidebar group: 'apps' | 'admin'
  order: 40,                    // default position (admins can override)
  access: 'assets.read',        // needed to see the module at all
  capabilities: [               // everything the module checks; listed in the role editor
    { id: 'assets.read', label: 'View assets' },
    { id: 'assets.manage', label: 'Manage assets' },
  ],
  tables: [assetTable],         // Dataverse tables it owns (mocked + provisioned)
  routes: [                     // react-router routes relative to basePath; lazy = own JS chunk
    { index: true, lazy: async () => ({ Component: (await import('./pages/List.tsx')).List }) },
    { path: ':id', lazy: async () => ({ Component: (await import('./pages/Detail.tsx')).Detail }) },
  ],
  nav: [{ label: 'New asset', to: 'new', access: 'assets.manage' }],   // also shown in the command palette
  widgets: [{ id: 'summary', title: 'Assets', size: 'sm', component: lazy(() => import('./widgets/Summary.tsx').then((m) => ({ default: m.SummaryWidget }))) }],
  commands: [{ id: 'new', label: 'Register an asset', to: 'new', access: 'assets.manage', keywords: ['add'] }],
  deepLink: (params) => params.id,                                     // ?page=asset&id=… → #/assets/<id>
})
```

Rules of thumb:

- **Keep `src/schema.ts` React-free**, with type-only imports from `@codeapps/platform/schema`. The
  provisioning script imports it with Node directly.
- **Use explicit `.ts`/`.tsx` extensions in relative imports**, as the rest of the repo does.
- **Put capability ids in `src/caps.ts`.** Importing them from `index.ts` inside pages creates an
  import cycle.
- **Gate with `<RequireCapability>`** (whole page) or `<Can>` / `can()` (buttons, sections).
- **Write to the audit log** for anything an admin may want to trace: `audit({ action, module, entity, recordId, details })`.

## Platform APIs available to modules

| API | Use |
|---|---|
| `useTable(def)` | Typed `list / get / create / update / remove` against mock or Dataverse |
| `useData(load, deps)` | Loading / error / reload state for any async call (deps must be primitives) |
| `useWorkspace()` | `user`, `can()`, `settings`, `deepLink(path)`, `audit()`, `services`, `refresh()`, `mode` |
| `useServices()` | Connector-backed services (may be undefined) |
| `<Can capability>` / `<RequireCapability capability>` | UI gating |
| `<ShareMenu path title>` | Copy link / email / Teams for any in-app path |
| `<DataError error onRetry>` | Consistent errors, including "table not connected" with the fix |
| `teamsChatLink`, `teamsShareLink`, `emailLink` | Build links for buttons |
| `@codeapps/ui` | Every visual component; never style with raw colours |

### Queries

`list({ where, search, orderBy, top })`:

- `where` is AND-ed equality per field.
- `search` is "contains" on the table's primary field.

Both translate to OData for Dataverse and run in memory for the mock provider. For anything more
complex, list with a coarse filter and refine in code, or add a capability to `Query` in
`packages/platform/src/data` with tests.

## Connector-backed services

Some functionality needs connectors rather than tables: email, Teams posts, Office 365 users, Power
Automate flows. The platform exposes these as **services** that modules call without knowing the
connector:

```ts
const { notifications } = useServices()
await notifications?.notify({ toUpns: [upn], subject, body, link: deepLink(`/assets/${id}`) })
```

- **Offline:** the mock implementation shows a toast.
- **In Power Apps:** the app wires real implementations in `apps/workspace/src/services.ts`, on top
  of code generated by `pa app add data-source --connector shared_office365 …` (or
  `shared_teams`, or `pa app add flow --flow-id …`).

To add a new kind of service, extend `WorkspaceServices` in
`packages/platform/src/services/types.ts`, give it a mock in `WorkspaceApp.tsx`, and document it here.
