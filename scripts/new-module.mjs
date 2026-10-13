#!/usr/bin/env node
// Scaffolds modules/<id>: a workspace module package with a manifest, a
// Dataverse table definition with sample rows, a list page, a detail page
// (deep-linkable) and a dashboard widget.
//
// Usage: pnpm new-module <id> ["Title"]
//   <id>: lower-case letters/digits, e.g. `assets`. Also the route
//   (#/assets), the capability prefix (assets.read) and the table name
//   (<prefix>_asset).

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [id, titleArg] = process.argv.slice(2)
if (!id || !/^[a-z][a-z0-9]{1,30}$/.test(id)) {
  console.error('Usage: pnpm new-module <id> ["Title"]   (id: lower-case letters/digits, e.g. assets)')
  process.exit(1)
}
const root = resolve(import.meta.dirname, '..')
const dir = join(root, 'modules', id)
if (existsSync(dir)) {
  console.error(`modules/${id} already exists.`)
  process.exit(1)
}

const title = titleArg ?? id[0].toUpperCase() + id.slice(1)
const pascal = id[0].toUpperCase() + id.slice(1)
// Table name: singular of the id (assets -> asset).
const table = id.endsWith('s') && id.length > 3 ? id.slice(0, -1) : id
const record = `${pascal.endsWith('s') ? pascal.slice(0, -1) : pascal}Record`
const tableConst = `${table}Table`
// Random-but-fixed sample ids, so provisioning with --with-samples is idempotent.
const sampleId = (n) => `${crypto.randomUUID().slice(0, 24)}${String(n).padStart(12, '0')}`

