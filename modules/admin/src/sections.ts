import { caps } from './caps.ts'

export const sections = [
  { to: '', label: 'Overview', access: caps.access, end: true },
  { to: 'users', label: 'Users & roles', access: caps.users },
  { to: 'roles', label: 'Roles', access: caps.roles },
  { to: 'modules', label: 'Modules', access: caps.modules },
  { to: 'settings', label: 'Settings', access: caps.settings },
  { to: 'audit', label: 'Audit log', access: caps.audit },
  { to: 'links', label: 'Deep links', access: caps.access },
  { to: 'setup', label: 'Data & setup', access: caps.access },
]
