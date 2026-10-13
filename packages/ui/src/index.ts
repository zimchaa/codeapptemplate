// Public API of the workspace UI kit. Apps and modules import UI ONLY from
// here, so this file is the contract to keep when swapping in another
// component library (see docs/workspace/ui-and-theming.md).

export { cn } from './lib/cn.ts'
export { formatDate, formatDateTime, timeAgo, todayIso } from './lib/format.ts'
export { ThemeProvider, useTheme, themeNames } from './theme/ThemeProvider.tsx'
export type { ThemeMode, ThemeName, ThemeProviderProps } from './theme/ThemeProvider.tsx'

export { Button, buttonVariants } from './components/Button.tsx'
export type { ButtonProps, ButtonVariants } from './components/Button.tsx'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/Card.tsx'
export { Badge, badgeVariants } from './components/Badge.tsx'
export type { BadgeProps, BadgeTone } from './components/Badge.tsx'
export { Checkbox, Field, Input, Label, Select, Switch, Textarea } from './components/Form.tsx'
export type { CheckboxProps, FieldProps, SelectOption, SelectProps, SwitchProps } from './components/Form.tsx'
export { Table, TBody, TD, TH, THead, TR } from './components/Table.tsx'
export { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from './components/Dialog.tsx'
export type { DialogContentProps } from './components/Dialog.tsx'
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/DropdownMenu.tsx'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/Tabs.tsx'
export { Tooltip, TooltipProvider } from './components/Tooltip.tsx'
export type { TooltipProps } from './components/Tooltip.tsx'
export { Alert, Avatar, EmptyState, initials, PageHeader, Skeleton, Spinner, Stat } from './components/Feedback.tsx'
export type { AlertProps, EmptyStateProps, PageHeaderProps, StatProps } from './components/Feedback.tsx'
export { ToastProvider, useToast } from './components/Toast.tsx'
export type { ToastInput, ToastTone } from './components/Toast.tsx'
