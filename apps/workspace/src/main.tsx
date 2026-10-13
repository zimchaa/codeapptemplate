import { WorkspaceApp } from '@codeapps/platform'
import '@codeapps/ui/themes.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { workspaceConfig } from './workspace.config.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkspaceApp config={workspaceConfig} defaultTheme="foundation-red" />
  </StrictMode>,
)
