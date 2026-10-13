import { defineModule } from '@codeapps/platform'
import { ShieldCheck } from 'lucide-react'
import type { ComponentType } from 'react'
import { caps } from './caps.ts'

const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

export const adminModule = defineModule({
  id: 'admin',
  title: 'Admin',
  description: 'Users and roles, capabilities, modules, settings, audit log and deep links.',
  icon: ShieldCheck,
  basePath: 'admin',
  group: 'admin',
  order: 1000,
  access: caps.access,
  capabilities: [
    { id: caps.access, label: 'Open the admin area' },
    { id: caps.users, label: 'Assign roles to users' },
    { id: caps.roles, label: 'Create and edit roles' },
    { id: caps.modules, label: 'Enable, disable and reorder modules' },
    { id: caps.settings, label: 'Edit app settings' },
    { id: caps.audit, label: 'Read the audit log' },
  ],
  routes: [
    {
      lazy: page(() => import('./pages/AdminLayout.tsx')),
      children: [
        { index: true, lazy: page(() => import('./pages/Overview.tsx')) },
        { path: 'users', lazy: page(() => import('./pages/Users.tsx')) },
        { path: 'roles', lazy: page(() => import('./pages/Roles.tsx')) },
        { path: 'modules', lazy: page(() => import('./pages/Modules.tsx')) },
        { path: 'settings', lazy: page(() => import('./pages/Settings.tsx')) },
        { path: 'audit', lazy: page(() => import('./pages/Audit.tsx')) },
        { path: 'links', lazy: page(() => import('./pages/DeepLinks.tsx')) },
        { path: 'setup', lazy: page(() => import('./pages/Setup.tsx')) },
      ],
    },
  ],
  commands: [
    { id: 'users', label: 'Assign a role to a user', to: 'users', access: caps.users, keywords: ['rbac', 'permissions'] },
    { id: 'roles', label: 'Edit roles and capabilities', to: 'roles', access: caps.roles },
    { id: 'modules', label: 'Turn modules on or off', to: 'modules', access: caps.modules },
    { id: 'links', label: 'Build a deep link', to: 'links', keywords: ['email', 'teams', 'url'] },
  ],
})
