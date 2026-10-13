// Capability-based access control.
//
// A capability is a dotted string, by convention `<module>.<action>`
// (`requests.read`, `admin.roles.manage`). Roles grant capability PATTERNS:
//   *              everything
//   requests.*     every capability starting with `requests.`
//   requests.read  exactly that capability
//
// IMPORTANT: this controls what the UI shows. Real data security must also be
// enforced with Dataverse security roles (see docs/workspace/access-control.md).

/** Does a granted pattern cover the required capability? */
export function capabilityMatches(granted: string, required: string): boolean {
  const g = granted.trim().toLowerCase()
  const r = required.trim().toLowerCase()
  if (!g || !r) return false
  if (g === '*' || g === r) return true
  return g.endsWith('.*') && r.startsWith(g.slice(0, -1))
}

export function hasCapability(granted: Iterable<string>, required: string | undefined): boolean {
  if (!required) return true
  for (const g of granted) if (capabilityMatches(g, required)) return true
  return false
}

/** Parse a role's capability text: one per line, commas also accepted, # comments ignored. */
export function parseCapabilities(text: string | undefined): string[] {
  return (text ?? '')
    .split(/[\n,]/)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean)
}

export interface CapabilityDef {
  id: string
  label: string
  description?: string
}
