import { defineTable, type BaseRecord } from '@codeapps/platform/schema'

export interface QuickLinkRecord extends BaseRecord {
  title: string
  url: string
  description?: string
  category: string
  sortOrder: number
  /** Only users with this capability see the link (empty = everyone with links.read). */
  requiredCapability?: string
  pinned: boolean
}

const id = (n: number) => `11c0de00-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`

export const quickLinkTable = defineTable<QuickLinkRecord>({
  name: 'quicklink',
  displayName: 'Quick Link',
  displayCollectionName: 'Quick Links',
  description: 'Links to other apps and tools shown in the workspace launcher.',
  ownership: 'organization',
  primaryField: 'title',
  fields: {
    title: { name: 'name', type: 'text', displayName: 'Title', required: true, maxLength: 200 },
    url: { name: 'url', type: 'url', displayName: 'URL', required: true, maxLength: 2000 },
    description: { name: 'description', type: 'text', displayName: 'Description', maxLength: 500 },
    category: { name: 'category', type: 'text', displayName: 'Category', required: true, maxLength: 100 },
    sortOrder: { name: 'sortorder', type: 'integer', displayName: 'Sort order', min: 0, max: 10000 },
    requiredCapability: { name: 'requiredcapability', type: 'text', displayName: 'Required capability', maxLength: 200 },
    pinned: { name: 'pinned', type: 'boolean', displayName: 'Pinned', defaultValue: false },
  },
  samples: [
    { id: id(1), title: 'Power Apps', url: 'https://make.powerapps.com', description: 'Build and manage apps', category: 'Power Platform', sortOrder: 10, pinned: true },
    { id: id(2), title: 'Power Automate', url: 'https://make.powerautomate.com', description: 'Flows and approvals', category: 'Power Platform', sortOrder: 20, pinned: false },
    { id: id(3), title: 'Microsoft Teams', url: 'https://teams.microsoft.com', description: 'Chat and meetings', category: 'Collaboration', sortOrder: 10, pinned: true },
    { id: id(4), title: 'Outlook', url: 'https://outlook.office.com', category: 'Collaboration', sortOrder: 20, pinned: false },
    {
      id: id(5),
      title: 'Power Platform admin center',
      url: 'https://admin.powerplatform.microsoft.com',
      description: 'Environments and policies (admins only)',
      category: 'Administration',
      sortOrder: 10,
      requiredCapability: 'admin.access',
      pinned: false,
    },
  ],
})
