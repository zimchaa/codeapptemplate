# Workspace: single pane of glass

One Power Apps code app that hosts many **modules** (sub-apps) behind a shared shell:

- **Navigation:** sidebar and command palette (Ctrl/⌘ + K).
- **Access control:** role-based, driven by capabilities.
- **Admin area:** one place to manage roles, modules, settings and the audit log.
- **Deep links:** shareable from email and Teams.
- **Data:** a Dataverse back end.

It runs **fully offline** on mock data until you connect it.

| Module | Route | What it does |
|---|---|---|
| Requests | `#/requests` | Raise, assign, track and discuss requests. Notifications. Share links by email or Teams. |
| News | `#/news` | Announcements: pinned, scheduled, expiring. |
| App launcher | `#/apps` | Role-aware links to other apps and tools. |
| Admin | `#/admin` | Users & roles, the role/capability editor, modules on/off, settings, audit log, deep-link builder, data status. |

How it's built: [docs/workspace](../../docs/workspace/README.md).

---

## 1. Run it offline (no environment needed)

From the repo root:

```powershell
pnpm install
pnpm --filter @codeapps/workspace dev      # http://localhost:5173
```

You're signed in as a fictional persona. Switch between **Ada Admin**, **Max Manager**, **Mia Member** and
**Val Viewer** from the avatar menu to see role-based access in action. **Reset sample data** is in the
same menu. Offline data lives in your browser's localStorage.

---

## 2. Initialise it in Power Platform, with data

You need:
- a Power Platform environment **with Dataverse**, with code apps enabled;
- rights to create tables in it (System Customizer or System Administrator);
- the environment URL (`https://<org>.crm<n>.dynamics.com`) and the environment ID (both in Power
  Platform admin center → Environments → your environment).

### Step 1: create the tables and seed data

Preview first. This needs no sign-in and makes no changes:

```powershell
pnpm dataverse:plan
```

Then provision:

```powershell
pnpm dataverse:provision --url https://<org>.crm.dynamics.com --admin you@company.com
```

- **Sign-in:** the script prints a device-code sign-in message. Open the URL on any device and enter
  the code.
- **Solution and publisher:** it creates (or reuses) the publisher with prefix **`spg`** and a
  solution **`WorkspaceApp`**. All tables, columns, choices and lookups go into that solution.
- **Seeding:** it publishes, verifies, then seeds the four roles (Administrator, Manager, Member,
  Viewer) and the app settings. It also makes `--admin` an Administrator.
- **Safe to re-run:** it only adds what's missing and never overwrites rows an admin has edited.

| Option | Use |
|---|---|
| `--with-samples` | Also create demo requests, news and launcher links. |
| `--prefix <p>` | Use your own publisher prefix instead of `spg`. Then also set `VITE_DATAVERSE_PREFIX=<p>` in `apps/workspace/.env.local`. |
| `--solution <name>` | Put the components in an existing solution. Its publisher's prefix must match `--prefix`. |

**If device-code sign-in is blocked** (Conditional Access), use one of these:

- **GitHub Actions:** run the **Provision Dataverse** workflow (Actions tab) with a service principal.
  See [`.github/workflows/dataverse-provision.yml`](../../.github/workflows/dataverse-provision.yml).
- **Service principal locally:** set `DATAVERSE_CLIENT_ID`, `DATAVERSE_CLIENT_SECRET` and
  `DATAVERSE_TENANT_ID`, then run the same command.
- **A token you already have:** set `DATAVERSE_TOKEN` to an access token for the environment URL.

The tables it creates:

| Table | Purpose |
|---|---|
| `spg_workspacemodule` | Module on/off and order (rows only for modules an admin changed) |
| `spg_approle` | Roles and the capabilities they grant |
| `spg_roleassignment` | User (UPN) ↔ role |
| `spg_appsetting` | App settings (title, default role, published URL, …) |
| `spg_auditevent` | Audit trail written by modules |
| `spg_request`, `spg_requestcomment` | Requests module |
| `spg_announcement` | News module |
| `spg_quicklink` | App launcher module |

