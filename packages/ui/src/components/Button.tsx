import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn.ts'
import { buttonVariants, type ButtonVariants } from './button-variants.ts'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {}

/**
 * Button. To style a router <Link> as a button use
 * `className={buttonVariants({ variant: 'outline' })}`.
 */
export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
