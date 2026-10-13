import { describe, expect, it } from 'vitest'
import type { WorkspaceModule } from '../modules/types.ts'
import { buildDeepLink, emailLink, resolveDeepLink, teamsChatLink } from './deepLinks.ts'

const modules = [
  { id: 'requests', basePath: 'requests', deepLink: (p: Record<string, string>) => p.id },
  { id: 'announcements', basePath: 'news' },
] as unknown as WorkspaceModule[]

describe('resolveDeepLink', () => {
  it('accepts ?route= paths', () => {
    expect(resolveDeepLink({ route: '/requests/42' }, modules)).toBe('/requests/42')
    expect(resolveDeepLink({ Route: 'requests/42' }, modules)).toBe('/requests/42')
  })

  it('rejects absolute or protocol-relative URLs', () => {
    expect(resolveDeepLink({ route: '//evil.example/x' }, modules)).toBeUndefined()
    expect(resolveDeepLink({ route: 'https://evil.example' }, modules)).toBeUndefined()
  })

  it('maps ?page=&id= through the module, including singular aliases and basePath', () => {
    expect(resolveDeepLink({ page: 'request', id: 'abc' }, modules)).toBe('/requests/abc')
    expect(resolveDeepLink({ page: 'requests' }, modules)).toBe('/requests')
    expect(resolveDeepLink({ module: 'news' }, modules)).toBe('/news')
    expect(resolveDeepLink({ page: 'announcement' }, modules)).toBe('/news')
  })

  it('encodes ids and ignores unknown pages', () => {
    expect(resolveDeepLink({ page: 'requests', id: 'a b' }, modules)).toBe('/requests/a%20b')
    expect(resolveDeepLink({ page: 'nope' }, modules)).toBeUndefined()
    expect(resolveDeepLink({}, modules)).toBeUndefined()
  })
})

describe('buildDeepLink', () => {
  it('prefers the configured published URL', () => {
    expect(buildDeepLink('/requests/1', { playUrl: 'https://apps.powerapps.com/play/e/env/app/app1' })).toBe(
      'https://apps.powerapps.com/play/e/env/app/app1?route=%2Frequests%2F1',
    )
  })

  it('builds from host context, but not for Local Play (appId "local")', () => {
    expect(buildDeepLink('/x', { environmentId: 'env', appId: 'app1', playBaseUrl: 'https://apps.gov.powerapps.us/' })).toBe(
      'https://apps.gov.powerapps.us/play/e/env/app/app1?route=%2Fx',
    )
    expect(buildDeepLink('/x', { environmentId: 'env', appId: 'local', localUrl: 'http://localhost:5173/?a=1#/y' })).toBe(
      'http://localhost:5173/?route=%2Fx',
    )
  })

  it('builds email and Teams links', () => {
    expect(emailLink('https://x', 'Hi & bye')).toBe('mailto:?subject=Hi%20%26%20bye&body=https%3A%2F%2Fx')
    expect(teamsChatLink(['a@b.c'], 'hello')).toBe('https://teams.microsoft.com/l/chat/0/0?users=a%40b.c&message=hello')
  })
})
