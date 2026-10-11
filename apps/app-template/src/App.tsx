import { useEffect, useState } from 'react'
import { StatusCard } from '@codeapps/components'
import type { CurrentUser, WorkItem } from '@codeapps/data'
import { dataMode, dataServicePromise } from './data.ts'
import { CompanyButton } from './ui/company.ts'
import './App.css'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; user: CurrentUser; items: WorkItem[] }
  | { kind: 'error'; message: string }

function App() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    dataServicePromise
      .then((service) => Promise.all([service.getCurrentUser(), service.listItems()]))
      .then(([user, items]) => {
        if (!cancelled) setState({ kind: 'ready', user, items })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = () => {
    setState({ kind: 'loading' })
    setReloadKey((key) => key + 1)
  }

  return (
    <main className="app">
      <header>
        <h1>Code App Template</h1>
        <p className="mode">
          Data mode: <code>{dataMode}</code>
        </p>
      </header>

      {state.kind === 'loading' && <StatusCard title="Loading…" />}

      {state.kind === 'error' && (
        <StatusCard title="Could not load data" tone="warning">
          {state.message}
          {dataMode === 'powerapps' && (
            <p>Power Apps mode only works inside the Local Play URL or a published app.</p>
          )}
        </StatusCard>
      )}

      {state.kind === 'ready' && (
        <>
          <StatusCard title={`Hello, ${state.user.displayName}`} tone="success">
            {state.user.email ?? 'No email available'}
          </StatusCard>

          <section className="items" aria-label="Items">
            <h2>Items</h2>
            {state.items.length === 0 ? (
              <p>No items. Add a data source and wire it up in src/data.ts.</p>
            ) : (
              <ul>
                {state.items.map((item) => (
                  <li key={item.id} data-status={item.status}>
                    {item.title}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <CompanyButton onClick={reload}>Reload</CompanyButton>
    </main>
  )
}

export default App
