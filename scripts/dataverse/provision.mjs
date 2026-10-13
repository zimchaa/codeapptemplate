#!/usr/bin/env node
// Creates (idempotently) the Dataverse tables, columns, choices and lookups
// for a workspace app inside a solution, then seeds the rows the app needs.
// Pure Node + fetch: no pac, no az, no native modules.
//
//   pnpm dataverse:provision --url https://<org>.crm.dynamics.com --admin you@company.com
//   pnpm dataverse:plan                       (dry run: validate + print the plan, no sign-in)
//
// Run with --help for all options. See apps/workspace/README.md.

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { toRow } from '../../packages/platform/src/data/odata.ts'
import { createNaming } from '../../packages/platform/src/schema/naming.ts'
import { roleIds, settingKeys } from '../../packages/platform/src/schema/platform-tables.ts'
import { getToken } from './auth.mjs'
import { attributeMetadata, entityMetadata, relationshipMetadata, relationshipSchemaName, validateSchema } from './metadata.mjs'
import { createWebApi, WebApiError } from './webapi.mjs'

const root = resolve(import.meta.dirname, '../..')
const env = process.env

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: env.DATAVERSE_URL },
    prefix: { type: 'string', default: env.DATAVERSE_PREFIX || 'spg' },
    solution: { type: 'string', default: env.DATAVERSE_SOLUTION || 'WorkspaceApp' },
    admin: { type: 'string', default: env.WORKSPACE_ADMIN_UPN },
    schema: { type: 'string', default: 'apps/workspace/src/workspace.schema.ts' },
    language: { type: 'string', default: env.DATAVERSE_LANGUAGE || '1033' },
    'with-samples': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
})

if (args.help) {
  console.log(`Usage: pnpm dataverse:provision --url <environment url> [options]

  --url <url>          Environment URL, e.g. https://contoso.crm4.dynamics.com   (env DATAVERSE_URL)
  --prefix <p>         Publisher prefix for tables/columns (default spg)        (env DATAVERSE_PREFIX)
  --solution <name>    Solution unique name to add components to (default WorkspaceApp; created if missing)
  --admin <upn>        Give this user the Administrator role                    (env WORKSPACE_ADMIN_UPN)
  --with-samples       Also create the demo requests / news / links
  --schema <file>      Schema module exporting \`tables\` (default apps/workspace/src/workspace.schema.ts)
  --language <lcid>    Label language code (default 1033)
  --dry-run            Validate and print the plan; no sign-in, no changes
  --verbose            Log every Web API call

Auth (first match wins): DATAVERSE_TOKEN | DATAVERSE_CLIENT_ID + DATAVERSE_CLIENT_SECRET + DATAVERSE_TENANT_ID | device code sign-in`)
  process.exit(0)
}

