// Access tokens for the Dataverse Web API using plain fetch (no MSAL, no
// native token cache), so this works on locked-down laptops.
//
// Order of preference:
//   1. DATAVERSE_TOKEN                     - a token you already have
//   2. DATAVERSE_CLIENT_ID + _SECRET + DATAVERSE_TENANT_ID
//                                          - service principal (CI)
//   3. device code sign-in                 - interactive, any browser/device
//
// Device code uses Microsoft's documented public sample app id for Dataverse
// development unless DATAVERSE_CLIENT_ID is set. Some tenants block device
// code flow with Conditional Access; use 1 or 2 (or the GitHub workflow) then.

const SAMPLE_PUBLIC_CLIENT_ID = '51f81489-12ee-4a9e-aaae-a2591f45987d'

async function post(url, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

async function clientCredentials({ tenant, clientId, clientSecret, resource }) {
  const { ok, json } = await post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: `${resource}/.default`,
  })
  if (!ok) throw new Error(`Service principal sign-in failed: ${json.error_description ?? json.error ?? 'unknown error'}`)
  return json.access_token
}

async function deviceCode({ tenant, clientId, resource, log }) {
  const base = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`
  const scope = `${resource}/user_impersonation offline_access`
  const start = await post(`${base}/devicecode`, { client_id: clientId, scope })
  if (!start.ok) throw new Error(`Device code sign-in could not start: ${start.json.error_description ?? start.json.error}`)
  log(`\n${start.json.message}\n`)
  let interval = (start.json.interval ?? 5) * 1000
  const deadline = Date.now() + (start.json.expires_in ?? 900) * 1000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval))
    const poll = await post(`${base}/token`, {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: clientId,
      device_code: start.json.device_code,
    })
    if (poll.ok) return poll.json.access_token
    if (poll.json.error === 'authorization_pending') continue
    if (poll.json.error === 'slow_down') {
      interval += 5000
      continue
    }
    throw new Error(`Device code sign-in failed: ${poll.json.error_description ?? poll.json.error}`)
  }
  throw new Error('Device code sign-in timed out.')
}

export async function getToken({ resource, env = process.env, log = console.log }) {
  if (env.DATAVERSE_TOKEN) return env.DATAVERSE_TOKEN.trim()
  const tenant = env.DATAVERSE_TENANT_ID || 'organizations'
  if (env.DATAVERSE_CLIENT_ID && env.DATAVERSE_CLIENT_SECRET) {
    if (!env.DATAVERSE_TENANT_ID) throw new Error('DATAVERSE_TENANT_ID is required with a client secret.')
    log('Signing in with the service principal …')
    return clientCredentials({ tenant, clientId: env.DATAVERSE_CLIENT_ID, clientSecret: env.DATAVERSE_CLIENT_SECRET, resource })
  }
  return deviceCode({ tenant, clientId: env.DATAVERSE_CLIENT_ID || SAMPLE_PUBLIC_CLIENT_ID, resource, log })
}
