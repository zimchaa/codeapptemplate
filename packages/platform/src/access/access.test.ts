import { describe, expect, it } from 'vitest'
import { roleIds, roleTable, roleAssignmentTable } from '../schema/platform-tables.ts'
import { capabilityMatches, hasCapability, parseCapabilities } from './capabilities.ts'
import { resolveAccess } from './resolve.ts'

describe('capabilityMatches', () => {
  it.each([
    ['*', 'requests.read', true],
    ['requests.*', 'requests.read', true],
    ['requests.*', 'requests.comments.write', true],
    ['requests.*', 'requestsx.read', false],
    ['requests.read', 'requests.read', true],
    ['Requests.Read', 'requests.read', true],
    ['requests.read', 'requests.manage', false],
    ['', 'requests.read', false],
    ['admin.*', 'admin', false],
  ])('%s covers %s -> %s', (granted, required, expected) => {
    expect(capabilityMatches(granted, required)).toBe(expected)
  })

  it('treats an undefined requirement as allowed', () => {
    expect(hasCapability([], undefined)).toBe(true)
    expect(hasCapability([], 'x.read')).toBe(false)
  })
})

describe('parseCapabilities', () => {
  it('splits lines and commas, ignores blanks and comments', () => {
    expect(parseCapabilities('requests.read\n\n # note\nlinks.*, announcements.read # inline')).toEqual([
      'requests.read',
      'links.*',
      'announcements.read',
    ])
  })
})

describe('resolveAccess', () => {
  const roles = [...roleTable.seed!]
  const assignments = [...roleAssignmentTable.samples!]

  it('combines explicit assignments (case-insensitive UPN) with the default role', () => {
    const access = resolveAccess('MAX@contoso.example', roles, assignments, 'member')
    expect(access.roles.map((r) => r.key).sort()).toEqual(['manager', 'member'])
    expect(access.capabilities).toContain('requests.*')
    expect(access.capabilities).toContain('requests.create')
  })

  it('gives only the default role to unassigned users', () => {
    const access = resolveAccess('nobody@contoso.example', roles, assignments, 'member')
    expect(access.roles.map((r) => r.id)).toEqual([roleIds.member])
  })

  it('gives nothing without assignments or default role', () => {
    expect(resolveAccess('nobody@contoso.example', roles, assignments, undefined).capabilities).toEqual([])
  })
})
