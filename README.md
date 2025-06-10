# TEX - TrampoExpress

**Do trampo ao encontro** - Plataforma que conecta profissionais qualificados a pessoas que precisam de serviços de qualidade.

## 🚀 Sobre o Projeto

O TEX é uma Progressive Web App (PWA) desenvolvida em React + TypeScript que facilita a conexão entre prestadores de serviços e clientes através de uma interface moderna e intuitiva.

## ✨ Funcionalidades

### 🔐 Autenticação
- Login via WhatsApp (sem necessidade de senha)
- Verificação automática de usuários existentes
- Sistema de sessão persistente

### 👤 Gestão de Perfil
- Criação de perfil profissional completo
- Upload de foto de perfil
- Gerenciamento de especialidades (tags)
- Status de disponibilidade (Disponível/Ocupado)
- Localização manual e automática (GPS)
- Validação automática de perfil completo

### 🔍 Busca e Descoberta
- Busca textual por nome, descrição ou localização
- Filtro por especialidades (tags)
- Busca por proximidade geográfica
- Cálculo de distância em tempo real
- Ordenação por relevância e atividade

### 📱 Comunicação
- Contato direto via WhatsApp
- Links automáticos com mensagem pré-definida
- Preservação da privacidade dos usuários

### 🎨 Interface e UX
- Design responsivo (mobile-first)
- Tema escuro com gradientes dourado/ciano
- Animações e micro-interações
- Navegação intuitiva com histórico
- Suporte ao botão voltar nativo do celular
- PWA com instalação offline

## 🛠️ Tecnologias Utilizadas

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

### Tabela `usuarios`
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
- `search_usuarios()` - Busca textual com filtros
- `get_users_by_proximity()` - Busca por proximidade
- `check_perfil_completo()` - Validação automática
- `update_atualizado_em()` - Timestamps automáticos

### Índices de Performance
- Índice único no WhatsApp
- Índice GIN nas tags
- Índice geográfico (lat/lng)
- Índices compostos para buscas complexas

## 🔒 Segurança

### Row Level Security (RLS)
- Perfis públicos apenas se disponíveis e completos
- Usuários podem gerenciar apenas seus próprios dados
- Políticas específicas para cada operação (CRUD)

### Validações
- Verificação de formato do WhatsApp
- Validação de campos obrigatórios
- Sanitização de dados de entrada
- Prevenção de duplicatas

## 🚀 Deploy

### Netlify (Atual)
- **URL de Produção**: https://keen-banoffee-cc18b3.netlify.app
- Build automático via Vite
- HTTPS habilitado
- CDN global

### Configuração de Ambiente
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 PWA Features

### Instalação
- Prompt automático de instalação
- Ícones para todas as resoluções
- Splash screen personalizada
- Modo standalone

### Offline
- Cache de recursos estáticos
- Estratégia Network First
- Fallback para cache local
- Service Worker otimizado

## 🎯 Fluxo do Usuário

### 1. Primeira Visita
1. Tela inicial com busca e botão de login
2. Opção de explorar sem cadastro
3. Login via WhatsApp no canto superior direito

### 2. Cadastro/Login
1. Inserção do número do WhatsApp
2. Verificação automática de usuário existente
3. Redirecionamento para perfil ou feed

### 3. Criação de Perfil
1. Upload de foto (opcional)
2. Nome completo (obrigatório)
3. Descrição profissional (obrigatório)
4. Especialidades/tags (obrigatório)
5. Localização (opcional, com GPS)
6. Status inicial (disponível/ocupado)

### 4. Navegação
1. Feed de profissionais
2. Busca com filtros
3. Perfil próprio
4. Configurações via menu dropdown

### 5. Contato
1. Visualização de perfil completo
2. Click no botão WhatsApp
3. Abertura automática com mensagem

## 🔧 Desenvolvimento

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

### Otimizações
- Lazy loading de componentes
- Índices otimizados no banco
- Cache estratégico
- Compressão de assets
- Minificação automática

### Métricas
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

## 🔮 Roadmap

### Próximas Features
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

## 📄 Licença

© 2025 TrampoExpress. Todos os direitos reservados.

## 🤝 Contribuição

Este é um projeto proprietário. Para contribuições ou sugestões, entre em contato através dos canais oficiais.

## 📞 Suporte

- **Instagram**: [@tex.app](https://instagram.com/tex.app)
- **Email**: contato@tex.app
- **Site**: https://keen-banoffee-cc18b3.netlify.app

---

**Desenvolvido com ❤️ para conectar pessoas e oportunidades**