import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn.ts'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-semibold transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-foreground text-surface hover:bg-foreground/85',
        outline: 'border border-border bg-surface text-foreground hover:bg-surface-muted',
        ghost: 'text-foreground hover:bg-surface-muted',
        danger: 'bg-danger text-white hover:bg-danger/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {}

/**
 * Button. To style a router <Link> as a button use
 * `className={buttonVariants({ variant: 'outline' })}`.
 */
export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