const files = {
  'package.json': JSON.stringify(
    {
      name: `@codeapps/module-${id}`,
      version: '0.1.0',
      private: true,
      description: `Workspace module: ${title}.`,
      type: 'module',
      exports: { '.': './src/index.ts', './schema': './src/schema.ts' },
      scripts: { typecheck: 'tsc -p tsconfig.json' },
      dependencies: {
        '@codeapps/platform': 'workspace:*',
        '@codeapps/ui': 'workspace:*',
        'lucide-react': '1.56.0',
        'react-router': '8.4.0',
      },
      peerDependencies: { react: '^19.2.7', 'react-dom': '^19.2.7' },
      devDependencies: { '@types/react': '19.3.0', react: '19.3.0', typescript: '5.9.3' },
    },
    null,
    2,
  ) + '\n',

  'tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
`,

  'src/caps.ts': `export const caps = { read: '${id}.read', manage: '${id}.manage' } as const
`,

  'src/schema.ts': `// React-free: also imported by the provisioning script (pnpm dataverse:provision).
import { defineTable, type BaseRecord } from '@codeapps/platform/schema'

export interface ${record} extends BaseRecord {
  name: string
  description?: string
  active: boolean
}

export const ${tableConst} = defineTable<${record}>({
  name: '${table}',
  displayName: '${title} item',
  displayCollectionName: '${title} items',
  description: '${title} module data.',
  ownership: 'user',
  primaryField: 'name',
  fields: {
    name: { name: 'name', type: 'text', displayName: 'Name', required: true, maxLength: 200 },
    description: { name: 'description', type: 'multiline', displayName: 'Description', maxLength: 4000 },
    active: { name: 'active', type: 'boolean', displayName: 'Active', defaultValue: true },
  },
  samples: [
    { id: '${sampleId(1)}', name: 'First ${title.toLowerCase()} item', description: 'Sample data for offline development.', active: true },
    { id: '${sampleId(2)}', name: 'Second ${title.toLowerCase()} item', active: false },
  ],
})
`,

  'src/index.ts': `import { defineModule } from '@codeapps/platform'
import { Boxes } from 'lucide-react'
import { lazy } from 'react'
import { caps } from './caps.ts'
import { ${tableConst} } from './schema.ts'

export * from './schema.ts'

export const ${id}Module = defineModule({
  id: '${id}',
  title: '${title}',
  description: 'TODO: one line about what ${title} is for.',
  icon: Boxes,
  basePath: '${id}',
  group: 'apps',
  order: 100,
  access: caps.read,
  capabilities: [
    { id: caps.read, label: 'View ${title.toLowerCase()}' },
    { id: caps.manage, label: 'Manage ${title.toLowerCase()}' },
  ],
  tables: [${tableConst}],
  routes: [
    { index: true, lazy: async () => ({ Component: (await import('./pages/ListPage.tsx')).ListPage }) },
    { path: ':id', lazy: async () => ({ Component: (await import('./pages/DetailPage.tsx')).DetailPage }) },
  ],
  widgets: [
    {
      id: 'summary',
      title: '${title}',
      component: lazy(() => import('./widgets/Summary.tsx').then((m) => ({ default: m.SummaryWidget }))),
    },
  ],
  // ?page=${table}&id=<guid>  ->  #/${id}/<guid>
  deepLink: (params) => params.id,
})
`,

  'src/pages/ListPage.tsx': `import { Can, DataError, useData, useTable, useWorkspace } from '@codeapps/platform'
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton, Table, TBody, TD, TH, THead, timeAgo, TR } from '@codeapps/ui'
import { Boxes, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { caps } from '../caps.ts'
import { ${tableConst} } from '../schema.ts'

export function ListPage() {
  const { audit } = useWorkspace()
  const table = useTable(${tableConst})
  const { data, error, loading, reload } = useData(() => table.list({ orderBy: { field: 'modifiedOn', direction: 'desc' } }), [])

  const add = async () => {
    const name = window.prompt('Name')?.trim()
    if (!name) return
    const created = await table.create({ name, active: true })
    await audit({ action: '${table}.created', module: '${id}', entity: '${table}', recordId: created.id })
    reload()
  }

  return (
    <>
      <PageHeader
        title="${title}"
        description="TODO: describe this module."
        actions={<Can capability={caps.manage}><Button onClick={add}><Plus /> New</Button></Can>}
      />
      {error ? (
        <DataError error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-40" />
      ) : !data?.length ? (
        <Card><EmptyState icon={<Boxes />} title="Nothing here yet" /></Card>
      ) : (
        <Card>
          <Table>
            <THead><tr><TH>Name</TH><TH>Status</TH><TH>Updated</TH></tr></THead>
            <TBody>
              {data.map((item) => (
                <TR key={item.id}>
                  <TD><Link to={item.id} className="font-semibold hover:text-primary hover:underline">{item.name}</Link></TD>
                  <TD><Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Active' : 'Inactive'}</Badge></TD>
                  <TD className="text-muted">{timeAgo(item.modifiedOn)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  )
}
`,

  'src/pages/DetailPage.tsx': `import { DataError, NotFound, ShareMenu, useData, useTable } from '@codeapps/platform'
import { Card, CardContent, PageHeader, Skeleton } from '@codeapps/ui'
import { Link, useParams } from 'react-router'
import { ${tableConst} } from '../schema.ts'

export function DetailPage() {
  const { id = '' } = useParams()
  const table = useTable(${tableConst})
  const { data, error, loading, reload } = useData(() => table.get(id), [id])
  if (error) return <DataError error={error} onRetry={reload} />
  if (loading && !data) return <Skeleton className="h-40" />
  if (!data) return <NotFound />
  return (
    <>
      <PageHeader
        eyebrow={<Link to=".." className="hover:underline">${title}</Link>}
        title={data.name}
        actions={<ShareMenu path={\`/${id}/\${data.id}\`} title={data.name} />}
      />
      <Card>
        <CardContent className="pt-5">
          <p className="whitespace-pre-wrap text-sm">{data.description || 'No description.'}</p>
        </CardContent>
      </Card>
    </>
  )
}
`,

  'src/widgets/Summary.tsx': `import { DataError, useData, useTable } from '@codeapps/platform'
import { Skeleton, Stat } from '@codeapps/ui'
import { ${tableConst} } from '../schema.ts'

export function SummaryWidget() {
  const table = useTable(${tableConst})
  const { data, error } = useData(() => table.list({ where: { active: true } }), [])
  if (error) return <DataError error={error} />
  if (!data) return <Skeleton className="h-16" />
  return <Stat label="Active items" value={data.length} />
}
`,
}

for (const [file, content] of Object.entries(files)) {
  const path = join(dir, file)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content)
}

console.log(`✔ Created modules/${id} (@codeapps/module-${id})

Register it in an app (e.g. apps/workspace):
  1. package.json  ->  "@codeapps/module-${id}": "workspace:*"
  2. src/modules.ts ->  import { ${id}Module } from '@codeapps/module-${id}'   and add it to \`modules\`
  3. src/workspace.schema.ts -> import { ${tableConst} } from '@codeapps/module-${id}/schema'   and add it to \`tables\`
  4. pnpm install && pnpm --filter @codeapps/workspace test && pnpm dev

Then give a role the new capabilities (${id}.read, ${id}.manage) in Admin -> Roles,
and for Dataverse: pnpm dataverse:provision ... && pa app add data-source --connector dataverse --table <prefix>_${table}
`)
