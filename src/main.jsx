import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.jsx'
import Sidebar from './components/Sidebar'

function AppLayout() {
  const { pathname } = useLocation()
  const hideSidebar = pathname.startsWith('/parents')

  return (
    <div className="min-h-screen flex">
      {!hideSidebar && <Sidebar />}
      <main className="flex-1">
        <App />
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <AppLayout />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
