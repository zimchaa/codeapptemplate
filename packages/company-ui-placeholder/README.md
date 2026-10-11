# ⚠️ PLACEHOLDER: internal company component library

This package is **not** the real company library and contains no company code.
It exists so the template compiles and shows *where* the real library plugs in.

Apps import it only through one adapter file, `apps/<app>/src/ui/company.ts`.
To switch to the real library:

1. Add the real package to the app using one of the three methods in
   [`docs/internal-component-library.md`](../../docs/internal-component-library.md).
2. Change the import in `src/ui/company.ts`.
3. Remove `@placeholder/company-ui` from the app's `package.json` and run
   `pnpm install && pnpm verify:no-native`.