### Step 2: connect the code app to the environment and tables

This needs the Power Apps CLI (`npm install --global @microsoft/power-apps-cli`). It has native
dependencies, so on a locked-down laptop see [Deploying in the root README](../../README.md#deploying).

```powershell
cd apps/workspace
pa app init --display-name "Workspace" --environment-id <environment-id>
pa app add data-source --connector dataverse --table spg_workspacemodule
pa app add data-source --connector dataverse --table spg_approle
pa app add data-source --connector dataverse --table spg_roleassignment
pa app add data-source --connector dataverse --table spg_appsetting
pa app add data-source --connector dataverse --table spg_auditevent
pa app add data-source --connector dataverse --table spg_request
pa app add data-source --connector dataverse --table spg_requestcomment
pa app add data-source --connector dataverse --table spg_announcement
pa app add data-source --connector dataverse --table spg_quicklink
```

The provisioning script prints exactly these lines for your prefix, and so does **Admin → Data &
setup** in the app.

These commands write `power.config.json` and `.power/schemas/…`. **Commit both.** They contain no
secrets, and teammates then don't need the CLI for Local Play. The app reads them automatically
through `import.meta.glob`; you don't need to edit any code.

### Step 3: run against Dataverse (Local Play)

```powershell
pnpm --filter @codeapps/workspace dev:powerapps
```

Open the **Local Play** URL it prints in the browser profile signed in to your tenant, and allow
local network access if asked. You should see the shell signed in as you, with the Administrator
role. If a table is missing, the app shows a setup page listing the exact `pa` commands still needed.

### Step 4: publish

```powershell
pnpm --filter @codeapps/workspace build
cd apps/workspace
pa app push --solution-id <WorkspaceApp solution id>
```

Or use the **Deploy code app** workflow with `app = workspace`.

After the first push:

1. **Turn on full deep links.** Copy the app's web link (Power Apps → Apps → Workspace → Details) into
   **Admin → Settings → `app.playUrl`**. Shared links then open the published app:
   `…/play/e/<env>/app/<appId>?route=/requests/<id>`.
2. **Share the app** with users (`pa app share --principal <email>` or in Power Apps).
3. **Give users Dataverse access.** Code apps run with the user's own Dataverse privileges. Create a
   security role that grants the `spg_*` tables (see
   [access control](../../docs/workspace/access-control.md#dataverse-security-roles)) and assign it,
   e.g. to a Microsoft Entra group team.
4. **Assign workspace roles** in **Admin → Users & roles**. Everyone else gets the default role
   (`Member`, setting `access.defaultRole`).

### Optional: email notifications

Requests call `notifications.notify()` on assignment and status changes. Offline these show as
toasts. To send real email, wire a connector in [`src/services.ts`](src/services.ts); the file
contains a commented Office 365 Outlook example.

---

## Configuration

| Where | Setting | Default |
|---|---|---|
| `.env` / `.env.local` | `VITE_DATA_MODE` = `mock` \| `powerapps` | `mock` (dev), `powerapps` (build, `dev:powerapps`) |
| `.env` / `.env.local` | `VITE_DATAVERSE_PREFIX` | `spg` |
| Admin → Settings | `app.title`, `access.defaultRole`, `app.playUrl`, `app.playBaseUrl`, `app.supportEmail` | see seed |
| `src/modules.ts` | which modules this app includes | all four |
| `src/main.tsx` | default theme (`foundation-red` / `neutral`) | `foundation-red` |

## Adding functionality

```powershell
pnpm new-module assets "Assets"
```

Then follow the printed steps: register the module in `src/modules.ts`, add its table to
`src/workspace.schema.ts`, re-run `pnpm dataverse:provision`, and run `pa app add data-source`. See
[docs/workspace/modules.md](../../docs/workspace/modules.md).
