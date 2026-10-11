# Fallback: webpack instead of Vite (documented, not built)

Use this **only** if the WASM-based Vite toolchain (esbuild-wasm +
@rollup/wasm-node) fails on a particular machine, e.g. because a security
product blocks WebAssembly compilation inside `node.exe`. Everything below
is plain JavaScript: webpack, ts-loader (which uses the `typescript`
package's JS compiler) and the dev server.

> Checked on 2026-10-11: a scratch install of `webpack@5.111`,
> `webpack-cli@7.2`, `webpack-dev-server@6.0`, `ts-loader@9.6`,
> `html-webpack-plugin@5.6`, `css-loader@7.1`, `style-loader@4.0` and
> `typescript@5.9.3` with this repo's pnpm settings (fsevents removed, no
> install scripts) passed `verify:no-native`: 335 packages, 0 native
> binaries. Re-run `pnpm verify:no-native` after adding it, because versions
> drift.

## Why port 3000

`pa app run` checks whether `vite.config.*` uses the `powerApps()` plugin.

- **With the plugin (the default Vite setup):** it just runs `pnpm run dev`.
  The plugin prints the Local Play URL, and Vite uses its own port (5173).
- **Without the plugin (webpack):** `pa app run` starts its own config
  server on **8080** (`--port`) and runs `pnpm run dev`. It then waits for
  your app at `localAppUrl` from `power.config.json`, which defaults to
  **`http://localhost:3000`**. If 3000 is busy, it appends
  `--port <n> --strictPort` to the dev command.

So the webpack dev server must listen on **3000** by default. It should also
accept `--port` and `--strictPort` (or at least not fail when given them).

## Packages

In the app's `package.json`, remove `vite`, `@vitejs/plugin-react` and
`@microsoft/power-apps-vite`, then add:

```jsonc
"devDependencies": {
  "webpack": "5.111.1",
  "webpack-cli": "7.2.3",
  "webpack-dev-server": "6.0.0",
  "ts-loader": "9.6.2",
  "html-webpack-plugin": "5.6.8",
  "css-loader": "7.1.5",
  "style-loader": "4.0.0",
  "typescript": "5.9.3"
}
```

Do **not** use `esbuild-loader`, `swc-loader`, or `babel-loader` with
native presets. The `esbuild` override in `pnpm-workspace.yaml` stays in
place regardless.

## webpack.config.mjs (outline)

```js
import { fileURLToPath } from 'node:url'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpack from 'webpack'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

// Origins allowed to load the app during local play. These mirror the CORS
// list in @microsoft/power-apps-vite.
const allowedOrigin =
  /^https:\/\/(apps\.(?:[^.]+\.)*powerapps\.(com|us|cn)|play\.apps\.appsplatform\.us)$/

export default (env, argv) => {
  const isProd = argv.mode === 'production'
  return {
    entry: r('./src/main.tsx'),
    output: {
      path: r('./dist'),                      // = buildPath in power.config.json
      filename: 'assets/[name]-[contenthash].js',
      publicPath: './',                       // relative URLs, like Vite base: './'
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      // Source imports use explicit .ts/.tsx extensions; also allow .js -> .ts.
      extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          // Type-check separately with `tsc -b` (as the Vite setup does).
          // `allowImportingTsExtensions` requires noEmit for tsc, so ts-loader
          // needs these two overrides to emit JS.
          options: {
            transpileOnly: true,
            compilerOptions: { noEmit: false, allowImportingTsExtensions: false },
          },
          exclude: /node_modules\/(?!@codeapps\/)/, // workspace packages ship TS source
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            { loader: 'css-loader', options: { modules: { auto: true } } }, // *.module.css
          ],
        },
        { test: /\.svg$/, type: 'asset/resource' },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: r('./index.html') }), // remove the <script type="module"> tag from index.html
      // Replaces the Vite env mechanism used by src/data.ts.
      new webpack.DefinePlugin({
        'import.meta.env.VITE_DATA_MODE': JSON.stringify(
          process.env.VITE_DATA_MODE ?? (isProd ? 'powerapps' : 'mock'),
        ),
      }),
    ],
    devtool: isProd ? false : 'eval-cheap-module-source-map',
    devServer: {
      port: 3000,                              // what `pa app run` expects
      host: 'localhost',
      hot: true,
      historyApiFallback: true,
      static: { directory: r('./public') },
      // Allow apps.powerapps.com (Local Play) to load the dev bundle.
      headers: (req) => {
        const origin = req.headers.origin
        return origin && allowedOrigin.test(origin)
          ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*' }
          : {}
      },
    },
  }
}
```

## Scripts

```jsonc
"scripts": {
  "dev": "webpack serve --mode development",
  "build": "tsc -b && webpack --mode production",
  "typecheck": "tsc -b"
}
```

`webpack serve` accepts `--port`. If `pa app run` passes `--strictPort`,
`webpack-cli` will reject the unknown flag. Either keep port 3000 free, or
wrap the dev script in a tiny Node script that drops `--strictPort`.

## Local play and deploy with webpack

1. `pa app init` (if `power.config.json` doesn't exist yet). Keep
   `buildPath` = `./dist`, `buildEntryPoint` = `index.html`, and
   `localAppUrl` = `http://localhost:3000`.
2. `pa app run` starts the config server (8080) and `pnpm run dev` (3000),
   then prints the **Local Play** URL. Alternatively, run `pnpm dev` yourself
   and `pa app run --config-only`.
3. `pnpm build`, then `pa app push`.

## Caveats

- No React Fast Refresh in this outline. Changes trigger a full reload (or
  module HMR without state preservation). Adding
  `@pmmmwh/react-refresh-webpack-plugin` + `react-refresh/babel` requires
  `babel-loader`; check the result with `pnpm verify:no-native`.
- Remove `vite/client` from `tsconfig.app.json` `types` and declare
  `import.meta.env.VITE_DATA_MODE` yourself (see `src/vite-env.d.ts`).
- This route is not exercised by CI. If a team adopts it, add the app to the
  workflow so `pnpm build` and the no-native check cover it.
