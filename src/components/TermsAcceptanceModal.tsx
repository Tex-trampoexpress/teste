import React, { useState } from 'react'

interface TermsAcceptanceModalProps {
  userType: 'client' | 'provider'
  onAccept: () => void
  onDecline: () => void
}

const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({ userType, onAccept, onDecline }) => {
  const [hasScrolled, setHasScrolled] = useState(false)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50
    if (scrolledToBottom && !hasScrolled) {
      setHasScrolled(true)
    }
  }

  const clientTerms = (
    <>
      <h2 className="terms-modal-title">
        <i className="fas fa-file-signature"></i>
        Termos de Uso - Cliente
      </h2>

      <div className="terms-modal-section">
        <h3><i className="fas fa-info-circle"></i> Bem-vindo ao TEX</h3>
        <p>
          Ao utilizar o TEX como cliente, você concorda com os seguintes termos:
        </p>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-search"></i> 1. Uso da Plataforma</h3>
        <ul>
          <li>O TEX conecta você a prestadores de serviços próximos de forma prática e rápida</li>
          <li>Você pode buscar profissionais por nome, serviço ou localização</li>
          <li>A plataforma exibe informações públicas dos prestadores cadastrados</li>
        </ul>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-dollar-sign"></i> 2. Taxa de Conexão</h3>
        <ul>
          <li>Para acessar o contato de um prestador (WhatsApp), é cobrada uma taxa única de <strong>R$ 2,02</strong></li>
          <li>Essa taxa mantém a plataforma funcionando e é cobrada apenas uma vez por contato</li>
          <li>O pagamento é processado de forma segura via Mercado Pago</li>
          <li>Após o pagamento, o contato do profissional é liberado imediatamente</li>
        </ul>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-exclamation-triangle"></i> 3. Responsabilidades</h3>
        <p className="terms-modal-warning">
          <i className="fas fa-info-circle"></i>
          O TEX <strong>NÃO</strong> se responsabiliza por:
        </p>
        <ul>
          <li>Qualidade ou execução dos serviços prestados</li>
          <li>Negociações, valores ou acordos entre você e o prestador</li>
          <li>Pagamentos feitos diretamente ao profissional</li>
          <li>Atrasos, cancelamentos ou problemas no atendimento</li>
        </ul>
        <p className="terms-modal-highlight">
          <i className="fas fa-lightbulb"></i>
          <strong>Importante:</strong> O TEX apenas conecta você ao profissional.
          Toda negociação acontece diretamente entre as partes.
        </p>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-shield-alt"></i> 4. Privacidade</h3>
        <ul>
          <li>Seus dados de navegação são protegidos e não são compartilhados com terceiros</li>
          <li>As informações de pagamento são processadas de forma segura pelo Mercado Pago</li>
          <li>O TEX coleta apenas dados necessários para o funcionamento da plataforma</li>
        </ul>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-handshake"></i> 5. Conduta</h3>
        <p>Ao usar o TEX, você se compromete a:</p>
        <ul>
          <li>Utilizar a plataforma de forma ética e respeitosa</li>
          <li>Não utilizar os contatos obtidos para fins ilícitos ou spam</li>
          <li>Respeitar os profissionais e manter comunicação cordial</li>
        </ul>
      </div>

      <div className="terms-modal-footer">
        <p>
          <i className="fas fa-check-circle"></i>
          Ao aceitar, você declara ter lido e concordado com estes termos e com a
          <strong> Política de Privacidade</strong> do TEX.
        </p>
      </div>
    </>
  )

  const providerTerms = (
    <>
      <h2 className="terms-modal-title">
        <i className="fas fa-file-signature"></i>
        Termos de Uso - Prestador de Serviços
      </h2>

      <div className="terms-modal-section">
        <h3><i className="fas fa-info-circle"></i> Bem-vindo ao TEX</h3>
        <p>
          Ao criar seu perfil no TEX como prestador de serviços, você concorda com os seguintes termos:
        </p>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-user-plus"></i> 1. Cadastro e Perfil</h3>
        <p>Ao criar seu perfil, você declara que:</p>
        <ul>
          <li>Todas as informações fornecidas são verdadeiras e atualizadas</li>
          <li>É o responsável direto pelos serviços oferecidos</li>
          <li>Possui capacidade legal para prestar os serviços anunciados</li>
          <li>Autoriza a exibição pública de seus dados (nome, foto, localização, WhatsApp e descrição)</li>
        </ul>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-gift"></i> 2. Gratuidade</h3>
        <ul>
          <li><strong>O cadastro e uso da plataforma são 100% gratuitos para prestadores</strong></li>
          <li>Não há mensalidades, taxas de adesão ou comissões sobre serviços</li>
          <li>Seu perfil fica visível para clientes num raio de até 100km</li>
          <li>Você recebe todas as oportunidades de contato sem custo</li>
        </ul>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-handshake"></i> 3. Funcionamento</h3>
        <ul>
          <li>Clientes encontram seu perfil pela busca ou proximidade</li>
          <li>Para acessar seu WhatsApp, o cliente paga uma taxa de R$ 2,02</li>
          <li>Essa taxa é apenas para manter a plataforma funcionando</li>
          <li>Você não paga nada e recebe os contatos diretamente no WhatsApp</li>
        </ul>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-exclamation-triangle"></i> 4. Responsabilidades</h3>
        <p>Você é totalmente responsável por:</p>
        <ul>
          <li>Qualidade e execução dos serviços oferecidos</li>
          <li>Prazos, valores e condições acordadas com clientes</li>
          <li>Atendimento, negociação e relacionamento com o cliente</li>
          <li>Cumprimento de leis, licenças e regulamentações de sua atividade</li>
        </ul>
        <p className="terms-modal-warning">
          <i className="fas fa-info-circle"></i>
          O TEX <strong>NÃO</strong> intermedia negociações, pagamentos ou garante contratos.
          Somos apenas uma vitrine que conecta você a potenciais clientes.
        </p>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-shield-alt"></i> 5. Privacidade e Dados</h3>
        <ul>
          <li>Seus dados são protegidos conforme a LGPD (Lei nº 13.709/2018)</li>
          <li>Nunca vendemos ou compartilhamos suas informações com terceiros</li>
          <li>Você pode editar ou excluir seu perfil a qualquer momento pelo app</li>
          <li>Ao excluir, todos os seus dados são removidos imediatamente</li>
        </ul>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-hand-paper"></i> 6. Conduta e Ética</h3>
        <p>Você se compromete a:</p>
        <ul>
          <li>Manter informações verdadeiras e atualizadas</li>
          <li>Utilizar o TEX de forma ética e respeitosa</li>
          <li>Não divulgar conteúdos ofensivos, discriminatórios ou ilegais</li>
          <li>Não publicar serviços falsos ou de terceiros sem autorização</li>
          <li>Atender os clientes com profissionalismo e respeito</li>
        </ul>
        <p className="terms-modal-warning">
          <i className="fas fa-ban"></i>
          Perfis que violem essas condições poderão ser suspensos ou removidos sem aviso prévio.
        </p>
      </div>

      <div className="terms-modal-section">
        <h3><i className="fas fa-tools"></i> 7. Controle do Perfil</h3>
        <ul>
          <li>Você pode editar seus dados a qualquer momento</li>
          <li>Pode alterar status entre "Disponível" e "Ocupado"</li>
          <li>Pode excluir seu perfil definitivamente quando quiser</li>
          <li>Mantém controle total sobre sua visibilidade e informações</li>
        </ul>
      </div>

      <div className="terms-modal-footer">
        <p>
          <i className="fas fa-check-circle"></i>
          Ao aceitar, você declara ter lido e concordado com estes termos, com os
          <strong> Termos Gerais de Uso</strong> e com a <strong>Política de Privacidade</strong> do TEX.
        </p>
      </div>
    </>
  )

  return (
    <div className="terms-modal-overlay">
      <div className="terms-modal-container">
        <div className="terms-modal-content" onScroll={handleScroll}>
          {userType === 'client' ? clientTerms : providerTerms}
        </div>

        <div className="terms-modal-actions">
          <button
            className="terms-modal-btn decline"
            onClick={onDecline}
          >
            <i className="fas fa-times"></i>
            Recusar
          </button>
          <button
            className="terms-modal-btn accept"
            onClick={onAccept}
            disabled={!hasScrolled}
            title={!hasScrolled ? 'Role até o final para aceitar' : ''}
          >
            <i className="fas fa-check"></i>
            Aceitar Termos
          </button>
        </div>

        {!hasScrolled && (
          <div className="terms-modal-hint">
            <i className="fas fa-arrow-down"></i>
            Role até o final para aceitar os termos
          </div>
        )}
      </div>
    </div>
  )
}

export default TermsAcceptanceModal
