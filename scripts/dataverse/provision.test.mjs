// End-to-end test of provision.mjs against an in-memory fake of the
// Dataverse Web API. It checks the script's request flow and idempotency,
// NOT real Dataverse behaviour (that needs an environment).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { after, before, test } from 'node:test'

const script = resolve(import.meta.dirname, 'provision.mjs')

function fakeDataverse() {
  const state = { publishers: [], solutions: [], entities: new Map(), relationships: new Map(), rows: new Map(), published: 0, log: [] }
  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(body === undefined ? '' : JSON.stringify(body))
  }
  const server = createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : undefined
    const path = decodeURIComponent(req.url.replace('/api/data/v9.2/', ''))
    const [route, query = ''] = path.split('?')
    state.log.push(`${req.method} ${route}`)
    if (req.headers.authorization !== 'Bearer test-token') return send(res, 401, { error: { message: 'no token' } })
    let m
    if (route === 'WhoAmI') return send(res, 200, { UserId: 'u1', OrganizationId: 'o1' })
    if (route === 'solutions' && req.method === 'GET') {
      const name = /uniquename eq '([^']+)'/.exec(query)[1]
      return send(res, 200, { value: state.solutions.filter((s) => s.uniquename === name).map((s) => ({ ...s, publisherid: state.publishers.find((p) => p.publisherid === s.publisher) })) })
    }
    if (route === 'publishers' && req.method === 'GET') {
      const prefix = /customizationprefix eq '([^']+)'/.exec(query)[1]
      return send(res, 200, { value: state.publishers.filter((p) => p.customizationprefix === prefix) })
    }
    if (route === 'publishers' && req.method === 'POST') {
      const pub = { ...body, publisherid: `pub-${state.publishers.length + 1}` }
      state.publishers.push(pub)
      return send(res, 201, pub)
    }
    if (route === 'solutions' && req.method === 'POST') {
      state.solutions.push({ uniquename: body.uniquename, publisher: /\(([^)]+)\)/.exec(body['publisherid@odata.bind'])[1] })
      return send(res, 204)
    }
    if (route === 'EntityDefinitions' && req.method === 'POST') {
      assert.equal(req.headers['mscrm.solutionuniquename'], 'WorkspaceApp')
      state.entities.set(body.SchemaName, { attributes: new Set([body.Attributes[0].SchemaName]) })
      return send(res, 204)
    }
    if ((m = /^EntityDefinitions\(LogicalName='([^']+)'\)$/.exec(route))) {
      return state.entities.has(m[1]) ? send(res, 200, { LogicalName: m[1], EntitySetName: `${m[1]}s` }) : send(res, 404, { error: { message: 'not found' } })
    }
    if ((m = /^EntityDefinitions\(LogicalName='([^']+)'\)\/Attributes\(LogicalName='([^']+)'\)$/.exec(route))) {
      return state.entities.get(m[1])?.attributes.has(m[2]) ? send(res, 200, {}) : send(res, 404, { error: { message: 'not found' } })
    }
    if ((m = /^EntityDefinitions\(LogicalName='([^']+)'\)\/Attributes$/.exec(route))) {
      state.entities.get(m[1]).attributes.add(body.SchemaName)
      return send(res, 204)
    }
    if ((m = /^RelationshipDefinitions\(SchemaName='([^']+)'\)$/.exec(route))) {
      return state.relationships.has(m[1]) ? send(res, 200, {}) : send(res, 404, { error: { message: 'not found' } })
    }
    if (route === 'RelationshipDefinitions') {
      state.relationships.set(body.SchemaName, body)
      state.entities.get(body.ReferencingEntity).attributes.add(body.Lookup.SchemaName)
      return send(res, 204)
    }
    if ((m = /\/ManyToOneRelationships\(SchemaName='([^']+)'\)$/.exec(route))) {
      return send(res, 200, { ReferencingEntityNavigationPropertyName: state.relationships.get(m[1]).Lookup.SchemaName })
    }
    if (route === 'PublishXml') {
      state.published++
      return send(res, 204)
    }
    if ((m = /^(\w+)\(([0-9a-f-]{36})\)$/.exec(route)) && req.method === 'PATCH') {
      const key = `${m[1]}/${m[2]}`
      const exists = state.rows.has(key)
      if (req.headers['if-none-match'] === '*' && exists) return send(res, 412, { error: { message: 'exists' } })
      if (req.headers['if-match'] === '*' && !exists) return send(res, 404, { error: { message: 'missing' } })
      state.rows.set(key, { ...state.rows.get(key), ...body })
      return send(res, 204)
    }
    if ((m = /^(\w+)$/.exec(route)) && req.method === 'GET') {
      const upn = /eq '([^']+)'/.exec(query)?.[1]
      return send(res, 200, { value: [...state.rows].filter(([k, r]) => k.startsWith(`${m[1]}/`) && r.spg_userupn === upn).map(([, r]) => r) })
    }
    if ((m = /^(\w+)$/.exec(route)) && req.method === 'POST') {
      state.rows.set(`${m[1]}/${crypto.randomUUID()}`, body)
      return send(res, 204)
    }
    send(res, 500, { error: { message: `fake: unhandled ${req.method} ${route}` } })
  })
  return { server, state }
}

