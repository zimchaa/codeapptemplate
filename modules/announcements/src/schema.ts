import { defineTable, type BaseRecord } from '@codeapps/platform/schema'

export interface AnnouncementRecord extends BaseRecord {
  title: string
  body: string
  /** YYYY-MM-DD; hidden before this date. */
  publishOn: string
  /** YYYY-MM-DD; hidden after this date. */
  expiresOn?: string
  pinned: boolean
  /** Optional "read more" link. */
  link?: string
  authorName?: string
}

const id = (n: number) => `a11ce000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`

export const announcementTable = defineTable<AnnouncementRecord>({
  name: 'announcement',
  displayName: 'Announcement',
  displayCollectionName: 'Announcements',
  description: 'News and announcements shown in the workspace.',
  ownership: 'organization',
  primaryField: 'title',
  fields: {
    title: { name: 'name', type: 'text', displayName: 'Title', required: true, maxLength: 200 },
    body: { name: 'body', type: 'multiline', displayName: 'Body', required: true, maxLength: 20000 },
    publishOn: { name: 'publishon', type: 'dateonly', displayName: 'Publish on', required: true },
    expiresOn: { name: 'expireson', type: 'dateonly', displayName: 'Expires on' },
    pinned: { name: 'pinned', type: 'boolean', displayName: 'Pinned', defaultValue: false },
    link: { name: 'link', type: 'url', displayName: 'Link', maxLength: 2000 },
    authorName: { name: 'authorname', type: 'text', displayName: 'Author name', maxLength: 200 },
  },
  samples: [
    {
      id: id(1),
      title: 'Welcome to the new workspace',
      body: 'One place for requests, news and the apps you use every day. Press Ctrl+K anywhere to jump to a page.',
      publishOn: '2026-01-01',
      pinned: true,
      authorName: 'Ada Admin',
    },
    {
      id: id(2),
      title: 'Request links now work in Teams',
      body: 'Use Share on any request to copy a link, email it or post it to a Teams chat. The link opens the app on that request.',
      publishOn: '2026-02-01',
      pinned: false,
      authorName: 'Max Manager',
    },
  ],
})

/** Visible on `today` (YYYY-MM-DD): published and not expired. Pinned first, newest first. */
export function currentAnnouncements(all: readonly AnnouncementRecord[], today: string): AnnouncementRecord[] {
  return all
    .filter((a) => a.publishOn <= today && (!a.expiresOn || a.expiresOn >= today))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishOn.localeCompare(a.publishOn))
}
