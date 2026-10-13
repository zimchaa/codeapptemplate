import * as Menu from '@radix-ui/react-dropdown-menu'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn.ts'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuGroup = Menu.Group

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn('z-50 min-w-48 rounded-md border border-border bg-surface p-1 text-foreground shadow-lg', className)}
        {...props}
      />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-2 py-1.5 text-xs font-semibold text-muted', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}
