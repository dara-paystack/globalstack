import '@fontsource-variable/inter'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function bootstrap() {
  // Start Mock Service Worker — runs in all environments since this is a prototype
  // with no real backend. MSW intercepts all /api/* requests with fixture data.
  const { worker } = await import('./mocks/browser.js')
  await worker.start({
    onUnhandledRequest: 'bypass',
  })

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
