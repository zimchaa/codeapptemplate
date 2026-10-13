import { createHashRouter } from 'react-router'
import type { WorkspaceModule } from '../modules/types.ts'
import { HomePage } from '../shell/HomePage.tsx'
import { ModuleGate } from '../shell/ModuleGate.tsx'
import { ShellLayout } from '../shell/ShellLayout.tsx'
import { NotFound, RouteError } from '../shell/StatusPages.tsx'

/**
 * Hash routing (`#/requests/123`) because the app runs inside the Power Apps
 * player's iframe: the iframe URL can't be deep-linked or reloaded at a path,
 * but hash changes are safe and keep the browser back button working.
 * External deep links arrive as ?route=... (see deepLinks.ts).
 */
export function createWorkspaceRouter(modules: readonly WorkspaceModule[]) {
  return createHashRouter([
    {
      path: '/',
      element: <ShellLayout />,
      errorElement: <RouteError />,
      children: [
        { index: true, element: <HomePage /> },
        ...modules.map((m) => ({
          path: m.basePath,
          element: <ModuleGate moduleId={m.id} />,
          handle: { moduleId: m.id },
          errorElement: <RouteError />,
          children: m.routes,
        })),
        { path: '*', element: <NotFound /> },
      ],
    },
  ])
}

export type WorkspaceRouter = ReturnType<typeof createWorkspaceRouter>
