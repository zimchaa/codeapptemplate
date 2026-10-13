# Power Apps code apps template: zero native binaries

[![CI](https://github.com/zimchaa/codeapptemplate/actions/workflows/ci.yml/badge.svg)](https://github.com/zimchaa/codeapptemplate/actions/workflows/ci.yml)

Starter monorepo for [Power Apps code apps](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/)
on **locked-down Windows laptops**, where Node and npm/pnpm work but native
executables and binaries downloaded by packages (`esbuild.exe`, `*.node`
bindings, …) are blocked.

It is based on the official
[`microsoft/PowerAppsCodeApps` `templates/vite`](https://github.com/microsoft/PowerAppsCodeApps/tree/main/templates/vite)
(Vite 7 + React + TypeScript + `@microsoft/power-apps`), so the Microsoft
docs still apply. The difference: **install, dev and build run entirely on
JavaScript and WebAssembly.** Details and deviations:
[`docs/official-starter-alignment.md`](docs/official-starter-alignment.md).

```
apps/
  app-template/            minimal code app (copy it with `pnpm new-app`)
  workspace/               ★ single pane of glass: modules, RBAC, deep links, Dataverse
packages/
  platform/                @codeapps/platform: workspace framework (modules, access, router, data, shell)
  ui/                      @codeapps/ui: Tailwind 3 kit + themes (foundation-red, neutral)
  components/              @codeapps/components: shared React components (app-template)
  data/                    @codeapps/data: DataService + mock + Power Apps impl (app-template)
  company-ui-placeholder/  ⚠️ PLACEHOLDER for the internal company library
modules/                   workspace modules: admin, requests, announcements, links (`pnpm new-module`)
scripts/                   verify-no-native, smoke-dev, new-app, new-module, dataverse/ (plain Node)
docs/                      alignment notes, company library guide, webpack fallback, workspace/
```

> **Building a multi-function app?** Start with [`apps/workspace`](apps/workspace/README.md), a
> single-pane-of-glass shell where functionality is added as modules. It has role-based access, an
> admin area, deep links for email and Teams, and a Dataverse back end with a provisioning script.
> Framework docs: [`docs/workspace`](docs/workspace/README.md).

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | LTS, **24.x** (≥ 22.12) | `.node-version` says 24. `node.exe` must be allowed to run. |
| pnpm | **10.34.6** (pinned in `package.json` → `packageManager`) | Install with npm (below). **Not** pnpm 12, the standalone installer, or winget: those are native executables. |
| Git | any | |
| Power Apps CLI (`pa`) | `@microsoft/power-apps-cli` 1.2.x | Only needed to connect to / publish to Power Platform. Has native dependencies; see [Deploying](#deploying). |

You do **not** need Visual Studio Build Tools, Python, or admin rights.

## First-time setup

```powershell
npm install --global pnpm@10.34.6   # plain JS package; puts pnpm.cmd in %APPDATA%\npm
git clone https://github.com/<org>/<repo>.git
cd <repo>
pnpm install
pnpm verify:no-native               # must print ✔
pnpm dev                            # http://localhost:5173, mock data, fully offline
```

> PowerShell says *"pnpm.ps1 cannot be loaded because running scripts is
> disabled"*? Run `pnpm.cmd install` instead, use `cmd.exe`, or (if policy
> allows) `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Daily commands

Run from the repo root:

| Command | What it does |
|---|---|
| `pnpm dev` | Start `apps/app-template` on http://localhost:5173 with **mock** data |
| `pnpm --filter @codeapps/<app> dev` | Same, for another app |
| `pnpm --filter @codeapps/<app> dev:powerapps` | Dev server in **Power Apps** data mode (use with Local Play) |
| `pnpm build` | Type-check and build every app in `apps/` → `apps/<app>/dist` |
| `pnpm typecheck` | `tsc` across all packages and apps |
| `pnpm lint` | ESLint (same rules as the official template) |
| `pnpm verify:no-native` | Fail if any native binary or platform package is installed **or in the lockfile** |
| `pnpm smoke:dev` | Start each app's dev server headlessly and check it serves transformed TSX |
| `pnpm test` | Unit tests (Vitest for packages/apps, `node:test` for scripts) |
| `pnpm check` | Everything CI runs, in order |
| `pnpm new-app <name>` | Create `apps/<name>` from the template |
| `pnpm new-module <id>` | Create a workspace module in `modules/<id>` |
| `pnpm --filter @codeapps/workspace dev` | Run the workspace app offline (mock data, persona switcher) |
| `pnpm dataverse:plan` | Validate the workspace Dataverse schema and print the plan (no sign-in) |
| `pnpm dataverse:provision --url … --admin …` | Create the workspace tables + seed data in an environment |

### Data modes (offline vs Power Apps)

The UI only talks to the `DataService` interface from `@codeapps/data`.
`VITE_DATA_MODE` picks the implementation:

| Mode | When | Backed by |
|---|---|---|
| `mock` | `pnpm dev` (default, from `.env`) | in-memory data in `packages/data/src/mock.ts` |
| `powerapps` | `pnpm dev:powerapps`, `pnpm build` (`.env.production`) | `getContext()` / `getClient()` from `@microsoft/power-apps` |

To change the dev default on your machine, create `apps/<app>/.env.local`
(git-ignored) containing `VITE_DATA_MODE=powerapps`.

## Create a new app

```powershell
pnpm new-app expense-tracker "Expense Tracker"
pnpm install
pnpm --filter @codeapps/expense-tracker dev
```

This copies `apps/app-template` (without `node_modules`, `dist`,
`power.config.json` or `.env.local`), renames the package to
`@codeapps/expense-tracker` and sets the title. CI builds every app in `apps/`
automatically.

Alternatively, copy the folder by hand and change `name` in its
`package.json`.

## Connect to Power Platform

All `pa` commands run **inside the app folder** (`apps/<app>`), because
that's where `power.config.json` lives.

1. **Install the CLI** (once): `npm install --global @microsoft/power-apps-cli`.
   It's a global tool on purpose and is never added to the workspace.
2. **Initialise**:
   ```powershell
   cd apps/expense-tracker
   pa app init --display-name "Expense Tracker" --environment-id <environment-id>
   ```
   This creates `power.config.json` (environment ID, region, `buildPath:
   ./dist`, `buildEntryPoint: index.html`, …). **Commit it.** It contains no
   secrets. After the first push it also holds the `appId`, which lets later
   pushes update the same app instead of creating a new one.
3. **Local Play** (run your local code inside the Power Apps host):
   ```powershell
   pnpm --filter @codeapps/expense-tracker dev:powerapps
   ```
   Once `power.config.json` exists, the `powerApps()` Vite plugin turns on
   and prints a **Local Play** URL. Open it in the browser profile you use
   for your tenant, and allow *local network access* if Edge/Chrome asks.
   `pa app run` does the same, but it runs the plain `dev` script (mock mode
   unless `.env.local` says otherwise).
   This step does **not** need the `pa` CLI.
4. **Add data**: `pa app add data-source …` (see the
   [CLI reference](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/reference/cli)).
   It generates typed services and `.power/schemas/...dataSourcesInfo`. Wire
   it into `src/data.ts`; there's a commented example there.

## Deploying

```powershell
pnpm --filter @codeapps/expense-tracker build   # → apps/expense-tracker/dist
cd apps/expense-tracker
pa app push                                      # or: pa app push --solution-id <solution-guid>
```

`pa app push` uploads `buildPath` and prints the app URL. Use
`--solution-id` (or `PA_CLI_SOLUTION_ID`) for ALM. See
[ALM for code apps](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/alm).

**From GitHub Actions (no CLI on your laptop):**
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) is a manual
workflow that builds an app and runs `pa app push --non-interactive` as a
service principal. Set it up once:

1. A maker runs `pa app init`, the first `pa app push` and
   `pa app share --principal <enterprise-app-object-id> --access edit`, then
   commits `power.config.json`.
2. Add secrets `PA_CLI_SP_CLIENT_ID`, `PA_CLI_SP_CLIENT_SECRET`,
   `PA_CLI_SP_TENANT_ID` (repository or `power-platform` environment), and
   optionally the variable `PA_CLI_SOLUTION_ID`.
3. **Actions → Deploy code app → Run workflow**, then enter the app folder name.

> **⚠️ The `pa` CLI itself is not native-binary-free.**
> `@microsoft/power-apps-cli` depends on `@azure/msal-node-extensions`
> (`dpapi.node`, `keytar`, `@azure/msal-node-runtime`) for its token cache.
> If your laptop blocks those, `pa auth login` / `init` / `push` may fail.
> Options, in order of preference:
> 1. Publish from the deploy workflow above.
> 2. Have one person on an unrestricted machine (or Dev Box / Codespaces)
>    run `pa app init` / `pa app add data-source` and commit the results.
>    Local Play and all development then work without the CLI.
> 3. Ask IT to allow the CLI's signed `.node` files under your global npm
>    folder.
>
> The older route, `pac code init/push` from the .NET Power Platform CLI, is
> a native executable and has the same problem.

---

## Corporate laptop pitfalls

**Rule: `pnpm verify:no-native` must pass.** CI enforces this on
`windows-latest` and `ubuntu-latest`. On Linux, CI also reinstalls as if on
Windows x64/arm64 (`--config.supportedArchitectures.os=win32`) and checks
again.

### What the overrides do (`pnpm-workspace.yaml`)

| Setting | Why |
|---|---|
| `esbuild: npm:esbuild-wasm@0.28.2` | Vite uses esbuild for TS/JSX transforms, dependency pre-bundling and minification. Normally that means `@esbuild/win32-x64/esbuild.exe`. `esbuild-wasm` is the same API compiled to WebAssembly and run by `node.exe`. The version must satisfy Vite's range (`^0.27 \|\| ^0.28` for Vite 7.3). |
| `rollup: npm:@rollup/wasm-node@4.64.5` | Vite 7 bundles production builds with Rollup, whose default build loads `@rollup/rollup-win32-x64-msvc/*.node`. The WASM build has the same API. |
| `fsevents: '-'` | Removes the macOS-only native file watcher from the graph, so the lockfile is identical everywhere. |
| `'@napi-rs/lzma-linux-x64-gnu': '-'` | `@rollup/wasm-node` ≥ 4.63.0 lists this native Linux module as an optional dependency but never uses it. Removed. |
| `onlyBuiltDependencies: []` | pnpm 10 blocks dependency install scripts by default. The empty list makes that explicit: **no package may run postinstall/build scripts.** |
| `strictDepBuilds: true` | If a new dependency *wants* to run an install script, `pnpm install` **fails** instead of quietly skipping it. That's your signal the package probably downloads or compiles a binary. |

**Allowed install scripts: none.** Nothing in this repo needs one. If you
ever have to add an entry to `onlyBuiltDependencies`, write it here with the
package, the reason, and proof that `verify:no-native` still passes.

The cost of WASM: esbuild-wasm and Rollup-WASM are slower than native, but
for code-app-sized projects a build takes a few seconds (≈3 s in CI).

### Things not to add or upgrade

| Don't | Because | Use instead |
|---|---|---|
| Vite 8+ / `rolldown-vite` | Rolldown is a native Rust binary | stay on Vite 7.x |
| `@vitejs/plugin-react-swc`, `@swc/*` | native SWC | `@vitejs/plugin-react` 5.x (Babel) |
| `@vitejs/plugin-react` 6+ | built for Vite 8 / oxc | 5.x |
| TypeScript 7 (`typescript@latest`!) | native Go compiler (`@typescript/typescript-win32-x64`) | `typescript@5.9.x` |
| Tailwind CSS v4 / `@tailwindcss/vite` / `@tailwindcss/oxide` | native oxide engine + Lightning CSS | **Tailwind 3.4** + PostCSS (pure JS, used by `apps/workspace`), plain CSS, CSS modules, or Fluent UI v9 |
| `tailwind-merge` 3+ | targets Tailwind v4 class names | `tailwind-merge` 2.x |
| `lightningcss`, `css.transformer: 'lightningcss'`, `build.cssMinify: 'lightningcss'` | native | Vite defaults (PostCSS + esbuild-wasm) |
| `sass-embedded` | bundles the Dart VM executable | `sass` (pure JS) |
| `sharp`, `vite-imagetools`, image optimisers | native libvips | pre-optimised assets |
| Biome, oxlint, dprint | native binaries | ESLint (included) / Prettier |
| pnpm 12, `@pnpm/exe`, `get.pnpm.io` installer, `winget install pnpm` | native pnpm executable | `npm install -g pnpm@10.34.6` |
| Playwright / Puppeteer browser downloads | download `.exe` browsers | run E2E in CI only |
| `esbuild-loader`, `swc-loader`, `@parcel/watcher` | native | — |

Before adding any dependency: `pnpm add <pkg>` → `pnpm verify:no-native`. If
it fails, the output names the package and the reason.

### Other notes

- **Exact versions.** Toolchain packages are pinned without `^`, so a
  transitive release can't silently pull in native code. Upgrade
  deliberately, one package at a time, re-running `pnpm check`.
- **Keep the lockfile.** `pnpm-lock.yaml` is committed. CI uses
  `--frozen-lockfile`. The no-native check also scans the lockfile, so it
  catches Windows-only packages even when you install on Linux/WSL.
- **Port 5173** is Vite's default (as in the official template). If the
  [webpack fallback](docs/webpack-fallback.md) is ever needed, it uses 3000,
  which is what `pa app run` expects without the Vite plugin.
- **If WASM itself is blocked** (rare: some endpoint protection blocks
  WebAssembly JIT in `node.exe`), `pnpm dev`/`build` will crash inside
  esbuild-wasm. See [`docs/webpack-fallback.md`](docs/webpack-fallback.md).

## Internal company component library

`packages/company-ui-placeholder` is a **clearly marked stub**
(`@placeholder/company-ui`), imported only via `apps/<app>/src/ui/company.ts`.
[`docs/internal-component-library.md`](docs/internal-component-library.md)
explains three ways to swap in the real library:

1. **Private registry**: scoped `.npmrc` entry with
   `_authToken=${COMPANY_NPM_TOKEN}` from an environment variable.
2. **pnpm git dependency** pinned to a tag:
   `git+https://…/design-system.git#v1.4.2&path:/packages/ui`.
3. **Vendored tarball**: `file:../../vendor/yourco-ui-1.4.2.tgz`.

Never commit tokens.

For `apps/workspace`, the component library plugs in behind `@codeapps/ui`
rather than the placeholder adapter. See
[UI and theming](docs/workspace/ui-and-theming.md).

## Using this repo as a GitHub template

This repository is marked as a **template repository**. Click
**Use this template → Create a new repository**, then:

1. Update the CI badge URL at the top of this README.
2. Optionally rename the `@codeapps/*` scope (search and replace across
   `package.json` files and imports, then run `pnpm install`).
3. Rename or copy `apps/app-template` with `pnpm new-app`.
4. Run `pnpm install && pnpm check`.

## Shared packages

- **`@codeapps/components`**: React + TypeScript components with
  `react`/`react-dom` as `peerDependencies`. These are source-only
  workspace packages (Vite compiles the TypeScript), so there's no extra
  build step or bundler. Add components in `src/` and export them from
  `src/index.ts`.
- **`@codeapps/data`**: `DataService` interface, `createMockDataService`,
  `createPowerAppsDataService`, and `createDataService(mode)`. Each
  implementation is loaded with a dynamic import, so a mock-only bundle never
  loads the Power Apps client and vice versa.
- **`@codeapps/platform`**: the workspace framework (module contract,
  capability-based access control, hash router with deep links, mock and
  Dataverse data providers, app shell). See [docs/workspace](docs/workspace/README.md).
- **`@codeapps/ui`**: Tailwind 3.4 preset, theme tokens and components.
  This is the single swap point for an internal component library; see
  [UI and theming](docs/workspace/ui-and-theming.md#swapping-in-an-internal-component-library-eg-sourceweb-react).
