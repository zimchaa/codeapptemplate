import { DataError, RequireCapability, settingKeys, settingTable, useData, useTable, useWorkspace, type SettingRecord } from '@codeapps/platform'
import { Button, Card, CardContent, Field, Input, Skeleton, useToast } from '@codeapps/ui'
import { useState } from 'react'
import { caps } from '../caps.ts'

const readOnly = new Set<string>([settingKeys.choicePrefix])

export default function Settings() {
  return (
    <RequireCapability capability={caps.settings}>
      <SettingsPage />
    </RequireCapability>
  )
}

function SettingsPage() {
  const table = useTable(settingTable)
  const { data, error, reload } = useData(() => table.list({ orderBy: { field: 'key' } }), [])
  if (error) return <DataError error={error} onRetry={reload} />
  if (!data) return <Skeleton className="h-48" />
  return (
    <Card className="max-w-3xl">
      <CardContent className="flex flex-col divide-y divide-border pt-2">
        {data.map((s) => <SettingRow key={s.id} setting={s} onSaved={reload} />)}
      </CardContent>
    </Card>
  )
}

function SettingRow({ setting, onSaved }: { setting: SettingRecord; onSaved: () => void }) {
  const { audit, refresh } = useWorkspace()
  const table = useTable(settingTable)
  const { toast } = useToast()
  const [value, setValue] = useState(setting.value ?? '')
  const locked = readOnly.has(setting.key)

  const save = async () => {
    await table.update(setting.id, { value })
    await audit({ action: 'setting.updated', module: 'admin', entity: 'appsetting', recordId: setting.id, details: { key: setting.key, value } })
    toast({ title: `${setting.key} saved`, tone: 'success' })
    onSaved()
    refresh()
  }

  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-end">
      <Field className="flex-1" label={setting.key} hint={setting.description}>
        {(id) => <Input id={id} value={value} disabled={locked} onChange={(e) => setValue(e.target.value)} className="font-mono" />}
      </Field>
      {!locked && <Button variant="outline" disabled={value === (setting.value ?? '')} onClick={save}>Save</Button>}
    </div>
  )
}
