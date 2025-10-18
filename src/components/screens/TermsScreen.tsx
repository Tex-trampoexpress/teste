import React from 'react'

interface TermsScreenProps {
  renderBackButton: () => React.ReactNode
}

const TermsScreen: React.FC<TermsScreenProps> = ({ renderBackButton }) => {
  return (
    <div className="content-container">
      {renderBackButton()}
      <h1 className="page-title">
        <i className="fas fa-file-contract"></i>
        Termos de Uso
      </h1>

      <div className="terms-content">
        <div className="terms-header">
          <h2 className="terms-subtitle">Termos de Uso, Privacidade e Responsabilidade</h2>
          <p className="terms-company">TEX – TrampoExpress</p>
          <p className="terms-update">Última atualização: Outubro de 2025</p>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-info-circle"></i> 1. SOBRE O TEX</h2>
          <p>
            O TEX (TrampoExpress) é uma plataforma digital que conecta prestadores de serviços
            a pessoas que procuram profissionais próximos, de forma prática, rápida e segura.
          </p>
          <p>
            Nosso propósito é aproximar pessoas e gerar oportunidades reais de trabalho.
          </p>
          <p className="terms-important">
            <i className="fas fa-exclamation-triangle"></i>
            <strong>Importante:</strong> Ao utilizar o TEX, o usuário declara estar de acordo com estes
            Termos de Uso, Política de Privacidade e Responsabilidade.
            Se não concordar, o uso da plataforma deve ser interrompido imediatamente.
          </p>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-cogs"></i> 2. COMO FUNCIONA</h2>
          <p>
            O TEX atua como ponte de conexão entre quem precisa de um serviço e quem oferece.
            Os profissionais criam perfis com suas informações, e os clientes localizam prestadores
            próximos através da busca ou do mapa interativo.
          </p>
          <div className="terms-highlight">
            <i className="fas fa-lightbulb"></i>
            <strong>Importante:</strong> O TEX não é intermediário de pagamentos nem responsável pelas contratações.
            A negociação, o valor do serviço e o atendimento são acordados diretamente entre cliente e profissional.
          </div>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-dollar-sign"></i> 3. TAXA DE CONEXÃO</h2>
          <p>
            Para manter o funcionamento da plataforma, cada cliente paga uma taxa simbólica de
            <strong className="price"> R$ 2,02</strong> para acessar o contato de um profissional (via WhatsApp).
          </p>
          <p>
            Essa taxa é única por contato e serve exclusivamente para cobrir custos de operação e manutenção do serviço.
          </p>
          <div className="terms-highlight success">
            <i className="fas fa-gift"></i>
            Nenhuma cobrança é feita ao profissional cadastrado.
            O uso e a exposição de perfil são totalmente gratuitos.
          </div>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-user-plus"></i> 4. CADASTRO DE PROFISSIONAIS</h2>
          <p>Ao criar um perfil no TEX, o usuário profissional declara que:</p>
          <ul>
            <li>Todas as informações fornecidas são verdadeiras e atualizadas</li>
            <li>É o responsável direto pelos serviços oferecidos</li>
            <li>Autoriza o uso dos dados (nome, profissão, localização e WhatsApp) para exibição pública no app</li>
            <li>Está ciente de que pode excluir seu perfil a qualquer momento utilizando o botão "Excluir Perfil"</li>
            <li>Reconhece que perfis incompletos, falsos ou indevidos poderão ser removidos pela equipe do TEX</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-shield-alt"></i> 5. PRIVACIDADE E DADOS</h2>
          <p>
            O TEX respeita e protege sua privacidade em conformidade com a
            <strong> Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018)</strong>.
          </p>
          <h3><i className="fas fa-database"></i> Dados coletados:</h3>
          <ul>
            <li>Nome e descrição profissional</li>
            <li>Número de WhatsApp</li>
            <li>Localização (manual ou via GPS)</li>
            <li>Foto de perfil (opcional)</li>
          </ul>
          <p>
            Essas informações são usadas apenas para funcionamento da plataforma, e
            <strong> nunca são vendidas ou compartilhadas com terceiros</strong>.
          </p>
          <p>
            O usuário pode excluir seu perfil e todos os dados de forma imediata pelo próprio app,
            sem necessidade de contato adicional.
          </p>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-hand-paper"></i> 6. CONDUTA E USO RESPONSÁVEL</h2>
          <p>O usuário se compromete a:</p>
          <ul>
            <li>Manter informações verídicas e atualizadas</li>
            <li>Utilizar o TEX de forma ética e respeitosa</li>
            <li>Não divulgar conteúdos ofensivos, discriminatórios ou ilegais</li>
            <li>Não publicar serviços falsos ou de terceiros sem autorização</li>
          </ul>
          <p className="terms-warning">
            <i className="fas fa-ban"></i>
            Perfis que violem essas condições poderão ser suspensos ou removidos.
          </p>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-exclamation-circle"></i> 7. RESPONSABILIDADE</h2>
          <p>O TEX <strong>NÃO</strong> se responsabiliza por:</p>
          <ul>
            <li>Qualidade ou execução dos serviços prestados</li>
            <li>Pagamentos, atrasos ou prejuízos nas contratações</li>
            <li>Promessas, orçamentos ou acordos feitos fora da plataforma</li>
          </ul>
          <div className="terms-highlight">
            <i className="fas fa-info-circle"></i>
            O TEX fornece apenas o meio de contato entre as partes, sem intermediar ou garantir resultados.
          </div>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-lock"></i> 8. SEGURANÇA E LIMITAÇÕES</h2>
          <p>
            A plataforma utiliza infraestrutura segura baseada em criptografia,
            garantindo sigilo e estabilidade.
          </p>
          <p>
            No entanto, o usuário reconhece que, por se tratar de um ambiente online,
            podem ocorrer instabilidades, falhas temporárias ou interrupções técnicas.
          </p>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-copyright"></i> 9. PROPRIEDADE INTELECTUAL</h2>
          <p>
            Todo o conteúdo, código-fonte, design, logotipo e estrutura do TEX são de
            propriedade exclusiva de seu criador.
          </p>
          <p>
            É proibida a cópia, modificação ou redistribuição sem autorização expressa.
          </p>
        </div>

        <div className="terms-section">
          <h2><i className="fas fa-edit"></i> 10. ATUALIZAÇÕES DOS TERMOS</h2>
          <p>
            O TEX poderá alterar ou atualizar este documento a qualquer momento,
            visando melhorias e adequações legais.
          </p>
          <p>
            A versão mais recente estará sempre disponível em
            <strong> www.trampoexpress.com.br</strong> e dentro do aplicativo.
          </p>
        </div>

        <div className="terms-section contact-section">
          <h2><i className="fas fa-phone-alt"></i> 11. CONTATO</h2>
          <p>Para dúvidas, sugestões ou solicitações, entre em contato:</p>
          <div className="contact-info">
            <p><i className="fas fa-envelope"></i> <strong>Suporte WhatsApp:</strong> (48) 99635-7648</p>
            <p><i className="fas fa-globe"></i> <strong>Site:</strong> www.trampoexpress.com.br</p>
          </div>
        </div>

        <div className="terms-footer">
          <h3><i className="fas fa-tools"></i> TEX – TrampoExpress</h3>
          <p className="terms-tagline">
            Conectando o trabalhador brasileiro às oportunidades próximas
            de forma justa, acessível e transparente.
          </p>
          <p className="terms-copyright">© 2025 TEX – Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}

export default TermsScreen
