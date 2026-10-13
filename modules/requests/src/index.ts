import { defineModule } from '@codeapps/platform'
import { ClipboardList, List, Plus } from 'lucide-react'
import { lazy } from 'react'
import { requestTables } from './schema.ts'
import { caps } from './ui.ts'

export * from './schema.ts'

export const requestsModule = defineModule({
  id: 'requests',
  title: 'Requests',
  description: 'Raise, track and discuss requests. Every request has a shareable link.',
  icon: ClipboardList,
  basePath: 'requests',
  group: 'apps',
  order: 10,
  access: caps.read,
  capabilities: [
    { id: caps.read, label: 'View requests', description: 'See own and assigned requests.' },
    { id: caps.create, label: 'Raise requests' },
    { id: caps.manage, label: 'Manage all requests', description: 'See every request, assign and change status.' },
  ],
  tables: requestTables,
  routes: [
    { index: true, lazy: async () => ({ Component: (await import('./pages/RequestList.tsx')).RequestList }) },
    { path: 'new', lazy: async () => ({ Component: (await import('./pages/NewRequest.tsx')).NewRequest }) },
    { path: ':id', lazy: async () => ({ Component: (await import('./pages/RequestDetail.tsx')).RequestDetail }) },
  ],
  nav: [
    { label: 'Requests', to: '', icon: List },
    { label: 'New request', to: 'new', icon: Plus, access: caps.create },
  ],
  widgets: [
    {
      id: 'my-open',
      title: 'My open requests',
      size: 'md',
      component: lazy(() => import('./widgets/MyRequests.tsx').then((m) => ({ default: m.MyRequestsWidget }))),
    },
  ],
  commands: [{ id: 'new', label: 'Raise a new request', to: 'new', access: caps.create, keywords: ['ticket', 'help', 'ask'] }],
  // ?page=request&id=<guid>  ->  #/requests/<guid>
  deepLink: (params) => params.id,
})
