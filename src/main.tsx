import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Debug para verificar se o script está carregando
console.log('🚀 TEX App iniciando...')

// Verificar se o elemento root existe
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Elemento root não encontrado!')
} else {
  console.log('✅ Elemento root encontrado')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,