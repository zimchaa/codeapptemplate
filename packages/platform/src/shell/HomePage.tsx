import { Badge, buttonVariants, Card, CardContent, CardDescription, CardHeader, CardTitle, cn, PageHeader, Skeleton } from '@codeapps/ui'
import { ArrowRight } from 'lucide-react'
import { Suspense } from 'react'
import { Link } from 'react-router'
import { useWorkspace } from '../runtime/context.ts'

const sizeClass = { sm: 'lg:col-span-1', md: 'lg:col-span-2', lg: 'lg:col-span-3' }

export function HomePage() {
  const { user, visibleModules, can, roles } = useWorkspace()
  const widgets = visibleModules.flatMap((m) =>
    (m.widgets ?? []).filter((w) => can(w.access)).map((w) => ({ ...w, module: m })),
  )
  const firstName = (user.displayName || user.upn).split(/[\s@]/)[0]

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Everything you have access to, in one place."
        actions={roles.map((r) => (
          <Badge key={r.id} tone="outline">{r.name}</Badge>
        ))}
      />

      {widgets.length > 0 && (
        <section aria-label="Dashboard" className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map(({ module, ...w }) => (
            <Card key={`${module.id}:${w.id}`} className={cn('flex flex-col', sizeClass[w.size ?? 'sm'])}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{w.title}</CardTitle>
                <Link to={`/${module.basePath}`} className="text-xs font-semibold text-primary hover:underline">
                  Open {module.title}
                </Link>
              </CardHeader>
              <CardContent className="flex-1">
                <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                  <w.component />
                </Suspense>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section aria-label="Modules">
        <h2 className="mb-3 font-heading text-lg font-bold">Your apps</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((m) => (
            <Link key={m.id} to={`/${m.basePath}`} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full transition-shadow group-hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded bg-primary-subtle text-primary [&_svg]:size-5">
                    <m.icon />
                  </div>
                  <CardTitle>{m.title}</CardTitle>
                  <CardDescription>{m.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className={cn(buttonVariants({ variant: 'link' }), 'h-auto p-0')}>
                    Open <ArrowRight />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
