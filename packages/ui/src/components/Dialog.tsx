import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../lib/cn.ts'

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close

export interface DialogContentProps extends ComponentProps<typeof RadixDialog.Content> {
  title: string
  description?: ReactNode
}

export function DialogContent({ title, description, className, children, ...props }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col',
          'gap-4 overflow-y-auto rounded-lg border border-border bg-surface p-6 text-foreground shadow-xl focus:outline-none',
          className,
        )}
        {...(description === undefined ? { 'aria-describedby': undefined } : {})}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <RadixDialog.Title className="font-heading text-lg font-bold">{title}</RadixDialog.Title>
            {description !== undefined && (
              <RadixDialog.Description className="text-sm text-muted">{description}</RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap justify-end gap-2 pt-2', className)} {...props} />
}
