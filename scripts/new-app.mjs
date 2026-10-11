#!/usr/bin/env node
// Creates apps/<name> from apps/app-template.
//
// Usage: pnpm new-app <name> ["Display Name"]
// <name> must be kebab-case, e.g. `expense-tracker`.

import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const [name, displayNameArg] = process.argv.slice(2)

if (!name || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  console.error('Usage: pnpm new-app <kebab-case-name> ["Display Name"]')
  process.exit(1)
}

const root = resolve(import.meta.dirname, '..')
const source = join(root, 'apps', 'app-template')
const target = join(root, 'apps', name)
const displayName =
  displayNameArg ?? name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

if (existsSync(target)) {
  console.error(`apps/${name} already exists.`)
  process.exit(1)
}

// Never copy installs, build output or anything environment-specific.
const skip = new Set(['node_modules', 'dist', '.power', 'power.config.json', '.env.local'])
cpSync(source, target, {
  recursive: true,
  filter: (src) => !skip.has(basename(src)),
})

const pkgPath = join(target, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.name = `@codeapps/${name}`
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

const htmlPath = join(target, 'index.html')
writeFileSync(
  htmlPath,
  readFileSync(htmlPath, 'utf8').replace(/<title>.*<\/title>/, `<title>${displayName}</title>`),
)

const appPath = join(target, 'src', 'App.tsx')
writeFileSync(
  appPath,
  readFileSync(appPath, 'utf8').replace('<h1>Code App Template</h1>', `<h1>${displayName}</h1>`),
)

console.log(`✔ Created apps/${name} (@codeapps/${name})

Next steps:
  pnpm install
  pnpm --filter @codeapps/${name} dev          # offline, mock data
  cd apps/${name}
  pa app init --display-name "${displayName}" --environment-id <environment-id>
`)
