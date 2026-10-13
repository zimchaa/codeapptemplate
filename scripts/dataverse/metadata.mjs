// Pure builders for Dataverse Web API metadata payloads, derived from the
// workspace schema (packages/platform/src/schema). No network access here,
// so everything can be unit-tested (metadata.test.mjs) and dry-run.
//
// Schema names are kept lower case (identical to logical names). That makes
// the lookup navigation property equal to the logical column name, which is
// what the app's Dataverse provider uses in `<column>@odata.bind`.

import { choiceValue } from '../../packages/platform/src/schema/naming.ts'

export function label(text, languageCode) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.Label',
    LocalizedLabels: [{ '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: text, LanguageCode: languageCode }],
  }
}

const required = (col) => ({ Value: col.required ? 'ApplicationRequired' : 'None' })

/** Column metadata for every non-lookup column type. */
export function attributeMetadata(col, naming, { languageCode, optionValuePrefix }) {
  const base = {
    SchemaName: naming.column(col),
    DisplayName: label(col.displayName, languageCode),
    Description: label(col.description ?? col.displayName, languageCode),
    RequiredLevel: required(col),
  }
  switch (col.type) {
    case 'text':
    case 'email':
    case 'url':
      return {
        '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
        ...base,
        MaxLength: col.maxLength ?? 200,
        FormatName: { Value: col.type === 'email' ? 'Email' : col.type === 'url' ? 'Url' : 'Text' },
      }
    case 'multiline':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata', ...base, MaxLength: col.maxLength ?? 4000, Format: 'TextArea' }
    case 'boolean':
      return {
        '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata',
        ...base,
        DefaultValue: col.defaultValue ?? false,
        OptionSet: {
          '@odata.type': 'Microsoft.Dynamics.CRM.BooleanOptionSetMetadata',
          TrueOption: { Value: 1, Label: label('Yes', languageCode) },
          FalseOption: { Value: 0, Label: label('No', languageCode) },
        },
      }
    case 'integer':
      return {
        '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
        ...base,
        MinValue: col.min ?? -2147483648,
        MaxValue: col.max ?? 2147483647,
        Format: 'None',
      }
    case 'dateonly':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata', ...base, Format: 'DateOnly', DateTimeBehavior: { Value: 'DateOnly' } }
    case 'datetime':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata', ...base, Format: 'DateAndTime', DateTimeBehavior: { Value: 'UserLocal' } }
    case 'choice':
      return {
        '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
        ...base,
        OptionSet: {
          '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
          IsGlobal: false,
          OptionSetType: 'Picklist',
          Options: col.options.map((o, i) => ({ Value: choiceValue(optionValuePrefix, i), Label: label(o.label, languageCode) })),
        },
      }
    default:
      throw new Error(`attributeMetadata: unsupported column type "${col.type}" (${col.name})`)
  }
}

/** POST EntityDefinitions body: the table with its primary name column. */
export function entityMetadata(def, naming, { languageCode }) {
  const primary = def.fields[def.primaryField]
  if (!primary || primary.type !== 'text') throw new Error(`${def.name}: primaryField "${def.primaryField}" must be a text column`)
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
    SchemaName: naming.table(def),
    DisplayName: label(def.displayName, languageCode),
    DisplayCollectionName: label(def.displayCollectionName, languageCode),
    Description: label(def.description, languageCode),
    OwnershipType: def.ownership === 'user' ? 'UserOwned' : 'OrganizationOwned',
    HasActivities: false,
    HasNotes: false,
    IsActivity: false,
    PrimaryNameAttribute: naming.column(primary),
    Attributes: [
      {
        ...attributeMetadata(primary, naming, { languageCode, optionValuePrefix: 0 }),
        IsPrimaryName: true,
        RequiredLevel: { Value: 'ApplicationRequired' },
      },
    ],
  }
}

export function relationshipSchemaName(def, col, naming) {
  return `${naming.prefix}_${col.target}_${def.name}_${col.name}`
}

/** POST RelationshipDefinitions body for a lookup column. */
export function relationshipMetadata(def, col, naming, { languageCode }) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
    SchemaName: relationshipSchemaName(def, col, naming),
    ReferencedEntity: naming.table(col.target),
    ReferencingEntity: naming.table(def),
    CascadeConfiguration: {
      Assign: 'NoCascade',
      Share: 'NoCascade',
      Unshare: 'NoCascade',
      Reparent: 'NoCascade',
      Merge: 'NoCascade',
      // Required lookups (comment -> request, assignment -> role) die with the parent.
      Delete: col.required ? 'Cascade' : 'RemoveLink',
    },
    Lookup: {
      '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
      SchemaName: naming.column(col),
      DisplayName: label(col.displayName, languageCode),
      Description: label(col.description ?? col.displayName, languageCode),
      RequiredLevel: required(col),
    },
  }
}

/** Validate a schema before touching an environment. Returns a list of problems. */
export function validateSchema(tables, naming) {
  const problems = []
  const names = new Set(tables.map((t) => t.name))
  const seen = new Set()
  for (const t of tables) {
    if (seen.has(t.name)) problems.push(`duplicate table "${t.name}"`)
    seen.add(t.name)
    if (!/^[a-z][a-z0-9]*$/.test(t.name)) problems.push(`${t.name}: table names must be lower-case letters/digits`)
    const logical = naming.table(t)
    if (logical.length > 50) problems.push(`${logical}: logical name longer than 50 characters`)
    const primary = t.fields[t.primaryField]
    if (!primary) problems.push(`${t.name}: primaryField "${t.primaryField}" is not a field`)
    else if (primary.type !== 'text') problems.push(`${t.name}: primary field must be type text`)
    const cols = new Set()
    for (const [field, col] of Object.entries(t.fields)) {
      if (!/^[a-z][a-z0-9]*$/.test(col.name)) problems.push(`${t.name}.${field}: column name "${col.name}" must be lower-case letters/digits`)
      if (cols.has(col.name)) problems.push(`${t.name}: duplicate column "${col.name}"`)
      cols.add(col.name)
      if (['createdon', 'modifiedon', 'ownerid', 'statecode', 'statuscode'].includes(col.name)) problems.push(`${t.name}: column name "${col.name}" is reserved`)
      if (col.type === 'lookup' && !names.has(col.target)) problems.push(`${t.name}.${field}: lookup target "${col.target}" is not in the schema`)
      if (col.type === 'choice' && (col.options.length === 0 || col.options.length > 9999)) problems.push(`${t.name}.${field}: choice needs 1-9999 options`)
      if (`${logical}id` === naming.column(col)) problems.push(`${t.name}.${field}: column clashes with the primary key`)
    }
    const lookupTargetsBefore = new Set(tables.slice(0, tables.indexOf(t)).map((x) => x.name))
    for (const row of [...(t.seed ?? []), ...(t.samples ?? [])]) {
      for (const [field, col] of Object.entries(t.fields)) {
        if (col.required && field !== t.primaryField && (row[field] === undefined || row[field] === '')) {
          problems.push(`${t.name} seed ${row.id}: required field "${field}" is empty`)
        }
        if (col.type === 'lookup' && row[field] && !lookupTargetsBefore.has(col.target) && col.target !== t.name) {
          problems.push(`${t.name} seed ${row.id}: lookup target "${col.target}" must be listed before "${t.name}" so its rows exist first`)
        }
      }
    }
  }
  return problems
}
