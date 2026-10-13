import {
  Avatar,
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
  themeNames,
  useTheme,
} from '@codeapps/ui'
import { Check, Home, Menu, Moon, Palette, RotateCcw, Search, Sun, UserRound, X } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatches } from 'react-router'
import { mockPersonas } from '../runtime/identity.ts'
import { useWorkspace } from '../runtime/context.ts'
import { settingKeys } from '../schema/platform-tables.ts'
import { CommandPalette } from './CommandPalette.tsx'
import { ShareMenu } from './ShareMenu.tsx'

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded border-l-4 px-3 py-2 text-sm font-semibold transition-colors [&_svg]:size-4',
    isActive
      ? 'border-sidebar-active bg-sidebar-active/15 text-sidebar-foreground'
      : 'border-transparent text-sidebar-muted hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground',
  )

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { visibleModules, setting } = useWorkspace()
  const groups = [
    { id: 'apps', label: 'Apps', modules: visibleModules.filter((m) => (m.group ?? 'apps') === 'apps') },
    { id: 'admin', label: 'Administration', modules: visibleModules.filter((m) => m.group === 'admin') },
  ].filter((g) => g.modules.length > 0)

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 overflow-y-auto bg-sidebar px-3 py-4 text-sidebar-foreground">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2 px-3 font-heading text-lg font-bold">
        <span className="inline-block size-6 rounded-full bg-primary" aria-hidden="true" />
        {setting(settingKeys.appTitle) || 'Workspace'}
      </Link>
      <div className="flex flex-col gap-1">
        <NavLink to="/" end className={navLink} onClick={onNavigate}>
          <Home /> Home
        </NavLink>
      </div>
      {groups.map((g) => (
        <div key={g.id} className="flex flex-col gap-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">{g.label}</p>
          {g.modules.map((m) => (
            <NavLink key={m.id} to={`/${m.basePath}`} className={navLink} onClick={onNavigate}>
              <m.icon /> {m.title}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

function ThemeMenu() {
  const { theme, setTheme, mode, setMode } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme">
          <Palette />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {themeNames.map((t) => (
          <DropdownMenuItem key={t} onSelect={() => setTheme(t)}>
            <Check className={cn(t !== theme && 'invisible')} /> {t}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        {(['light', 'dark', 'system'] as const).map((m) => (
          <DropdownMenuItem key={m} onSelect={() => setMode(m)}>
            <Check className={cn(m !== mode && 'invisible')} /> {m === 'dark' ? <Moon /> : <Sun />} {m}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const { user, roles, mode, switchPersona, resetMockData } = useWorkspace()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-2 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account">
          <Avatar name={user.displayName || user.upn} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold">{user.displayName}</p>
          <p className="truncate text-xs text-muted">{user.upn}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {roles.length === 0 ? <Badge tone="outline">No roles</Badge> : roles.map((r) => <Badge key={r.id} tone="neutral">{r.name}</Badge>)}
          </div>
        </div>
        {mode === 'mock' && switchPersona && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>View as (offline mode)</DropdownMenuLabel>
            {mockPersonas.map((p) => (
              <DropdownMenuItem key={p.upn} onSelect={() => switchPersona(p.upn)}>
                <Check className={cn(p.upn !== user.upn && 'invisible')} /> <UserRound /> {p.displayName}
              </DropdownMenuItem>
            ))}
            {resetMockData && (
              <DropdownMenuItem onSelect={resetMockData}>
                <RotateCcw /> Reset sample data
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface RouteHandle {
  moduleId?: string
}

export function ShellLayout() {
  const { registeredModules, mode } = useWorkspace()
  const location = useLocation()
  const matches = useMatches()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const moduleId = matches.map((m) => (m.handle as RouteHandle | undefined)?.moduleId).find(Boolean)
  const current = registeredModules.find((m) => m.id === moduleId)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      <a href="#ws-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">
        Skip to content
      </a>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar onNavigate={closeDrawer} />
        </div>
      </aside>
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72">
            <Sidebar onNavigate={closeDrawer} />
            <Button variant="ghost" size="icon" className="absolute right-2 top-3 text-sidebar-foreground" aria-label="Close menu" onClick={closeDrawer}>
              <X />
            </Button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <Menu />
          </Button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1 truncate text-sm">
            <Link to="/" className="text-muted hover:text-foreground">Home</Link>
            {current && (
              <>
                <span className="mx-2 text-muted">/</span>
                <Link to={`/${current.basePath}`} className="font-semibold">{current.title}</Link>
              </>
            )}
          </nav>
          {mode === 'mock' && <Badge tone="warning" className="hidden sm:inline-flex">Offline · mock data</Badge>}
          <Button variant="outline" size="sm" onClick={() => setPaletteOpen(true)} className="hidden gap-2 text-muted sm:inline-flex">
            <Search /> Search <kbd className="rounded border border-border px-1 text-[10px]">Ctrl K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search" onClick={() => setPaletteOpen(true)}>
            <Search />
          </Button>
          <ShareMenu path={`${location.pathname}${location.search}`} title={current?.title ?? 'Workspace'} label="" variant="ghost" />
          <ThemeMenu />
          <UserMenu />
        </header>
        <main id="ws-main" className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-8">
          <Suspense fallback={<Spinner className="p-6" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
