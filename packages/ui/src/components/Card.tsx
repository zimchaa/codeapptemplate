import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn.ts'

type DivProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: DivProps) {
  return <div className={cn('rounded-lg border border-border bg-surface text-foreground shadow-card', className)} {...props} />
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-heading text-base font-bold leading-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted', className)} {...props} />
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: DivProps) {
  return <div className={cn('flex items-center gap-2 border-t border-border px-5 py-3', className)} {...props} />
}