function run(url, extra = []) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script, '--url', url, '--admin', 'Owner@Company.example', ...extra], {
      env: { ...process.env, DATAVERSE_TOKEN: 'test-token' },
    })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    child.on('close', (code) => resolveRun({ code, out }))
  })
}

let fake
let url
before(async () => {
  fake = fakeDataverse()
  await new Promise((r) => fake.server.listen(0, 'localhost', r))
  url = `http://localhost:${fake.server.address().port}`
})
after(() => fake.server.close())

test('first run creates everything and seeds', async () => {
  const { code, out } = await run(url, ['--with-samples'])
  assert.equal(code, 0, out)
  const { state } = fake
  assert.equal(state.publishers[0].customizationprefix, 'spg')
  assert.equal(state.entities.size, 9)
  assert.ok(state.entities.get('spg_request').attributes.has('spg_status'))
  assert.ok(state.relationships.has('spg_request_requestcomment_request'))
  assert.equal(state.published, 1)
  // Roles seeded, fictional sample assignments NOT provisioned, admin assigned.
  const assignments = [...state.rows].filter(([k]) => k.startsWith('spg_roleassignments/'))
  assert.equal(assignments.length, 1)
  assert.equal(assignments[0][1].spg_userupn, 'owner@company.example')
  assert.equal(assignments[0][1]['spg_role@odata.bind'], '/spg_approles(5b1d0c1e-0000-4000-8000-000000000001)')
  // Choice values use the publisher's option prefix.
  const prefix = state.publishers[0].customizationoptionvalueprefix
  const request = state.rows.get('spg_requests/7e9a1c00-0000-4000-8000-000000000001')
  assert.equal(request.spg_status, prefix * 10000 + 1)
  assert.equal(state.rows.get('spg_appsettings/5b1d0c1e-0000-4000-8000-000000000206').spg_value, String(prefix))
  assert.match(out, /all entity sets and lookups match/)
})

test('second run changes nothing and keeps admin edits', async () => {
  const { state } = fake
  state.rows.get('spg_appsettings/5b1d0c1e-0000-4000-8000-000000000201').spg_value = 'Edited by an admin'
  state.log.length = 0
  const { code, out } = await run(url, ['--with-samples'])
  assert.equal(code, 0, out)
  assert.ok(!state.log.some((l) => l.startsWith('POST EntityDefinitions') || l.startsWith('POST RelationshipDefinitions') || l === 'POST PublishXml'))
  assert.equal(state.rows.get('spg_appsettings/5b1d0c1e-0000-4000-8000-000000000201').spg_value, 'Edited by an admin')
  assert.match(out, /already an Administrator/)
})
