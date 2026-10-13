import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn.ts'
import { initials } from '../lib/initials.ts'

const alertVariants = cva('flex gap-3 rounded-md border p-4 text-sm', {
  variants: {
    tone: {
      info: 'border-info/30 bg-info/10',
      success: 'border-success/30 bg-success/10',
      warning: 'border-warning/30 bg-warning/10',
      danger: 'border-danger/30 bg-danger/10',
    },
  },
  defaultVariants: { tone: 'info' },
})

const alertIcons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle }
const alertIconColor = { info: 'text-info', success: 'text-success', warning: 'text-warning', danger: 'text-danger' }

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof alertVariants> {
  title?: ReactNode
}

export function Alert({ tone, title, className, children, ...props }: AlertProps) {
  const key = tone ?? 'info'
  const Icon = alertIcons[key]
  return (
    <div role={key === 'danger' ? 'alert' : 'status'} className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', alertIconColor[key])} aria-hidden="true" />
      <div className="flex flex-col gap-1 text-foreground">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  )
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-muted', className)}>
      <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-surface-muted', className)} aria-hidden="true" />
}

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-6 py-12 text-center', className)}>
      {icon && <div className="mb-1 text-muted [&_svg]:size-8">{icon}</div>}
      <p className="font-heading text-base font-bold">{title}</p>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Buttons / links shown on the right. */
  actions?: ReactNode
  /** e.g. breadcrumbs, shown above the title. */
  eyebrow?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4 pb-6', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <div className="text-sm text-muted">{eyebrow}</div>}
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground', className)}
      title={name}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export interface StatProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  className?: string
}

export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className="font-heading text-3xl font-bold text-foreground">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  )
}
