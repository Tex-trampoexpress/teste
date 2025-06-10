# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.0.0] - 2025-01-10

### ✨ Adicionado
- Sistema completo de autenticação via WhatsApp
- Criação e edição de perfis profissionais
- Upload de fotos de perfil
- Sistema de tags/especialidades
- Busca textual e por proximidade geográfica
- Geolocalização automática via GPS
- Status de disponibilidade (Disponível/Ocupado)
- Contato direto via WhatsApp
- Progressive Web App (PWA) completa
- Design responsivo com tema escuro
- Navegação com histórico e suporte ao botão voltar nativo
- Menu dropdown do perfil
- Botão de login no header
- Sistema de notificações toast
- Cache offline com Service Worker

### 🛠️ Técnico
- React 18 + TypeScript
- Vite como build tool
- Supabase como backend
- PostgreSQL com funções SQL otimizadas
- Row Level Security (RLS)
- Índices de performance
- Validação automática de perfil completo
- Triggers para timestamps automáticos

### 🎨 Design
- Tema escuro com gradientes dourado/ciano
- Animações e micro-interações
- Logo TEX com efeitos visuais
- Cards de perfil elegantes
- Botões com hover states
- Layout mobile-first
- Tipografia otimizada

### 🔒 Segurança
- Políticas RLS no Supabase
- Validação de dados no frontend e backend
- Sanitização de inputs
- Prevenção de duplicatas
- Verificação de formato WhatsApp

### 📱 PWA
- Manifest.json configurado
- Service Worker para cache
- Ícones para todas as resoluções
- Prompt de instalação automático
- Modo standalone
- Splash screen personalizada

### 🚀 Deploy
- Deploy automático no Netlify
- URL de produção: https://keen-banoffee-cc18b3.netlify.app
- HTTPS habilitado
- CDN global

## [0.1.0] - 2025-01-09

### ✨ Inicial
- Estrutura básica do projeto
- Configuração do Vite + React
- Integração com Supabase
- Primeiras telas e componentes