// Run with: node --test scripts/
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createNaming } from '../../packages/platform/src/schema/naming.ts'
import { tables } from '../../apps/workspace/src/workspace.schema.ts'
import { attributeMetadata, entityMetadata, relationshipMetadata, validateSchema } from './metadata.mjs'

const naming = createNaming('spg')
const opts = { languageCode: 1033, optionValuePrefix: 10000 }

test('the workspace schema is valid', () => {
  assert.deepEqual(validateSchema(tables, naming), [])
})

test('entity metadata uses lower-case schema names and the primary column', () => {
  const request = tables.find((t) => t.name === 'request')
  const body = entityMetadata(request, naming, opts)
  assert.equal(body.SchemaName, 'spg_request')
  assert.equal(body.PrimaryNameAttribute, 'spg_name')
  assert.equal(body.OwnershipType, 'UserOwned')
  assert.equal(body.Attributes[0].IsPrimaryName, true)
  assert.equal(body.Attributes[0].MaxLength, 200)
})

test('choice options use the publisher option value prefix', () => {
  const request = tables.find((t) => t.name === 'request')
  const body = attributeMetadata(request.fields.status, naming, { languageCode: 1033, optionValuePrefix: 73031 })
  assert.deepEqual(body.OptionSet.Options.map((o) => o.Value), [730310000, 730310001, 730310002, 730310003, 730310004])
})

test('lookups become one-to-many relationships with cascade for required lookups', () => {
  const comment = tables.find((t) => t.name === 'requestcomment')
  const body = relationshipMetadata(comment, comment.fields.requestId, naming, opts)
  assert.equal(body.ReferencedEntity, 'spg_request')
  assert.equal(body.ReferencingEntity, 'spg_requestcomment')
  assert.equal(body.Lookup.SchemaName, 'spg_request')
  assert.equal(body.CascadeConfiguration.Delete, 'Cascade')
})

test('validateSchema catches common mistakes', () => {
  const broken = [
    {
      name: 'thing',
      displayName: 'Thing',
      displayCollectionName: 'Things',
      description: '',
      ownership: 'organization',
      primaryField: 'title',
      fields: {
        title: { name: 'name', type: 'integer', displayName: 'Title' },
        other: { name: 'Bad-Name', type: 'lookup', target: 'missing', displayName: 'Other' },
      },
    },
  ]
  const problems = validateSchema(broken, naming)
  assert.ok(problems.some((p) => p.includes('primary field must be type text')))
  assert.ok(problems.some((p) => p.includes('lookup target "missing"')))
  assert.ok(problems.some((p) => p.includes('lower-case')))
})