const log = (...m) => console.log(...m)
const step = (m) => console.log(`\n▸ ${m}`)
const fail = (m) => {
  console.error(`\n✖ ${m}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 1. Load + validate the schema (Node strips the TypeScript types itself).
// ---------------------------------------------------------------------------
const schemaPath = resolve(root, args.schema)
if (!existsSync(schemaPath)) fail(`Schema file not found: ${schemaPath}`)
const { tables } = await import(pathToFileURL(schemaPath).href)
if (!Array.isArray(tables)) fail(`${args.schema} must export \`tables\``)

let naming
try {
  naming = createNaming(args.prefix)
} catch (error) {
  fail(error.message)
}
const languageCode = Number(args.language)
const problems = validateSchema(tables, naming)
if (problems.length) fail(`Schema problems:\n  - ${problems.join('\n  - ')}`)

const seedRows = (t) => [
  ...(t.seed ?? []),
  // Sample role assignments are fictional contoso.example users: never provision them.
  ...(args['with-samples'] && t.name !== 'roleassignment' ? (t.samples ?? []) : []),
]

step(`Plan (prefix ${naming.prefix}_, solution ${args.solution})`)
for (const t of tables) {
  const cols = Object.values(t.fields)
  const lookups = cols.filter((c) => c.type === 'lookup').map((c) => `${naming.column(c)} → ${naming.table(c.target)}`)
  log(`  ${naming.table(t).padEnd(28)} ${String(cols.length).padStart(2)} columns  ${String(seedRows(t).length).padStart(2)} rows${lookups.length ? `  lookups: ${lookups.join(', ')}` : ''}`)
}

if (args['dry-run']) {
  if (args.verbose) {
    for (const t of tables) log(JSON.stringify(entityMetadata(t, naming, { languageCode }), null, 2))
  }
  log('\n✔ Dry run OK: schema is valid. Nothing was changed.')
  process.exit(0)
}

// http://localhost is accepted only so the test suite can use a fake Web API.
if (!args.url || !/^(https:\/\/[^/]+|http:\/\/localhost(:\d+)?)$/.test(args.url.replace(/\/+$/, ''))) {
  fail('Pass the environment URL: --url https://<org>.crm.dynamics.com (Power Platform admin center → environment → Environment URL)')
}
const url = args.url.replace(/\/+$/, '')

// ---------------------------------------------------------------------------
// 2. Sign in and check who we are.
// ---------------------------------------------------------------------------
step(`Signing in to ${url}`)
const token = await getToken({ resource: url })
const api = createWebApi({ url, token, solution: args.solution, verbose: args.verbose })
const who = await api.get('WhoAmI')
log(`  signed in (user id ${who.UserId}, organization ${who.OrganizationId})`)

// ---------------------------------------------------------------------------
// 3. Publisher + solution.
// ---------------------------------------------------------------------------
step('Solution and publisher')
const pubSelect = '$select=publisherid,uniquename,customizationprefix,customizationoptionvalueprefix'
let solution = (
  await api.get(`solutions?$filter=uniquename eq '${args.solution}'&$select=solutionid,uniquename&$expand=publisherid(${pubSelect})`)
).value[0]
let publisher = solution?.publisherid

if (solution) {
  if (publisher.customizationprefix !== naming.prefix) {
    fail(`Solution ${args.solution} belongs to publisher "${publisher.uniquename}" with prefix "${publisher.customizationprefix}", not "${naming.prefix}". Use --prefix ${publisher.customizationprefix} or another --solution.`)
  }
  log(`  using solution ${args.solution} (publisher ${publisher.uniquename})`)
} else {
  publisher = (await api.get(`publishers?$filter=customizationprefix eq '${naming.prefix}'&${pubSelect}`)).value[0]
  if (!publisher) {
    // Deterministic option value prefix in 10000-99999 derived from the prefix.
    const optionPrefix = 10000 + ([...naming.prefix].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 90000, 7))
    const created = await api.post(
      'publishers',
      {
        uniquename: `${naming.prefix}workspacepublisher`,
        friendlyname: 'Workspace publisher',
        customizationprefix: naming.prefix,
        customizationoptionvalueprefix: optionPrefix,
      },
      { headers: { Prefer: 'return=representation' } },
    )
    publisher = created.json
    log(`  created publisher ${publisher.uniquename} (prefix ${naming.prefix}, option prefix ${optionPrefix})`)
  } else {
    log(`  using existing publisher ${publisher.uniquename}`)
  }
  await api.post('solutions', {
    uniquename: args.solution,
    friendlyname: args.solution,
    version: '1.0.0.0',
    'publisherid@odata.bind': `/publishers(${publisher.publisherid})`,
  })
  log(`  created solution ${args.solution}`)
}
const optionValuePrefix = publisher.customizationoptionvalueprefix
log(`  choice values start at ${optionValuePrefix * 10000}`)

// ---------------------------------------------------------------------------
// 4. Tables, then columns, then lookups (targets must exist first).
// ---------------------------------------------------------------------------
const meta = { languageCode, optionValuePrefix }
const changed = new Set()

step('Tables')
for (const t of tables) {
  const logical = naming.table(t)
  const existing = await api.tryGet(`EntityDefinitions(LogicalName='${logical}')?$select=LogicalName`)
  if (existing) {
    log(`  ✓ ${logical} exists`)
    continue
  }
  log(`  + ${logical} (this can take a minute)`)
  await api.post('EntityDefinitions', entityMetadata(t, naming, meta), { solutionAware: true })
  changed.add(logical)
}

step('Columns')
for (const t of tables) {
  const logical = naming.table(t)
  for (const [field, col] of Object.entries(t.fields)) {
    if (field === t.primaryField || col.type === 'lookup') continue
    const column = naming.column(col)
    if (await api.tryGet(`EntityDefinitions(LogicalName='${logical}')/Attributes(LogicalName='${column}')?$select=LogicalName`)) continue
    log(`  + ${logical}.${column} (${col.type})`)
    await api.post(`EntityDefinitions(LogicalName='${logical}')/Attributes`, attributeMetadata(col, naming, meta), { solutionAware: true })
    changed.add(logical)
  }
}

