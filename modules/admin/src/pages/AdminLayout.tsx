import { useWorkspace } from '@codeapps/platform'
import { cn, PageHeader } from '@codeapps/ui'
import { NavLink, Outlet } from 'react-router'
import { sections } from '../sections.ts'

export default function AdminLayout() {
  const { can } = useWorkspace()
  return (
    <>
      <PageHeader title="Administration" description="Changes here apply to everyone using the workspace." />
      <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {sections.filter((s) => can(s.access)).map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold',
                isActive ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground',
              )
            }
          >
            {s.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
