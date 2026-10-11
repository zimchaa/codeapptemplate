#!/usr/bin/env node
// Smoke-tests `vite` dev mode for an app: starts the dev server, requests the
// page, a transformed .tsx module and a pre-bundled dependency (which forces
// the esbuild-wasm dependency optimiser to run), then shuts down.
//
// Usage: node scripts/smoke-dev.mjs <app-dir> [port]
// Vite is started with `node <vite.js>` rather than a .cmd/.exe shim, so this
// behaves the same on Windows and Linux.

import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const appDir = resolve(process.argv[2] ?? 'apps/app-template')
const port = Number(process.argv[3] ?? 5199)
const base = `http://localhost:${port}`
const timeoutMs = 60_000

const vitePkgPath = createRequire(resolve(appDir, 'package.json')).resolve('vite/package.json')
const vitePkg = JSON.parse(readFileSync(vitePkgPath, 'utf8'))
const viteBin = join(dirname(vitePkgPath), typeof vitePkg.bin === 'string' ? vitePkg.bin : vitePkg.bin.vite)

const child = spawn(process.execPath, [viteBin, '--port', String(port), '--strictPort'], {
  cwd: appDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, VITE_DATA_MODE: 'mock' },
})
let output = ''
child.stdout.on('data', (d) => (output += d))
child.stderr.on('data', (d) => (output += d))

function fail(message) {
  console.error(`✖ smoke:dev failed: ${message}\n--- vite output ---\n${output}`)
  child.kill()
  process.exit(1)
}

child.on('exit', (code) => {
  if (code !== null && code !== 0) fail(`vite exited early with code ${code}`)
})

async function get(path) {
  const res = await fetch(base + path)
  const body = await res.text()
  if (!res.ok) fail(`GET ${path} returned ${res.status}`)
  return body
}

async function waitForServer() {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(base + '/')
      if (res.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  fail(`dev server did not respond on ${base} within ${timeoutMs / 1000}s`)
}

const started = Date.now()
await waitForServer()

const html = await get('/')
if (!html.includes('<div id="root">')) fail('index.html did not contain #root')

const main = await get('/src/main.tsx')
const reactDep = /from\s+"(\/node_modules\/\.vite\/deps\/react[^"]*)"/.exec(main)?.[1]
if (!reactDep) fail('main.tsx was not transformed / react import was not pre-bundled')

const app = await get('/src/App.tsx')
if (/\btype LoadState\b/.test(app)) fail('App.tsx still contains TypeScript syntax (transform failed)')

const dep = await get(reactDep)
if (dep.length < 100) fail('pre-bundled react dependency looks empty')

console.log(`✔ smoke:dev passed in ${((Date.now() - started) / 1000).toFixed(1)}s (${base})`)
child.kill()
process.exit(0)
