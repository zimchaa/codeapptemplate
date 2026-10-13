import { defineModule } from '@codeapps/platform'
import { Megaphone } from 'lucide-react'
import { lazy } from 'react'
import { announcementTable } from './schema.ts'

import { caps } from './caps.ts'

export * from './schema.ts'

export const announcementsModule = defineModule({
  id: 'announcements',
  title: 'News',
  description: 'Announcements and updates for the team.',
  icon: Megaphone,
  basePath: 'news',
  group: 'apps',
  order: 20,
  access: caps.read,
  capabilities: [
    { id: caps.read, label: 'Read announcements' },
    { id: caps.manage, label: 'Publish and edit announcements' },
  ],
  tables: [announcementTable],
  routes: [
    { index: true, lazy: async () => ({ Component: (await import('./pages/NewsFeed.tsx')).NewsFeed }) },
    { path: ':id', lazy: async () => ({ Component: (await import('./pages/NewsItem.tsx')).NewsItem }) },
  ],
  widgets: [
    {
      id: 'latest',
      title: 'Latest news',
      component: lazy(() => import('./widgets/LatestNews.tsx').then((m) => ({ default: m.LatestNewsWidget }))),
    },
  ],
  commands: [{ id: 'news', label: 'Read the latest news', to: '', keywords: ['announcements'] }],
  deepLink: (params) => params.id,
})
