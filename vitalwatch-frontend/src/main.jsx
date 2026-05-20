import { StrictMode }    from 'react'
import { createRoot }    from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider }  from './hooks/useAuth.jsx'
import { ThemeProvider } from './hooks/useTheme.jsx'
import App from './App.jsx'
import './styles/main.css'
import './styles/components.css'
import './styles/charts.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
