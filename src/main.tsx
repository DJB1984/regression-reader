import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SessionStore } from './context/SessionStore.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionStore>
      <App />
    </SessionStore>
  </StrictMode>,
)
