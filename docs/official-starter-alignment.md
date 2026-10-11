# Alignment with the official code apps starter

Researched on **2026-10-11** against:

- [microsoft/PowerAppsCodeApps](https://github.com/microsoft/PowerAppsCodeApps)
  `main` @ `8b7443e` (2026-09-14): `templates/vite` and `templates/starter`
- Microsoft Learn: [Quickstart](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/create-an-app-from-scratch),
  [CLI reference](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/reference/cli) (2026-10-02),
  [ALM](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/alm),
  [Service principal publishing](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/use-service-principal)

Re-check these when upgrading. The table shows what to compare.

## What the official starter uses today

| Item | Official (`templates/vite`) | This repo | Why |
|---|---|---|---|
| Bundler | `vite ^7.2.4` | `vite 7.3.7` (exact) | Last major on esbuild + Rollup; Vite 8 uses Rolldown (native). |
| React plugin | `@vitejs/plugin-react ^5.1.1` (Babel) | `5.2.0` | Babel = pure JS. Not `-swc`. v6 targets Vite 8/oxc. |
| Client library | `@microsoft/power-apps ^1.2.5` | `1.5.0` | Latest; no dependencies, pure JS. |
| Vite integration | `@microsoft/power-apps-vite ^1.0.2` | `1.0.13` | Latest; pure JS (only `picocolors`). |
| React | `^19.2.0` | `19.3.0` | Latest 19.x. |
| TypeScript | `~5.9.3` | `5.9.3` | `typescript@latest` is now 7.x = native Go compiler. typescript-eslint also requires `<6.1`. |
| ESLint | `^9.39.1` | `10.12.0` | 9.x is now deprecated; all plugins support 10. Pure JS either way. |
| Package manager | npm | pnpm `10.34.6` | Workspaces + overrides + install-script control. pnpm 12 is a native exe. |
| Styling | plain CSS (`vite`); Tailwind v4 (`starter`) | plain CSS / CSS modules | Tailwind v4 needs `@tailwindcss/oxide` (native). |
| CLI | `pa` from `@microsoft/power-apps-cli` (installed globally) | same, **kept out of the workspace** | It depends on native modules (see below). |

The `starter` template's extra libraries (Radix, TanStack Query/Table,
React Router, zustand, recharts …) are all pure JS and can be added. Its
**Tailwind v4 + `@tailwindcss/vite` is the one thing that can't be used
here.**

## Current CLI and dev flow

- The CLI is now **`pa`** (`npm install --global @microsoft/power-apps-cli`).
  Commands: `pa app init | run | push | add data-source | add flow …`,
  `pa auth login | status | switch`. The old `pac code …` commands (the .NET
  Power Platform CLI) still appear in a few places, such as
  `templates/README.md` and the Vite plugin's error text, but Learn now
  documents `pa`.
- **`pa app init`** writes `power.config.json` in the app folder. Defaults
  from the CLI: `appType: CodeApp`, `buildPath: ./dist`,
  `buildEntryPoint: index.html`, `localAppUrl: http://localhost:3000`, plus
  `environmentId`, `region`, `appDisplayName`, and later the app ID and any
  data sources / connection references.
- **`pa app run`** reads `packageManager` (so it uses pnpm here) and checks
  `vite.config.*` for the `powerApps()` plugin:
  - plugin present → it simply runs `pnpm run dev`. The plugin serves
    `power.config.json` at `/__vite_powerapps_plugin__/power.config.json`
    and prints the **Local Play** URL:
    `https://apps.powerapps.com/play/e/<envId>/a/local?_localAppUrl=…&_localConnectionUrl=…`
  - plugin absent → it starts its own config server on **8080** and expects
    the app on `localAppUrl` (default **3000**). This is the path the
    [webpack fallback](webpack-fallback.md) uses.
- **Build/push:** `npm run build` → `pa app push [--solution-id <guid>]`.
  CI: `PA_CLI_USE_SP_AUTH=true`, `PA_CLI_SP_CLIENT_ID`,
  `PA_CLI_SP_CLIENT_SECRET`, `PA_CLI_SP_TENANT_ID`, then
  `pa app push --non-interactive`. Before its first push, the service
  principal must be granted edit access with
  `pa app share --principal <enterprise-app-object-id> --access edit`.
- The `powerApps()` Vite plugin sets `base: './'` and adds the
  `apps.*.powerapps.com` CORS origins to the dev server. It does **not** fix
  a port, so Vite uses 5173.

## Deviations (and why)

1. **pnpm workspace monorepo** instead of a single npm project. Shared
   packages in `packages/*`, apps in `apps/*`.
2. **WASM overrides** in `pnpm-workspace.yaml`: `esbuild → esbuild-wasm`,
   `rollup → @rollup/wasm-node`. `fsevents` and
   `@napi-rs/lzma-linux-x64-gnu` are removed. The latter is an unused
   optional native dependency that `@rollup/wasm-node` has listed since
   4.63.0.
3. **`powerApps()` plugin added only when `power.config.json` exists.**
   Without the file, the plugin logs an error on every `vite` start; the
   template is meant to run offline first. `base: './'` is set explicitly so
   builds are identical either way. `pa app run` requires
   `power.config.json` anyway, so its plugin detection is unaffected.
4. **Data access behind an interface** (`@codeapps/data`) with a mock
   implementation, selected by `VITE_DATA_MODE`. Generated `pa` services
   still work. Call them from the Power Apps implementation (or directly).
5. **No `power.config.json` in the template.** It is environment-specific.
   Each real app gets one from `pa app init` and should commit it (it has no
   secrets, and keeping the app ID lets `pa app push` update the same app).
   This matches the official samples, which also don't commit it for the
   same reason.
6. **Exact version pins** (no `^`) for toolchain packages, so a transitive
   release can't silently add native code. Upgrades are deliberate and go
   through `pnpm verify:no-native`.

## Native code in the Power Apps CLI

`@microsoft/power-apps-cli@1.2.0` depends on
`@azure/msal-node-extensions@1.5.17`. That package ships `dpapi.node`
(x64/ia32/arm64) and depends on `keytar` and `@azure/msal-node-runtime`,
all native addons used for the encrypted token cache. On a laptop that blocks
native binaries, `pa auth login` / `pa app init` / `pa app push` may
therefore fail. This could not be tested here. Mitigations are in the README
(*Deploying*).

`pac` (the .NET Power Platform CLI) is a native executable and has the same
problem.
