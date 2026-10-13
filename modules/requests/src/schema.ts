// React-free: imported by the provisioning script as well as the module.
import { defineTable, type BaseRecord, type ChoiceOption } from '@codeapps/platform/schema'

export const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting', label: 'Waiting on requester' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const satisfies readonly ChoiceOption[]

export const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const satisfies readonly ChoiceOption[]

export type RequestStatus = (typeof statusOptions)[number]['value']
export type RequestPriority = (typeof priorityOptions)[number]['value']

export const openStatuses: readonly RequestStatus[] = ['new', 'in_progress', 'waiting']

export interface RequestRecord extends BaseRecord {
  title: string
  description?: string
  status: RequestStatus
  priority: RequestPriority
  category?: string
  requesterUpn: string
  requesterName?: string
  assigneeUpn?: string
  assigneeName?: string
  dueDate?: string
}

export interface RequestCommentRecord extends BaseRecord {
  /** First line of the comment (primary name column). */
  summary: string
  body: string
  requestId: string
  authorUpn: string
  authorName?: string
}

const sample = (n: number) => `7e9a1c00-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`

export const requestTable = defineTable<RequestRecord>({
  name: 'request',
  displayName: 'Request',
  displayCollectionName: 'Requests',
  description: 'Requests raised through the workspace.',
  ownership: 'user',
  primaryField: 'title',
  fields: {
    title: { name: 'name', type: 'text', displayName: 'Title', required: true, maxLength: 200 },
    description: { name: 'description', type: 'multiline', displayName: 'Description', maxLength: 20000 },
    status: { name: 'status', type: 'choice', displayName: 'Status', options: statusOptions, required: true },
    priority: { name: 'priority', type: 'choice', displayName: 'Priority', options: priorityOptions, required: true },
    category: { name: 'category', type: 'text', displayName: 'Category', maxLength: 100 },
    requesterUpn: { name: 'requesterupn', type: 'email', displayName: 'Requester UPN', required: true, maxLength: 320 },
    requesterName: { name: 'requestername', type: 'text', displayName: 'Requester name', maxLength: 200 },
    assigneeUpn: { name: 'assigneeupn', type: 'email', displayName: 'Assignee UPN', maxLength: 320 },
    assigneeName: { name: 'assigneename', type: 'text', displayName: 'Assignee name', maxLength: 200 },
    dueDate: { name: 'duedate', type: 'dateonly', displayName: 'Due date' },
  },
  samples: [
    {
      id: sample(1),
      title: 'New starter laptop for the analytics team',
      description: 'Two new joiners start on the 1st. They need standard developer laptops with Node and pnpm.',
      status: 'in_progress',
      priority: 'high',
      category: 'Equipment',
      requesterUpn: 'mia@contoso.example',
      requesterName: 'Mia Member',
      assigneeUpn: 'max@contoso.example',
      assigneeName: 'Max Manager',
      dueDate: '2026-11-01',
    },
    {
      id: sample(2),
      title: 'Access to the reporting workspace',
      description: 'Please add me to the reporting workspace so I can see the weekly dashboards.',
      status: 'new',
      priority: 'normal',
      category: 'Access',
      requesterUpn: 'mia@contoso.example',
      requesterName: 'Mia Member',
    },
    {
      id: sample(3),
      title: 'Update the team announcement banner',
      status: 'resolved',
      priority: 'low',
      category: 'Content',
      requesterUpn: 'max@contoso.example',
      requesterName: 'Max Manager',
      assigneeUpn: 'ada@contoso.example',
      assigneeName: 'Ada Admin',
    },
  ],
})

export const requestCommentTable = defineTable<RequestCommentRecord>({
  name: 'requestcomment',
  displayName: 'Request Comment',
  displayCollectionName: 'Request Comments',
  description: 'Discussion on a request.',
  ownership: 'user',
  primaryField: 'summary',
  fields: {
    summary: { name: 'name', type: 'text', displayName: 'Summary', required: true, maxLength: 200 },
    body: { name: 'body', type: 'multiline', displayName: 'Body', required: true, maxLength: 20000 },
    requestId: { name: 'request', type: 'lookup', target: 'request', displayName: 'Request', required: true },
    authorUpn: { name: 'authorupn', type: 'email', displayName: 'Author UPN', required: true, maxLength: 320 },
    authorName: { name: 'authorname', type: 'text', displayName: 'Author name', maxLength: 200 },
  },
  samples: [
    {
      id: sample(51),
      summary: 'Ordered both laptops',
      body: 'Ordered both laptops, delivery expected next week.',
      requestId: sample(1),
      authorUpn: 'max@contoso.example',
      authorName: 'Max Manager',
    },
    {
      id: sample(52),
      summary: 'Thanks!',
      body: 'Thanks! Can they come with the standard docking stations?',
      requestId: sample(1),
      authorUpn: 'mia@contoso.example',
      authorName: 'Mia Member',
    },
  ],
})

export const requestTables = [requestTable, requestCommentTable] as const
