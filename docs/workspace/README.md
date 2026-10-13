# Workspace framework

A small framework for building one **single pane of glass** code app out of independent **modules**.
`apps/workspace` is the reference app; set-up steps are in [its README](../../apps/workspace/README.md).

| Guide | Covers |
|---|---|
| [Architecture](#architecture) (below) | Packages, runtime, how a request flows |
| [Modules](modules.md) | Writing a module, the module contract, connector-backed services |
| [Access control](access-control.md) | Capabilities, roles, the default role, Dataverse security roles |
| [Deep links](deep-links.md) | Routing inside Power Apps, link formats, email / Teams / flows |
| [Dataverse](dataverse.md) | Schema-as-code, provisioning, the data layer, troubleshooting |
| [UI and theming](ui-and-theming.md) | Tailwind 3 kit, theme tokens, `foundation-red`, swapping in an internal component library |

## Architecture

```
apps/workspace                    the code app: registry + config only
  src/modules.ts                  which modules this app includes
  src/workspace.schema.ts         which Dataverse tables it needs (for provisioning)
  src/services.ts                 connector-backed services (email, Teams, flows)
        │
        ▼
modules/<id>                      one package per sub-app
  src/index.ts                    defineModule({ routes, nav, widgets, commands, capabilities, tables, deepLink })
  src/schema.ts                   its Dataverse tables (React-free)
  src/pages/*, src/widgets/*      lazy-loaded UI
        │
        ▼
packages/platform                 the framework
  schema/      table definitions → Dataverse names (prefix), seed + sample rows
  data/        DataProvider: mock (localStorage) | Dataverse (@microsoft/power-apps getClient)
  access/      capability matching, role resolution, <Can>, <RequireCapability>
  router/      hash router composed from modules, deep-link resolve/build
  runtime/     bootstrap: identity → provider → settings/roles/modules → capabilities
  shell/       layout, sidebar, command palette, dashboard, status pages
packages/ui                       Tailwind 3 preset + theme tokens + components (the swap point)
```

**Startup** (`bootstrapWorkspace`):

1. **Identity:** `getContext()` in Power Apps; a persona offline.
2. **Data provider:** the mock or Dataverse provider. Dataverse data-source names are read from
   `power.config.json`.
3. **Load:** settings, all roles, the user's role assignments and module states.
4. **Access:** capabilities = union of the user's roles (+ the default role).
5. **Render:** the hash router. Modules that are disabled, or whose `access` capability the user
   lacks, are hidden from navigation and blocked at their route. The incoming deep link
   (`?route=` / `?page=&id=`) is applied once.

**Design rules:**

- **Modules talk to other code only through `@codeapps/platform` and `@codeapps/ui`.** They never
  import each other, and they never use `@microsoft/power-apps` directly. So any module runs offline
  and can be added to or removed from an app independently.
- **One table definition drives everything:** TypeScript types, mock data, Dataverse row mapping,
  OData queries and provisioning. Change a column in one place.
- **Admins configure at runtime; developers compose at build time.** Admins turn modules on/off and
  shape roles in the app. Developers choose which modules an app ships in `src/modules.ts`.
- **Client-side access control is UX, not security.** Dataverse security roles enforce data access.
  See [access control](access-control.md).
