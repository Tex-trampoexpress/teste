# TEX - TrampoExpress

**Do trampo ao encontro** - Plataforma **privada** que conecta profissionais qualificados a pessoas que precisam de serviços de qualidade.

## 🔒 Projeto Privado

**IMPORTANTE**: Este é um projeto **privado e exclusivo**. Acesso restrito apenas ao proprietário.

## 🚀 Sobre o Projeto

O TEX é uma Progressive Web App (PWA) desenvolvida em React + TypeScript que facilita a conexão entre prestadores de serviços e clientes através de uma interface moderna e intuitiva.

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação
- ✅ Login via WhatsApp (sem necessidade de senha)
- ✅ Verificação automática de usuários existentes
- ✅ Sistema de sessão persistente
- ✅ Botão de login no header (todas as telas)

### 👤 Gestão de Perfil
- ✅ Criação de perfil profissional completo
- ✅ Upload de foto de perfil
- ✅ Gerenciamento de especialidades (tags)
- ✅ Status de disponibilidade (Disponível/Ocupado)
- ✅ Localização manual e automática (GPS)
- ✅ Validação automática de perfil completo
- ✅ Menu dropdown do perfil

### 🔍 Busca e Descoberta
- ✅ Busca textual por nome, descrição ou localização
- ✅ Filtro por especialidades (tags)
- ✅ Busca por proximidade geográfica
- ✅ Cálculo de distância em tempo real
- ✅ Ordenação por relevância e atividade

### 📱 Navegação e UX
- ✅ Navegação com histórico completo
- ✅ Suporte ao botão voltar nativo do celular
- ✅ Botões de volta em todas as telas
- ✅ Design responsivo (mobile-first)
- ✅ Tema escuro com gradientes dourado/ciano
- ✅ Animações e micro-interações

### 📞 Comunicação
- ✅ Contato direto via WhatsApp
- ✅ Links automáticos com mensagem pré-definida
- ✅ Preservação da privacidade dos usuários

### 🎨 Interface Visual
- ✅ Logo TEX com efeitos visuais
- ✅ Cards de perfil elegantes
- ✅ Botões com hover states
- ✅ Sistema de notificações toast
- ✅ PWA com instalação offline

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** - Biblioteca principal
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **React Hot Toast** - Notificações

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados
- **Row Level Security (RLS)** - Segurança de dados
- **Funções SQL customizadas** - Performance otimizada

### PWA
- **Service Worker** - Cache e offline
- **Web App Manifest** - Instalação nativa
- **Responsive Design** - Todos os dispositivos

## 📊 Estrutura do Banco de Dados

### Tabela `usuarios` (Otimizada)
```sql
- id (uuid, PK)
- nome (text, NOT NULL)
- whatsapp (text, UNIQUE, NOT NULL)
- descricao (text)
- tags (text[])
- foto_url (text)
- localizacao (text)
- status ('available' | 'busy')
- latitude/longitude (numeric)
- criado_em/atualizado_em/ultimo_acesso (timestamptz)
- perfil_completo (boolean, auto-calculado)
- verificado (boolean)
```

### Funções SQL Otimizadas
- ✅ `search_usuarios()` - Busca textual com filtros
- ✅ `get_users_by_proximity()` - Busca por proximidade
- ✅ `check_perfil_completo()` - Validação automática
- ✅ `update_atualizado_em()` - Timestamps automáticos

### Índices de Performance
- ✅ Índice único no WhatsApp
- ✅ Índice GIN nas tags
- ✅ Índice geográfico (lat/lng)
- ✅ Índices compostos para buscas complexas

## 🔒 Segurança e Privacidade

### Row Level Security (RLS)
- ✅ Perfis públicos apenas se disponíveis e completos
- ✅ Políticas específicas para cada operação (CRUD)
- ✅ Acesso controlado aos dados

### Validações
- ✅ Verificação de formato do WhatsApp
- ✅ Validação de campos obrigatórios
- ✅ Sanitização de dados de entrada
- ✅ Prevenção de duplicatas

## 🚀 Deploy e Produção

### Netlify (Ativo)
- **URL de Produção**: https://keen-banoffee-cc18b3.netlify.app
- ✅ Build automático via Vite
- ✅ HTTPS habilitado
- ✅ CDN global
- ✅ Deploy contínuo

### Configuração de Ambiente
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 PWA Features

### Instalação
- ✅ Prompt automático de instalação
- ✅ Ícones para todas as resoluções
- ✅ Splash screen personalizada
- ✅ Modo standalone

