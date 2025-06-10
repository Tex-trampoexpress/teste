# Guia de Contribuição

Obrigado pelo interesse em contribuir com o TEX! Este documento fornece diretrizes para contribuições.

## 📋 Antes de Começar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase (para desenvolvimento)
- Git configurado

### Configuração do Ambiente
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente (`.env`)
4. Execute o projeto: `npm run dev`

## 🔧 Desenvolvimento

### Estrutura de Branches
- `main` - Produção (protegida)
- `develop` - Desenvolvimento principal
- `feature/nome-da-feature` - Novas funcionalidades
- `fix/nome-do-bug` - Correções de bugs
- `hotfix/nome-do-hotfix` - Correções urgentes

### Padrões de Código

#### TypeScript
- Use tipagem estrita
- Evite `any`, prefira tipos específicos
- Documente interfaces complexas
- Use enums para constantes

#### React
- Componentes funcionais com hooks
- Props tipadas com interfaces
- Use `useCallback` e `useMemo` quando necessário
- Evite re-renders desnecessários

#### CSS
- Use Tailwind CSS quando possível
- Variáveis CSS para cores e espaçamentos
- Mobile-first approach
- Animações suaves (0.3s ease)

#### Banco de Dados
- Sempre use migrações para mudanças
- Documente funções SQL complexas
- Mantenha índices otimizados
- Teste políticas RLS

### Commits
Use o padrão Conventional Commits:

```
tipo(escopo): descrição

feat(auth): adicionar login via Google
fix(profile): corrigir upload de imagem
docs(readme): atualizar instruções de instalação
style(ui): ajustar espaçamento dos cards
refactor(database): otimizar query de busca
test(api): adicionar testes para endpoints
chore(deps): atualizar dependências
```

### Testes
- Teste todas as funcionalidades críticas
- Inclua testes de integração
- Verifique responsividade
- Teste em diferentes navegadores

## 🚀 Pull Requests

### Checklist
- [ ] Código segue os padrões estabelecidos
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] Sem conflitos com a branch principal
- [ ] Funcionalidade testada manualmente
- [ ] Performance verificada

### Template de PR
```markdown
## Descrição
Breve descrição das mudanças

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## Como Testar
1. Passos para reproduzir
2. Comportamento esperado
3. Screenshots (se aplicável)

## Checklist
- [ ] Código revisado
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
```

## 🐛 Reportando Bugs

### Template de Issue
```markdown
## Descrição do Bug
Descrição clara e concisa do problema

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

## Comportamento Esperado
O que deveria acontecer

## Screenshots
Se aplicável, adicione screenshots

## Ambiente
- OS: [ex: iOS]
- Browser: [ex: Chrome, Safari]
- Versão: [ex: 22]
- Dispositivo: [ex: iPhone 12]
```

## 💡 Sugerindo Funcionalidades

### Template de Feature Request
```markdown
## Resumo da Funcionalidade
Descrição clara da funcionalidade desejada

## Problema que Resolve
Qual problema esta funcionalidade resolve?

## Solução Proposta
Como você imagina que isso funcionaria?

## Alternativas Consideradas
Outras soluções que você considerou

## Contexto Adicional
Qualquer outra informação relevante
```

## 📚 Documentação

### Atualizações Necessárias
- README.md para mudanças significativas
- CHANGELOG.md para todas as mudanças
- Comentários no código para lógica complexa
- Documentação de API para novos endpoints

## 🔒 Segurança

### Diretrizes
- Nunca commite credenciais
- Use variáveis de ambiente
- Valide todos os inputs
- Implemente rate limiting
- Mantenha dependências atualizadas

### Reportando Vulnerabilidades
Para questões de segurança, envie email para: security@tex.app

## 📞 Suporte

### Canais de Comunicação
- Issues do GitHub para bugs e features
- Discussions para perguntas gerais
- Email para questões privadas

### Tempo de Resposta
- Issues críticas: 24h
- Bugs: 48h
- Features: 1 semana
- Documentação: 72h

## 🎯 Roadmap

### Prioridades Atuais
1. Sistema de avaliações
2. Chat interno
3. Pagamentos integrados
4. Notificações push

### Como Contribuir
1. Escolha uma issue marcada como "good first issue"
2. Comente na issue manifestando interesse
3. Aguarde aprovação do maintainer
4. Desenvolva seguindo as diretrizes
5. Abra um Pull Request

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença do projeto.

---

**Obrigado por contribuir com o TEX! 🚀**