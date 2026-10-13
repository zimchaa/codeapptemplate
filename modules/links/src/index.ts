import { defineModule } from '@codeapps/platform'
import { LayoutGrid } from 'lucide-react'
import { lazy } from 'react'
import { caps } from './caps.ts'
import { quickLinkTable } from './schema.ts'

export * from './schema.ts'

export const linksModule = defineModule({
  id: 'links',
  title: 'App launcher',
  description: 'Every app and tool you need, filtered to your role.',
  icon: LayoutGrid,
  basePath: 'apps',
  group: 'apps',
  order: 30,
  access: caps.read,
  capabilities: [
    { id: caps.read, label: 'Use the app launcher' },
    { id: caps.manage, label: 'Manage launcher links' },
  ],
  tables: [quickLinkTable],
  routes: [{ index: true, lazy: async () => ({ Component: (await import('./pages/Launcher.tsx')).Launcher }) }],
  widgets: [
    {
      id: 'pinned',
      title: 'Pinned apps',
      component: lazy(() => import('./widgets/PinnedLinks.tsx').then((m) => ({ default: m.PinnedLinksWidget }))),
    },
  ],
  commands: [{ id: 'launcher', label: 'Open the app launcher', to: '', keywords: ['links', 'tools'] }],
})
