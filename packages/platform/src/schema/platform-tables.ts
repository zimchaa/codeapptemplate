import { defineTable, type BaseRecord } from './types.ts'

// ---------------------------------------------------------------------------
// Core tables owned by the platform (used by the admin module and the shell).
// Seed ids are fixed GUIDs so provisioning can upsert them idempotently and
// lookups between seed rows work in Dataverse and in the mock provider.
// ---------------------------------------------------------------------------

export interface ModuleStateRecord extends BaseRecord {
  /** Module id from the code registry, e.g. `requests`. */
  key: string
  enabled: boolean
  sortOrder: number
  notes?: string
}

export const moduleStateTable = defineTable<ModuleStateRecord>({
  name: 'workspacemodule',
  displayName: 'Workspace Module',
  displayCollectionName: 'Workspace Modules',
  description: 'Runtime state of workspace modules (enabled, order). Modules without a row are enabled.',
  ownership: 'organization',
  primaryField: 'key',
  fields: {
    key: { name: 'name', type: 'text', displayName: 'Module key', required: true, maxLength: 100 },
    enabled: { name: 'enabled', type: 'boolean', displayName: 'Enabled', defaultValue: true },
    sortOrder: { name: 'sortorder', type: 'integer', displayName: 'Sort order', min: 0, max: 10000 },
    notes: { name: 'notes', type: 'multiline', displayName: 'Notes', maxLength: 2000 },
  },
})

export interface RoleRecord extends BaseRecord {
  /** Stable key used in code and settings, e.g. `admin`. */
  key: string
  name: string
  description?: string
  /** One capability pattern per line, e.g. `requests.*`, `*`. */
  capabilities: string
  isSystem: boolean
}

export const roleIds = {
  admin: '5b1d0c1e-0000-4000-8000-000000000001',
  manager: '5b1d0c1e-0000-4000-8000-000000000002',
  member: '5b1d0c1e-0000-4000-8000-000000000003',
  viewer: '5b1d0c1e-0000-4000-8000-000000000004',
} as const

export const roleTable = defineTable<RoleRecord>({
  name: 'approle',
  displayName: 'App Role',
  displayCollectionName: 'App Roles',
  description: 'Workspace roles and the capabilities they grant.',
  ownership: 'organization',
  primaryField: 'name',
  fields: {
    name: { name: 'name', type: 'text', displayName: 'Name', required: true, maxLength: 100 },
    key: { name: 'key', type: 'text', displayName: 'Key', required: true, maxLength: 50 },
    description: { name: 'description', type: 'multiline', displayName: 'Description', maxLength: 2000 },
    capabilities: {
      name: 'capabilities',
      type: 'multiline',
      displayName: 'Capabilities',
      description: 'One capability pattern per line (e.g. requests.read, requests.*, *).',
      maxLength: 10000,
    },
    isSystem: { name: 'issystem', type: 'boolean', displayName: 'System role', defaultValue: false },
  },
  seed: [
    {
      id: roleIds.admin,
      key: 'admin',
      name: 'Administrator',
      description: 'Full access to every module and the admin area.',
      capabilities: '*',
      isSystem: true,
    },
    {
      id: roleIds.manager,
      key: 'manager',
      name: 'Manager',
      description: 'Manages requests, announcements and links.',
      capabilities: ['requests.*', 'announcements.*', 'links.*'].join('\n'),
      isSystem: true,
    },
    {
      id: roleIds.member,
      key: 'member',
      name: 'Member',
      description: 'Default role: read content and raise requests.',
      capabilities: ['requests.read', 'requests.create', 'announcements.read', 'links.read'].join('\n'),
      isSystem: true,
    },
    {
      id: roleIds.viewer,
      key: 'viewer',
      name: 'Viewer',
      description: 'Read-only access.',
      capabilities: ['requests.read', 'announcements.read', 'links.read'].join('\n'),
      isSystem: true,
    },
  ],
})

export interface RoleAssignmentRecord extends BaseRecord {
  /** Display label, e.g. `ada@contoso.example: Administrator`. */
  name: string
  /** User principal name (lower case). Matches getContext().user.userPrincipalName. */
  userUpn: string
  userDisplayName?: string
  roleId: string
}

