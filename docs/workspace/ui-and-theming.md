# UI kit and theming

## What's used

- **Tailwind CSS 3.4:** pure JavaScript (PostCSS + jiti), so it works on locked-down laptops.
  **Never upgrade to Tailwind v4**: its `@tailwindcss/oxide` engine is a native binary, and
  `pnpm verify:no-native` will fail.
- **`@codeapps/ui`:**
  - a Tailwind preset;
  - theme tokens;
  - accessible components: Button, Card, Badge, form controls, Table, Dialog / DropdownMenu / Tabs /
    Tooltip (Radix primitives, pure JS), Alert, EmptyState, PageHeader, Avatar, Stat, Toast;
  - date helpers.
- **lucide-react** icons.

Apps and modules import UI **only from `@codeapps/ui`**. That single import surface is what makes
the kit replaceable.

## Theme tokens

Components use semantic classes only, never raw colours:

| Class | Token |
|---|---|
| `bg-primary`, `text-primary`, `bg-primary-subtle`, `hover:bg-primary-hover`, `text-primary-foreground` | brand colour |
| `bg-background`, `bg-surface`, `bg-surface-muted` | page / card / muted surfaces |
| `text-foreground`, `text-muted`, `border-border`, `ring-ring` | text, borders, focus |
| `text-success|warning|danger|info` (and `bg-…/15`) | status |
| `bg-sidebar`, `text-sidebar-foreground`, `text-sidebar-muted`, `border-sidebar-active` | navigation |
| `rounded`, `shadow-card`, `font-sans`, `font-heading` | shape and type |

Tokens are CSS variables (`--ws-*`, as `R G B` channels) in `packages/ui/src/theme/themes.css`.
They're selected by `data-theme` and `data-mode` on `<html>`. `ThemeProvider` manages those
attributes and stores the user's choice. The top bar has a theme / light-dark-system menu.

### Themes

| Theme | Look |
|---|---|
| `foundation-red` (default) | Bright red primary (`#E60000`), charcoal text and sidebar (`#25282B`), light grey canvas (`#F4F4F4`), 6px radii, bold headings. Light + dark. Modelled on the publicly visible style of "foundation" design systems. **Contains no brand name, logo or licensed font.** |
| `neutral` | Fluent-like blue, light sidebar, 4px radii. Light + dark. |

Muted text is darkened to meet WCAG AA contrast. White text on `#E60000` is about 4:1, so primary
buttons use bold text (AA for large/bold text).

### Adding your brand privately

This repository is public. Keep brand assets out of it, and apply them in your private fork or
deployment:

1. **Licensed typeface:** put the font files in a private location (or your company CDN, if CSP
   allows) and add, e.g. in `apps/workspace/src/brand.css` (not committed here):

   ```css
   @font-face { font-family: 'Brand Sans'; src: url('…/brand-regular.woff2') format('woff2'); font-weight: 400; }
   @font-face { font-family: 'Brand Sans'; src: url('…/brand-bold.woff2') format('woff2'); font-weight: 700; }
   [data-theme='foundation-red'] { --ws-font-sans: 'Brand Sans', 'Segoe UI', system-ui, sans-serif; }
   ```

   Import it after `@codeapps/ui/themes.css` in `src/main.tsx`.
2. **Logo:** replace the dot in `packages/platform/src/shell/ShellLayout.tsx` (sidebar header) with
   your logo component, and set the title via Admin → Settings → `app.title`.
3. **Exact colours:** override the `--ws-*` variables in the same CSS file. No component changes
   are needed.

## Adding a theme

Copy a block in `themes.css` under a new `[data-theme='my-theme']` selector (plus its `[data-mode='dark']`
variant). Then add the name to `themeNames` in `packages/ui/src/theme/theme-context.ts`.

## Swapping in an internal component library (e.g. SourceWeb React)

The kit was written to be replaced in one of two ways. Either way, `pnpm verify:no-native` must still
pass. Watch for libraries that need `sass-embedded` (use `sass`), Tailwind v4, or install scripts.

**A. Adapter (recommended): keep `@codeapps/ui`'s API, change its insides**

1. Add the internal library to `packages/ui/package.json`, using one of the three methods in
   [docs/internal-component-library.md](../internal-component-library.md) (private registry, git tag
   with `&path:`, or vendored `.tgz`).
2. Re-implement each component in `packages/ui/src/components/*` as a thin wrapper that maps our
   props to theirs. For example `Button`'s `variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link'`
   maps to the library's equivalents. Keep the exported names and props in `src/index.ts` unchanged.
3. Load the library's CSS in `apps/workspace/src/main.tsx`. Keep `themes.css` (or map the library's
   tokens onto `--ws-*`) so the shell and any remaining Tailwind classes match.
4. Swap one component at a time; the app keeps working in between.

**B. Replace the whole package**

Workspace packages resolve by **name**, so a different package can take over the name:

1. Create `packages/ui-sourceweb` implementing the same exports as `packages/ui/src/index.ts`
   (`pnpm typecheck` lists anything missing once it's wired in).
2. Rename the existing package to `@codeapps/ui-tailwind` (its `package.json` `name`), and give the
   new one `"name": "@codeapps/ui"`.
3. Run `pnpm install`. The platform, every module and the app now get the new implementation, and
   you can keep the old one around for comparison.

Where the internal library has no equivalent (e.g. `Stat`, `EmptyState`), keep the Tailwind version.
They read the same tokens, so they blend in.