step('Lookups')
for (const t of tables) {
  for (const col of Object.values(t.fields)) {
    if (col.type !== 'lookup') continue
    const name = relationshipSchemaName(t, col, naming)
    if (await api.tryGet(`RelationshipDefinitions(SchemaName='${name}')?$select=SchemaName`)) continue
    log(`  + ${naming.table(t)}.${naming.column(col)} → ${naming.table(col.target)}`)
    await api.post('RelationshipDefinitions', relationshipMetadata(t, col, naming, meta), { solutionAware: true })
    changed.add(naming.table(t))
  }
}

if (changed.size) {
  step(`Publishing ${changed.size} table(s)`)
  const entities = [...changed].map((e) => `<entity>${e}</entity>`).join('')
  await api.post('PublishXml', { ParameterXml: `<importexportxml><entities>${entities}</entities></importexportxml>` })
  log('  published')
}

// The app builds entity-set names and lookup navigation properties from the
// prefix; check Dataverse agrees.
step('Verifying names the app relies on')
let mismatches = 0
for (const t of tables) {
  const logical = naming.table(t)
  const def = await api.get(`EntityDefinitions(LogicalName='${logical}')?$select=EntitySetName`)
  if (def.EntitySetName !== naming.entitySet(t)) {
    mismatches++
    log(`  ⚠ ${logical}: entity set is "${def.EntitySetName}", app expects "${naming.entitySet(t)}"`)
  }
  for (const col of Object.values(t.fields)) {
    if (col.type !== 'lookup') continue
    const rel = await api.get(
      `EntityDefinitions(LogicalName='${logical}')/ManyToOneRelationships(SchemaName='${relationshipSchemaName(t, col, naming)}')?$select=ReferencingEntityNavigationPropertyName`,
    )
    if (rel.ReferencingEntityNavigationPropertyName !== naming.navigationProperty(col)) {
      mismatches++
      log(`  ⚠ ${logical}.${naming.column(col)}: navigation property is "${rel.ReferencingEntityNavigationPropertyName}", app expects "${naming.navigationProperty(col)}"`)
    }
  }
}
log(mismatches ? `  ${mismatches} mismatch(es): see docs/workspace/dataverse.md#troubleshooting` : '  ✓ all entity sets and lookups match')

// ---------------------------------------------------------------------------
// 5. Seed rows. Create-only (If-None-Match: *), so re-running never
//    overwrites changes admins made in the app.
// ---------------------------------------------------------------------------
step(`Seeding${args['with-samples'] ? ' (with samples)' : ''}`)
for (const t of tables) {
  const rows = seedRows(t)
  if (!rows.length) continue
  let created = 0
  let kept = 0
  for (const { id, ...values } of rows) {
    const facts = t.name === 'appsetting' && values.key === settingKeys.choicePrefix
    if (facts) values.value = String(optionValuePrefix)
    const body = toRow(t, naming, values, optionValuePrefix)
    const path = `${naming.entitySet(t)}(${id})`
    try {
      await api.patch(path, body, { headers: { 'If-None-Match': '*' } })
      created++
    } catch (error) {
      if (!(error instanceof WebApiError && error.status === 412)) throw error
      kept++
      // The option value prefix is a fact about the environment: always correct it.
      if (facts) await api.patch(path, body, { headers: { 'If-Match': '*' } })
    }
  }
  log(`  ${naming.table(t).padEnd(28)} ${created} created, ${kept} already present`)
}

if (args.admin) {
  const upn = args.admin.trim().toLowerCase()
  const assignments = tables.find((t) => t.name === 'roleassignment')
  const set = naming.entitySet(assignments)
  const userCol = naming.column(assignments.fields.userUpn)
  const roleCol = naming.lookupValue(assignments.fields.roleId)
  const existing = await api.get(`${set}?$select=${naming.primaryId(assignments)}&$filter=${userCol} eq '${upn.replace(/'/g, "''")}' and ${roleCol} eq ${roleIds.admin}`)
  if (existing.value.length) {
    log(`  ${upn} is already an Administrator`)
  } else {
    await api.post(set, toRow(assignments, naming, { name: `${upn}: Administrator`, userUpn: upn, roleId: roleIds.admin }, optionValuePrefix))
    log(`  ${upn} is now an Administrator`)
  }
} else {
  log('  (no --admin given: assign the Administrator role later in the app or the table)')
}

// ---------------------------------------------------------------------------
step('Done. Next, from apps/workspace:')
log(`
  pa app init --display-name "Workspace" --environment-id <environment-id>   # if not done yet
${tables.map((t) => `  pa app add data-source --connector dataverse --table ${naming.table(t)}`).join('\n')}
${naming.prefix !== 'spg' ? `\n  echo VITE_DATAVERSE_PREFIX=${naming.prefix} >> .env.local\n` : ''}
  pnpm dev:powerapps        # open the Local Play URL it prints
`)
