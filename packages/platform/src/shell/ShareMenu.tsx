import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from '@codeapps/ui'
import { Link2, Mail, MessageSquare, Share2 } from 'lucide-react'
import { emailLink, teamsShareLink } from '../router/deepLinks.ts'
import { useWorkspace } from '../runtime/context.ts'

export interface ShareMenuProps {
  /** In-app path to share, e.g. `/requests/123`. */
  path: string
  /** Used as the email subject / Teams message. */
  title: string
  label?: string
  variant?: 'outline' | 'ghost'
}

/** Copy link / email / Teams for any in-app path. */
export function ShareMenu({ path, title, label = 'Share', variant = 'outline' }: ShareMenuProps) {
  const { deepLink } = useWorkspace()
  const { toast } = useToast()
  const url = deepLink(path)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copied', tone: 'success' })
    } catch {
      // Clipboard can be blocked inside the Power Apps iframe; show the link instead.
      window.prompt('Copy this link', url)
    }
  }
  const open = (href: string) => window.open(href, '_blank', 'noopener')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={label ? 'md' : 'icon'} aria-label={label || 'Share'}>
          <Share2 />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Share a link to this page</DropdownMenuLabel>
        <DropdownMenuItem onSelect={copy}><Link2 /> Copy link</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(emailLink(url, title, 'Here is the link:'))}><Mail /> Email</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(teamsShareLink(url, title))}><MessageSquare /> Share to Teams</DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="max-w-72 break-all px-2 py-1 text-xs text-muted">{url}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
