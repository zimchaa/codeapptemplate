import type { BadgeTone } from '@codeapps/ui'
import { priorityOptions, statusOptions, type RequestPriority, type RequestStatus } from './schema.ts'

export const caps = {
  read: 'requests.read',
  create: 'requests.create',
  manage: 'requests.manage',
} as const

export const statusTone: Record<RequestStatus, BadgeTone> = {
  new: 'info',
  in_progress: 'primary',
  waiting: 'warning',
  resolved: 'success',
  closed: 'neutral',
}

export const priorityTone: Record<RequestPriority, BadgeTone> = {
  low: 'neutral',
  normal: 'outline',
  high: 'warning',
  critical: 'danger',
}

export const statusLabel = (s: RequestStatus) => statusOptions.find((o) => o.value === s)?.label ?? s
export const priorityLabel = (p: RequestPriority) => priorityOptions.find((o) => o.value === p)?.label ?? p
