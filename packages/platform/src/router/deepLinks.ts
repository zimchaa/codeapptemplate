import type { WorkspaceModule } from '../modules/types.ts'

/**
 * Deep links.
 *
 * Power Apps passes the query string of the app URL to the code app via
 * getContext().app.queryParams. Supported forms:
 *
 *   ?route=/requests/123              any in-app path (preferred)
 *   ?page=requests&id=123             module id (or basePath) + module-specific params
 *   ?page=request&id=123              module ids also match singular aliases (page minus trailing "s")
 *
 * The app URL itself is
 *   https://apps.powerapps.com/play/e/<environmentId>/app/<appId>?route=...
 * which works from email, Teams chats/channels, SharePoint, etc.
 */
export function resolveDeepLink(params: Record<string, string>, modules: readonly WorkspaceModule[]): string | undefined {
  const lower: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) lower[k.toLowerCase()] = v

  const route = lower.route ?? lower.path
  if (route) {
    const path = route.startsWith('/') ? route : `/${route}`
    // Only in-app paths: no protocol-relative or absolute URLs.
    return /^\/(?!\/)[\w\-./~%]*$/.test(path) ? path : undefined
  }

  const page = (lower.page ?? lower.module)?.trim().toLowerCase()
  if (!page) return undefined
  const module = modules.find((m) => {
    const names = [m.id, m.basePath].map((n) => n.toLowerCase())
    return names.includes(page) || names.includes(`${page}s`)
  })
  if (!module) return undefined
  const sub = module.deepLink?.(lower)
  const clean = sub ? sub.replace(/^\/+/, '') : ''
  return `/${module.basePath}${clean ? `/${clean.split('/').map(encodeURIComponent).join('/')}` : ''}`
}

export interface DeepLinkContext {
  /** Explicit published app URL (setting app.playUrl), if configured. */
  playUrl?: string
  playBaseUrl?: string
  environmentId?: string
  appId?: string
  /** Fallback for local/offline dev: the page's own URL. */
  localUrl?: string
}

/** Build a shareable URL that opens the app at `path`. */
export function buildDeepLink(path: string, ctx: DeepLinkContext): string {
  const route = `route=${encodeURIComponent(path)}`
  if (ctx.playUrl) return `${ctx.playUrl}${ctx.playUrl.includes('?') ? '&' : '?'}${route}`
  if (ctx.environmentId && ctx.appId && ctx.appId !== 'local') {
    const base = (ctx.playBaseUrl || 'https://apps.powerapps.com').replace(/\/+$/, '')
    return `${base}/play/e/${ctx.environmentId}/app/${ctx.appId}?${route}`
  }
  const local = (ctx.localUrl ?? '').split('#')[0].split('?')[0]
  return `${local}?${route}`
}

/** mailto: link with a subject and the deep link in the body. */
export function emailLink(url: string, subject: string, intro = ''): string {
  const body = `${intro ? `${intro}\n\n` : ''}${url}`
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** "Share to Teams" web link (opens Teams' share dialog for a URL). */
export function teamsShareLink(url: string, message = ''): string {
  return `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&msgText=${encodeURIComponent(message)}`
}

/** Start a Teams chat with users, pre-filled with a message. */
export function teamsChatLink(upns: readonly string[], message: string): string {
  return `https://teams.microsoft.com/l/chat/0/0?users=${upns.map(encodeURIComponent).join(',')}&message=${encodeURIComponent(message)}`
}
