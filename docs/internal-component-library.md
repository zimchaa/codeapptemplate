# Plugging in the internal company component library

The template ships a **placeholder**, `packages/company-ui-placeholder`
(`@placeholder/company-ui`). It has no company code. Apps only import it via
one adapter file:

```ts
// apps/<app>/src/ui/company.ts
export { CompanyButton } from '@placeholder/company-ui'
```

To switch to the real library, pick **one** of the three options below. Then:

1. Add the dependency to the **app's** `package.json` (not the root).
2. Change the import in `src/ui/company.ts`, e.g.
   `export { Button as CompanyButton } from '@yourco/ui'`.
3. Remove `"@placeholder/company-ui": "workspace:*"` from the app.
4. Run `pnpm install` and then **`pnpm verify:no-native`**. If the company
   library (or any of its dependencies) ships native binaries, uses SWC /
   Tailwind v4 oxide / Lightning CSS, or needs an install script, it fails
   here rather than on someone's laptop.

Throughout, `@yourco/ui`, `pkgs.example.com` and `github.com/yourco/ui` are
examples; replace them with the real values.

---

## Option A: private registry (recommended)

Best for a library that is published and versioned like any npm package
(Azure Artifacts, GitHub Packages, Artifactory, Nexus …).

**1. Scope the registry in the repo-level `.npmrc`.** It's already in the
repo, with these lines commented out:

```ini
@yourco:registry=https://pkgs.example.com/npm/registry/
//pkgs.example.com/npm/registry/:_authToken=${COMPANY_NPM_TOKEN}
```

- Only `@yourco/*` packages go to the private registry; everything else
  still comes from npmjs.org.
- `${COMPANY_NPM_TOKEN}` is expanded by pnpm at install time. The file
  contains **no secret** and is safe to commit.

**2. Provide the token through the environment, never in a file in the repo.**

```powershell
# Windows, current session
$env:COMPANY_NPM_TOKEN = "<token>"
# Windows, persist for your user (new terminals)
[Environment]::SetEnvironmentVariable("COMPANY_NPM_TOKEN", "<token>", "User")
```

```bash
export COMPANY_NPM_TOKEN="<token>"
```

In GitHub Actions, add a repository secret and expose it to the install step:

```yaml
- run: pnpm install --frozen-lockfile
  env:
    COMPANY_NPM_TOKEN: ${{ secrets.COMPANY_NPM_TOKEN }}
```

**3. Add the dependency:**

```bash
pnpm --filter @codeapps/app-template add @yourco/ui@1.4.2
```

Notes:

- If `COMPANY_NPM_TOKEN` is unset, pnpm sends an empty token and the install
  fails with 401/404 for `@yourco/*`. That is expected; set the variable.
- Azure Artifacts: the token is a PAT with *Packaging (Read)* scope. Some
  feeds require base64 `_password` + `username` instead of `_authToken`, so
  check the feed's "Connect to feed → npm" page. Do **not** use
  `vsts-npm-auth` / `artifacts-npm-credprovider` if they are blocked
  executables on your laptop. The env-var token works without them.

## Option B: pnpm git dependency pinned to a tag, with `&path:`

Best when the library lives in a (mono)repo but isn't published to a
registry.

```jsonc
// apps/<app>/package.json
"dependencies": {
  "@yourco/ui": "git+https://github.com/yourco/design-system.git#v1.4.2&path:/packages/ui"
}
```

- `#v1.4.2` pins to a **tag**; never point at a branch. pnpm records the
  resolved commit in `pnpm-lock.yaml`.
- `&path:/packages/ui` installs a sub-directory of a monorepo.
- Private repo: use your existing git credential (Git Credential Manager on
  Windows) or, in CI, an HTTPS token injected via
  `git config --global url."https://x-access-token:${TOKEN}@github.com/".insteadOf "https://github.com/"`.
  Never put the token in the URL in `package.json`.
- **Important:** pnpm treats a git dependency's `prepare`/build script as an
  install script. These are **blocked** here (`onlyBuiltDependencies: []`,
  `strictDepBuilds: true`), so the install fails if the package needs a build
  step. Therefore the tagged commit must contain **pre-built** output
  (`dist/`), or the package must expose source that Vite can compile directly
  (like the workspace packages here). Ask the library owners to commit `dist`
  on release tags, or use option A/C.

## Option C: vendored `.tgz` via `file:`

Best for fully offline machines, air-gapped builds, or a one-off drop from
another team.

```bash
# On a machine with access, from the library repo:
npm pack            # -> yourco-ui-1.4.2.tgz
```

Copy it into `vendor/` at the repo root, then:

```jsonc
// apps/<app>/package.json
"dependencies": {
  "@yourco/ui": "file:../../vendor/yourco-ui-1.4.2.tgz"
}
```

- `.gitignore` ignores `vendor/*.tgz` by default so nothing gets committed by
  accident. If your team decides to commit the tarball (reasonable for
  reproducibility if the licence allows), force-add it:
  `git add -f vendor/yourco-ui-1.4.2.tgz`.
- Put the version in the file name. To upgrade, drop in a new file, update
  the path and run `pnpm install`.
- The tarball is integrity-checked through `pnpm-lock.yaml`.

---

## Rules for any option

- **Never commit tokens**: not in `.npmrc`, `package.json`, `.env` files or
  CI YAML. Use environment variables and CI secrets.
- The library must declare `react`/`react-dom` as **peerDependencies**, so
  the app's single React copy is used.
- Styling must not require Tailwind v4 oxide, Lightning CSS, Sass-embedded
  or PostCSS plugins with native bindings. Plain CSS, CSS modules, or Fluent
  UI v9 (Griffel, pure JS) are fine.
- `pnpm verify:no-native` must pass, locally and in CI.
