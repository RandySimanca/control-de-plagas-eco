import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OfflineProvider } from './contexts/OfflineContext'
import { Toaster } from 'react-hot-toast'
import AppRoutes from './AppRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { 
                borderRadius: '12px', 
                background: '#1e293b', 
                color: '#fff', 
                fontSize: '14px' 
              }
            }}
          />
          <AppRoutes />
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
