#!/usr/bin/env node
// Fails if the workspace contains anything that would need a native binary to
// run: .exe / .node / shared-library files under node_modules, known
// platform-specific packages, or such packages anywhere in pnpm-lock.yaml
// (which also catches packages for *other* operating systems than this one).
//
// Usage: node scripts/verify-no-native.mjs [--root <dir>]
// Pure Node, no dependencies, so it runs before/without anything else.

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const args = process.argv.slice(2)
const rootArg = args.indexOf('--root')
const root = resolve(rootArg >= 0 ? args[rootArg + 1] : process.cwd())

/** File extensions that are native code. */
const BINARY_EXTENSIONS = ['.exe', '.node', '.dll', '.dylib', '.so']

/** Package names that ship or load native binaries. [pattern, reason] */
const BANNED_PACKAGES = [
  [/^esbuild$/, 'native esbuild; must be overridden to npm:esbuild-wasm'],
  [/^@esbuild\//, 'esbuild platform binary'],
  [/^rollup$/, 'native rollup; must be overridden to npm:@rollup/wasm-node'],
  [/^@rollup\/rollup-/, 'rollup platform binding'],
  [/^@swc\/core($|-)/, 'SWC native binding (use @vitejs/plugin-react, not -swc)'],
  [/^lightningcss($|-(?!wasm$))/, 'Lightning CSS native binding'],
  [/^@tailwindcss\/oxide/, 'Tailwind v4 oxide native engine'],
  [/^rolldown$|^@rolldown\/binding-/, 'Rolldown native binding (Vite 8+)'],
  [/^@oxc-[^/]+\/binding-|^oxc-[a-z-]+-binding/, 'Oxc native binding'],
  [/^@biomejs\/cli-/, 'Biome native binary'],
  [/^@parcel\/watcher($|-)/, 'Parcel watcher native binding'],
  [/^fsevents$/, 'macOS native file watcher'],
  [/^sharp$|^@img\/sharp-/, 'sharp native image library'],
  [/^@next\/swc-/, 'Next.js SWC binary'],
  [/^sass-embedded($|-)/, 'Dart Sass embedded binary (use `sass`)'],
  [/^@typescript\/(typescript|native-preview)-/, 'TypeScript 7+ native compiler (pin typescript 5.x)'],
  [/^@pnpm\/exe$|^@pnpm\/(linux|win|macos)-/, 'pnpm standalone executable'],
  [/^keytar$|^@azure\/msal-node-(runtime|extensions)$/, 'native credential store (Power Apps CLI dependency)'],
  [/^node-gyp-build$|^prebuild-install$|^node-pre-gyp$|^@mapbox\/node-pre-gyp$/, 'native addon loader/installer'],
  // Generic "<name>-<os>-<cpu>[-libc]" platform package convention.
  [/-(win32|linux|darwin|android|freebsd|openbsd|netbsd|sunos|aix)-(x64|arm64|ia32|arm|ppc64|s390x|riscv64|loong64|mips64el)(-[a-z]+)?$/, 'platform-specific binary package'],
]

const problems = []
const warnings = []

function bannedReason(name) {
  for (const [pattern, reason] of BANNED_PACKAGES) {
    if (pattern.test(name)) return reason
  }
  return null
}

// ---------------------------------------------------------------------------
// 1. Walk every real (non-symlinked) directory under each node_modules.
// ---------------------------------------------------------------------------
function walk(dir, visit) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isSymbolicLink()) continue // pnpm links point back into .pnpm; real files are visited there
    if (entry.isDirectory()) {
      visit(full, true)
      walk(full, visit)
    } else if (entry.isFile()) {
      visit(full, false)
    }
  }
}

function findNodeModulesDirs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.git') continue
    const full = join(dir, entry.name)
    if (entry.name === 'node_modules') out.push(full)
    else findNodeModulesDirs(full, out)
  }
  return out
}

