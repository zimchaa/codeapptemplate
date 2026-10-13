import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export const TooltipProvider = RadixTooltip.Provider

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Root delayDuration={300}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content side={side} sideOffset={6} className="z-50 rounded bg-foreground px-2 py-1 text-xs text-surface shadow">
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
