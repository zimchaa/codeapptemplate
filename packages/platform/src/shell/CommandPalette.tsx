import { Dialog, DialogContent, Input, cn } from '@codeapps/ui'
import { CornerDownLeft } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { useWorkspace } from '../runtime/context.ts'

interface Entry {
  id: string
  label: string
  group: string
  path: string
  keywords: string
}

function useEntries(): Entry[] {
  const { visibleModules, can } = useWorkspace()
  return useMemo(() => {
    const entries: Entry[] = [{ id: 'home', label: 'Home', group: 'Go to', path: '/', keywords: 'dashboard' }]
    for (const m of visibleModules) {
      const base = `/${m.basePath}`
      entries.push({ id: m.id, label: m.title, group: 'Go to', path: base, keywords: `${m.description} ${m.id}` })
      for (const n of m.nav ?? []) {
        if (n.to && can(n.access)) {
          entries.push({ id: `${m.id}:nav:${n.to}`, label: `${m.title}: ${n.label}`, group: 'Go to', path: `${base}/${n.to}`, keywords: m.id })
        }
      }
      for (const c of m.commands ?? []) {
        if (can(c.access)) {
          entries.push({ id: `${m.id}:cmd:${c.id}`, label: c.label, group: 'Actions', path: `${base}/${c.to}`.replace(/\/$/, ''), keywords: (c.keywords ?? []).join(' ') })
        }
      }
    }
    return entries
  }, [visibleModules, can])
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const entries = useEntries()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => `${e.label} ${e.keywords}`.toLowerCase().includes(q))
  }, [entries, query])

  const choose = (entry: Entry | undefined) => {
    if (!entry) return
    onOpenChange(false)
    setQuery('')
    navigate(entry.path)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Go to…" className="max-w-xl">
        <Input
          autoFocus
          placeholder="Search modules, pages and actions"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls="ws-command-results"
          aria-activedescendant={results[active] ? `ws-cmd-${active}` : undefined}
        />
        <ul id="ws-command-results" role="listbox" className="max-h-80 overflow-y-auto">
          {results.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted">No matches</li>}
          {results.map((entry, i) => (
            <li
              key={entry.id}
              id={`ws-cmd-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(entry)}
              className={cn('flex cursor-pointer items-center justify-between rounded px-2 py-2 text-sm', i === active && 'bg-surface-muted')}
            >
              <span>
                <span className="mr-2 text-xs uppercase text-muted">{entry.group}</span>
                {entry.label}
              </span>
              {i === active && <CornerDownLeft className="size-4 text-muted" />}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
