// Minimal Dataverse Web API client on top of fetch.

export class WebApiError extends Error {
  constructor(status, message, body) {
    super(message)
    this.name = 'WebApiError'
    this.status = status
    this.body = body
  }
}

export function createWebApi({ url, token, solution, verbose = false, log = console.log }) {
  const base = `${url.replace(/\/+$/, '')}/api/data/v9.2/`

  async function request(method, path, { body, headers = {}, solutionAware = false } = {}) {
    for (let attempt = 1; ; attempt++) {
      if (verbose) log(`  ${method} ${path}`)
      const res = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
          ...(solutionAware && solution ? { 'MSCRM.SolutionUniqueName': solution } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      // Service protection limits / transient errors: back off and retry.
      if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const wait = Number(res.headers.get('Retry-After') ?? 0) * 1000 || attempt * 2000
        log(`  … ${res.status}, retrying in ${Math.round(wait / 1000)}s`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      const text = await res.text()
      const json = text ? (() => { try { return JSON.parse(text) } catch { return text } })() : undefined
      if (!res.ok) {
        const message = json?.error?.message ?? (typeof json === 'string' ? json : res.statusText)
        throw new WebApiError(res.status, `${method} ${path} -> ${res.status}: ${message}`, json)
      }
      return { status: res.status, json, headers: res.headers }
    }
  }

  return {
    get: (path) => request('GET', path).then((r) => r.json),
    /** GET that returns undefined on 404 instead of throwing. */
    async tryGet(path) {
      try {
        return (await request('GET', path)).json
      } catch (error) {
        if (error instanceof WebApiError && error.status === 404) return undefined
        throw error
      }
    },
    post: (path, body, opts) => request('POST', path, { body, ...opts }),
    patch: (path, body, opts) => request('PATCH', path, { body, ...opts }),
  }
}