### Offline
- ✅ Cache de recursos estáticos
- ✅ Estratégia Network First
- ✅ Fallback para cache local
- ✅ Service Worker otimizado

## 🎯 Fluxo do Usuário (Implementado)

### 1. Primeira Visita
1. ✅ Tela inicial com busca e botão de login
2. ✅ Opção de explorar sem cadastro
3. ✅ Login via WhatsApp no header (sempre visível)

### 2. Cadastro/Login
1. ✅ Inserção do número do WhatsApp
2. ✅ Verificação automática de usuário existente
3. ✅ Redirecionamento para perfil ou feed

### 3. Criação de Perfil
1. ✅ Upload de foto (opcional)
2. ✅ Nome completo (obrigatório)
3. ✅ Descrição profissional (obrigatório)
4. ✅ Especialidades/tags (obrigatório)
5. ✅ Localização (opcional, com GPS)
6. ✅ Status inicial (disponível/ocupado)

### 4. Navegação
1. ✅ Feed de profissionais
2. ✅ Busca com filtros
3. ✅ Perfil próprio
4. ✅ Configurações via menu dropdown
5. ✅ Histórico de navegação completo
6. ✅ Botão voltar nativo funcionando

### 5. Contato
1. ✅ Visualização de perfil completo
2. ✅ Click no botão WhatsApp
3. ✅ Abertura automática com mensagem

## 🔧 Comandos de Desenvolvimento

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   └── PWAInstallPrompt.tsx
├── lib/                # Bibliotecas e utilitários
│   ├── supabase.ts     # Cliente Supabase
│   └── database.ts     # Serviços de banco
├── App.tsx             # Componente principal
├── main.tsx           # Entry point
└── index.css          # Estilos globais

public/
├── icons/             # Ícones PWA
├── manifest.json      # Web App Manifest
└── sw.js             # Service Worker

supabase/
└── migrations/        # Migrações do banco
```

## 🎨 Design System

### Cores
- **Dourado**: #FFD700 (primária)
- **Ciano**: #00FFFF (secundária)
- **Preto**: #000000 (fundo)
- **Branco**: #FFFFFF (texto)
- **Verde WhatsApp**: #25D366
- **Verde Status**: #4CAF50
- **Vermelho Status**: #f44336

### Tipografia
- **Família**: -apple-system, BlinkMacSystemFont, 'Segoe UI'
- **Logo**: Arial Black (gradiente)
- **Pesos**: 400, 600, 700, 900

### Espaçamento
- Sistema baseado em 8px
- Containers responsivos
- Breakpoints: 768px, 480px

## 📈 Performance

### Otimizações Implementadas
- ✅ Lazy loading de componentes
- ✅ Índices otimizados no banco
- ✅ Cache estratégico
- ✅ Compressão de assets
- ✅ Minificação automática

### Métricas Alvo
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

## 🔮 Roadmap Futuro

### Próximas Features Planejadas
- [ ] Sistema de avaliações e comentários
- [ ] Chat interno na plataforma
- [ ] Pagamentos integrados
- [ ] Notificações push
- [ ] Geolocalização avançada
- [ ] Filtros por preço
- [ ] Agenda de serviços
- [ ] Sistema de favoritos

### Melhorias Técnicas
- [ ] Testes automatizados
- [ ] CI/CD pipeline
- [ ] Monitoramento de erros
- [ ] Analytics de uso
- [ ] SEO otimizado
- [ ] Acessibilidade (WCAG)

## 📊 Status Atual

### ✅ Funcionalidades Completas
- Sistema de autenticação
- Gestão de perfis
- Busca e filtros
- Navegação com histórico
- PWA completa
- Deploy em produção
- Banco de dados otimizado

### 🔧 Últimas Correções
- ✅ Botão de login sempre visível no header
- ✅ Navegação com histórico completo
- ✅ Suporte ao botão voltar nativo
- ✅ Botões de volta em todas as telas
- ✅ Banco de dados reestruturado e otimizado
- ✅ Políticas RLS corrigidas
- ✅ Funções SQL otimizadas

## 🔒 Acesso e Propriedade

**IMPORTANTE**: Este projeto é de propriedade exclusiva e acesso restrito. Não deve ser compartilhado, distribuído ou utilizado por terceiros sem autorização expressa.

### Direitos
- © 2025 - Todos os direitos reservados
- Projeto privado e confidencial
- Acesso exclusivo do proprietário

### Contato
- **URL de Produção**: https://keen-banoffee-cc18b3.netlify.app
- **Status**: Ativo e funcionando

---

**Desenvolvido com ❤️ como projeto pessoal e exclusivo**