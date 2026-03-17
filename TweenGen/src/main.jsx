import React from 'react'
import ReactDOM from 'react-dom/client'
import { RecoilRoot } from 'recoil'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import './index.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RecoilRoot>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </RecoilRoot>
  </React.StrictMode>,
)