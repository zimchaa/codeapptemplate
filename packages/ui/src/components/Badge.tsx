import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn.ts'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold leading-5',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted text-foreground',
        primary: 'bg-primary text-primary-foreground',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/15 text-warning',
        danger: 'bg-danger/15 text-danger',
        info: 'bg-info/15 text-info',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