const nodeModulesDirs = findNodeModulesDirs(root)
if (nodeModulesDirs.length === 0) {
  console.error(`verify:no-native: no node_modules found under ${root}. Run \`pnpm install\` first.`)
  process.exit(1)
}

let packageCount = 0
const seenPackages = new Set()

for (const nm of nodeModulesDirs) {
  walk(nm, (path, isDir) => {
    const rel = relative(root, path)
    if (!isDir) {
      const lower = path.toLowerCase()
      if (BINARY_EXTENSIONS.some((e) => lower.endsWith(e)) || /\.so\.\d+$/.test(lower)) {
        problems.push(`binary file      ${rel}`)
      } else if (lower.endsWith(`${sep}binding.gyp`)) {
        warnings.push(`native source    ${rel} (needs node-gyp; install scripts are blocked)`)
      }
      return
    }
    // A package root is <...>/node_modules/<name> or <...>/node_modules/@scope/<name>.
    const parts = path.split(sep)
    const parent = parts.at(-2)
    const grandparent = parts.at(-3)
    const isPackageRoot =
      (parent === 'node_modules' && !parts.at(-1).startsWith('@') && !parts.at(-1).startsWith('.')) ||
      (grandparent === 'node_modules' && parent.startsWith('@'))
    if (!isPackageRoot) return
    const manifest = join(path, 'package.json')
    if (!existsSync(manifest) || !lstatSync(manifest).isFile()) return
    let pkg
    try {
      pkg = JSON.parse(readFileSync(manifest, 'utf8'))
    } catch {
      return
    }
    if (!pkg.name) return
    packageCount++
    const id = `${pkg.name}@${pkg.version}`
    if (seenPackages.has(id)) return
    seenPackages.add(id)
    const reason = bannedReason(pkg.name)
    if (reason) problems.push(`banned package   ${id} (${reason}) at ${rel}`)
    if (pkg.gypfile === true) warnings.push(`native addon     ${id} declares "gypfile": true`)
  })
}

// ---------------------------------------------------------------------------
// 2. Scan pnpm-lock.yaml: covers optional/platform packages for every OS,
//    not just the ones installed on this machine.
// ---------------------------------------------------------------------------
const lockfile = join(root, 'pnpm-lock.yaml')
let lockPackageCount = 0
if (existsSync(lockfile)) {
  const lines = readFileSync(lockfile, 'utf8').split(/\r?\n/)
  let section = ''
  for (const line of lines) {
    const top = /^([a-zA-Z]+):\s*$/.exec(line)
    if (top) {
      section = top[1]
      continue
    }
    if (section !== 'packages' && section !== 'snapshots') continue
    // e.g. "  '@esbuild/linux-x64@0.28.2':" or "  vite@7.3.7(@types/node@24.19.2):"
    const key = /^ {2}'?((?:@[^@/'\s]+\/)?[^@'\s]+)@[^:]*'?:\s*$/.exec(line)
    if (!key) continue
    if (section === 'packages') lockPackageCount++
    const reason = bannedReason(key[1])
    if (reason) problems.push(`lockfile entry   ${key[1]} (${reason}) [pnpm-lock.yaml ${section}]`)
  }
} else {
  warnings.push('pnpm-lock.yaml not found; lockfile scan skipped')
}

// ---------------------------------------------------------------------------
const unique = [...new Set(problems)]
for (const w of new Set(warnings)) console.warn(`warning: ${w}`)

if (unique.length > 0) {
  console.error(`\n✖ verify:no-native found ${unique.length} problem(s):\n`)
  for (const p of unique) console.error(`  - ${p}`)
  console.error('\nSee "Corporate laptop pitfalls" in README.md for how to fix these.')
  process.exit(1)
}

console.log(
  `✔ verify:no-native passed: ${seenPackages.size} installed packages (${packageCount} copies) ` +
    `and ${lockPackageCount} lockfile packages checked; no native binaries or platform packages.`,
)