export const roleAssignmentTable = defineTable<RoleAssignmentRecord>({
  name: 'roleassignment',
  displayName: 'Role Assignment',
  displayCollectionName: 'Role Assignments',
  description: 'Which users hold which workspace roles.',
  ownership: 'organization',
  primaryField: 'name',
  fields: {
    name: { name: 'name', type: 'text', displayName: 'Name', required: true, maxLength: 300 },
    userUpn: { name: 'userupn', type: 'email', displayName: 'User UPN', required: true, maxLength: 320 },
    userDisplayName: { name: 'userdisplayname', type: 'text', displayName: 'User display name', maxLength: 200 },
    roleId: { name: 'role', type: 'lookup', target: 'approle', displayName: 'Role', required: true },
  },
  // Demo personas for the mock provider (see runtime/identity.ts).
  samples: [
    {
      id: '5b1d0c1e-0000-4000-8000-000000000101',
      name: 'ada@contoso.example: Administrator',
      userUpn: 'ada@contoso.example',
      userDisplayName: 'Ada Admin',
      roleId: roleIds.admin,
    },
    {
      id: '5b1d0c1e-0000-4000-8000-000000000102',
      name: 'max@contoso.example: Manager',
      userUpn: 'max@contoso.example',
      userDisplayName: 'Max Manager',
      roleId: roleIds.manager,
    },
    {
      id: '5b1d0c1e-0000-4000-8000-000000000103',
      name: 'val@contoso.example: Viewer',
      userUpn: 'val@contoso.example',
      userDisplayName: 'Val Viewer',
      roleId: roleIds.viewer,
    },
  ],
})

export interface SettingRecord extends BaseRecord {
  key: string
  value: string
  description?: string
}

/** Well-known setting keys. */
export const settingKeys = {
  appTitle: 'app.title',
  defaultRole: 'access.defaultRole',
  playUrl: 'app.playUrl',
  playBaseUrl: 'app.playBaseUrl',
  supportEmail: 'app.supportEmail',
  choicePrefix: 'dataverse.optionValuePrefix',
} as const

export const settingTable = defineTable<SettingRecord>({
  name: 'appsetting',
  displayName: 'App Setting',
  displayCollectionName: 'App Settings',
  description: 'Key/value settings for the workspace app.',
  ownership: 'organization',
  primaryField: 'key',
  fields: {
    key: { name: 'name', type: 'text', displayName: 'Key', required: true, maxLength: 200 },
    value: { name: 'value', type: 'multiline', displayName: 'Value', maxLength: 4000 },
    description: { name: 'description', type: 'multiline', displayName: 'Description', maxLength: 2000 },
  },
  seed: [
    {
      id: '5b1d0c1e-0000-4000-8000-000000000201',
      key: settingKeys.appTitle,
      value: 'Workspace',
      description: 'Name shown in the header.',
    },
    {
      id: '5b1d0c1e-0000-4000-8000-000000000202',
      key: settingKeys.defaultRole,
      value: 'member',
      description: 'Role key every signed-in user gets in addition to explicit assignments. Empty = none.',
    },
    {
      id: '5b1d0c1e-0000-4000-8000-000000000203',
      key: settingKeys.playUrl,
      value: '',
      description:
        'Published app URL (https://apps.powerapps.com/play/e/<env>/app/<appId>). Used to build deep links; detected automatically when empty.',
    },
    {
      id: '5b1d0c1e-0000-4000-8000-000000000204',
      key: settingKeys.playBaseUrl,
      value: 'https://apps.powerapps.com',
      description: 'Power Apps player host for your cloud (e.g. https://apps.gov.powerapps.us).',
    },
    {
      id: '5b1d0c1e-0000-4000-8000-000000000205',
      key: settingKeys.supportEmail,
      value: '',
      description: 'Contact shown on error and access-denied pages.',
    },
    {
      id: '5b1d0c1e-0000-4000-8000-000000000206',
      key: settingKeys.choicePrefix,
      value: '10000',
      description: "Solution publisher's option value prefix. Written by the provisioning script; do not edit.",
    },
  ],
})

export interface AuditEventRecord extends BaseRecord {
  action: string
  module: string
  entity?: string
  recordId?: string
  actorUpn: string
  details?: string
}

export const auditEventTable = defineTable<AuditEventRecord>({
  name: 'auditevent',
  displayName: 'Audit Event',
  displayCollectionName: 'Audit Events',
  description: 'Application-level audit trail written by workspace modules.',
  ownership: 'organization',
  primaryField: 'action',
  fields: {
    action: { name: 'name', type: 'text', displayName: 'Action', required: true, maxLength: 200 },
    module: { name: 'module', type: 'text', displayName: 'Module', maxLength: 100 },
    entity: { name: 'entity', type: 'text', displayName: 'Entity', maxLength: 100 },
    recordId: { name: 'recordid', type: 'text', displayName: 'Record id', maxLength: 100 },
    actorUpn: { name: 'actorupn', type: 'email', displayName: 'Actor UPN', maxLength: 320 },
    details: { name: 'details', type: 'multiline', displayName: 'Details', maxLength: 10000 },
  },
})

export const platformTables = [
  moduleStateTable,
  roleTable,
  roleAssignmentTable,
  settingTable,
  auditEventTable,
] as const
