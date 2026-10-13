import type { RoleAssignmentRecord, RoleRecord } from '../schema/platform-tables.ts'
import { parseCapabilities } from './capabilities.ts'

export interface ResolvedAccess {
  roles: RoleRecord[]
  capabilities: string[]
}

/**
 * Combine a user's explicit role assignments with the default role
 * (setting `access.defaultRole`) into a role list and a capability set.
 */
export function resolveAccess(
  userUpn: string,
  roles: readonly RoleRecord[],
  assignments: readonly RoleAssignmentRecord[],
  defaultRoleKey: string | undefined,
): ResolvedAccess {
  const upn = userUpn.trim().toLowerCase()
  const roleIds = new Set(assignments.filter((a) => a.userUpn.trim().toLowerCase() === upn).map((a) => a.roleId))
  const held = roles.filter((r) => roleIds.has(r.id) || (defaultRoleKey && r.key === defaultRoleKey))
  const capabilities = [...new Set(held.flatMap((r) => parseCapabilities(r.capabilities)))]
  return { roles: held, capabilities }
}
