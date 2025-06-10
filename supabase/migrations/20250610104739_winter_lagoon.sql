/*
  # Perfis de Construção Civil - Região de Florianópolis

  1. Novos Perfis
    - 15 profissionais de construção civil variados
    - Localizados na Grande Florianópolis
    - Tags específicas da área de construção
    - Coordenadas reais da região

  2. Categorias Incluídas
    - Pedreiros, eletricistas, encanadores
    - Pintores, azulejistas, carpinteiros
    - Soldadores, vidraceiros, jardineiros
    - Técnicos em ar condicionado e outros

  3. Localização
    - Florianópolis centro e bairros
    - São José, Palhoça, Biguaçu
    - Coordenadas precisas da região
*/

-- Inserir perfis de construção civil na região de Florianópolis
INSERT INTO usuarios (
  id,
  nome,
  whatsapp,
  descricao,
  tags,
  localizacao,
  status,
  latitude,
  longitude
) VALUES 

-- PEDREIROS
(
  gen_random_uuid(),
  'Carlos Pereira',
  '+5548999123456',
  'Pedreiro com 15 anos de experiência. Especialista em alvenaria, reboco e acabamentos. Trabalho com qualidade e pontualidade.',
  ARRAY['pedreiro', 'alvenaria', 'reboco', 'construção', 'reforma'],
  'Centro, Florianópolis',
  'available',
  -27.5954,
  -48.5480
),
(
  gen_random_uuid(),
  'Roberto Silva',
  '+5548988234567',
  'Mestre de obras e pedreiro. Construção de casas, muros, calçadas. Orçamento sem compromisso.',
  ARRAY['pedreiro', 'mestre-obras', 'construção', 'muro', 'calçada'],
  'Trindade, Florianópolis',
  'available',
  -27.6010,
  -48.5190
),

-- ELETRICISTAS
(
  gen_random_uuid(),
  'Anderson Luz',
  '+5548977345678',
  'Eletricista residencial e predial. Instalações, manutenção, quadros elétricos. Trabalho com segurança e qualidade.',
  ARRAY['eletricista', 'instalação-elétrica', 'quadro-elétrico', 'manutenção'],
  'Kobrasol, São José',
  'available',
  -27.6108,
  -48.6326
),
(
  gen_random_uuid(),
  'Marcos Elétrico',
  '+5548966456789',
  'Eletricista com 12 anos de experiência. Especialista em automação residencial e sistemas de segurança.',
  ARRAY['eletricista', 'automação', 'segurança', 'interfone', 'câmeras'],
  'Campinas, São José',
  'available',
  -27.6394,
  -48.6550
),

-- ENCANADORES
(
  gen_random_uuid(),
  'José Hidráulico',
  '+5548955567890',
  'Encanador e técnico em hidráulica. Vazamentos, entupimentos, instalação de tubulações. Atendimento 24h.',
  ARRAY['encanador', 'hidráulica', 'vazamento', 'entupimento', 'tubulação'],
  'Estreito, Florianópolis',
  'available',
  -27.5840,
  -48.5692
),
(
  gen_random_uuid(),
  'Paulo Água',
  '+5548944678901',
  'Especialista em sistemas hidráulicos. Instalação de banheiros, cozinhas, piscinas e jardins.',
  ARRAY['encanador', 'banheiro', 'cozinha', 'piscina', 'jardim'],
  'Palhoça Centro',
  'available',
  -27.6386,
  -48.6703
),

-- PINTORES
(
  gen_random_uuid(),
  'Fernando Tintas',
  '+5548933789012',
  'Pintor residencial e comercial. Pintura interna, externa, textura, grafiato. Trabalho limpo e caprichado.',
  ARRAY['pintor', 'pintura', 'textura', 'grafiato', 'residencial'],
  'Lagoa da Conceição, Florianópolis',
  'available',
  -27.6167,
  -48.4549
),
(
  gen_random_uuid(),
  'Ricardo Cores',
  '+5548922890123',
  'Pintor especializado em fachadas e pinturas especiais. Verniz, esmalte, tinta epóxi. Orçamento grátis.',
  ARRAY['pintor', 'fachada', 'verniz', 'esmalte', 'epóxi'],
  'Ingleses, Florianópolis',
  'available',
  -27.4368,
  -48.3973
),

-- AZULEJISTAS
(
  gen_random_uuid(),
  'Antônio Azulejo',
  '+5548911901234',
  'Azulejista e ladrilheiro. Banheiros, cozinhas, piscinas, fachadas. Trabalho com porcelanato e cerâmica.',
  ARRAY['azulejista', 'ladrilheiro', 'porcelanato', 'cerâmica', 'banheiro'],
  'Biguaçu Centro',
  'available',
  -27.4939,
  -48.6581
),
(
  gen_random_uuid(),
  'Luiz Revestimentos',
  '+5548900012345',
  'Especialista em revestimentos. Azulejos, pastilhas, pedras naturais. Acabamento perfeito garantido.',
  ARRAY['azulejista', 'revestimento', 'pastilha', 'pedra-natural', 'acabamento'],
  'Canasvieiras, Florianópolis',
  'available',
  -27.4186,
  -48.4637
),

-- CARPINTEIROS
(
  gen_random_uuid(),
  'João Madeira',
  '+5548899123456',
  'Carpinteiro e marceneiro. Móveis sob medida, portas, janelas, deck, pergolado. Trabalho em madeira de qualidade.',
  ARRAY['carpinteiro', 'marceneiro', 'móveis', 'deck', 'pergolado'],
  'Jurerê, Florianópolis',
  'available',
  -27.4542,
  -48.4992
),

-- SOLDADORES
(
  gen_random_uuid(),
  'Miguel Solda',
  '+5548888234567',
  'Soldador e serralheiro. Portões, grades, estruturas metálicas, corrimãos. Trabalho em ferro e alumínio.',
  ARRAY['soldador', 'serralheiro', 'portão', 'grade', 'estrutura-metálica'],
  'Barreiros, São José',
  'available',
  -27.6667,
  -48.6167
),

-- VIDRACEIROS
(
  gen_random_uuid(),
  'Sérgio Vidros',
  '+5548877345678',
  'Vidraceiro especializado. Box, espelhos, vidros temperados, esquadrias de alumínio. Instalação e manutenção.',
  ARRAY['vidraceiro', 'box', 'espelho', 'vidro-temperado', 'esquadria'],
  'Coqueiros, Florianópolis',
  'available',
  -27.5667,
  -48.5167
),

-- TÉCNICO AR CONDICIONADO
(
  gen_random_uuid(),
  'Rafael Clima',
  '+5548866456789',
  'Técnico em refrigeração e ar condicionado. Instalação, manutenção, limpeza. Todas as marcas e modelos.',
  ARRAY['ar-condicionado', 'refrigeração', 'instalação', 'manutenção', 'limpeza'],
  'Itacorubi, Florianópolis',
  'available',
  -27.5833,
  -48.5000
),

-- JARDINEIRO
(
  gen_random_uuid(),
  'Eduardo Verde',
  '+5548855567890',
  'Jardineiro e paisagista. Manutenção de jardins, poda, plantio, irrigação. Deixo seu espaço verde lindo!',
  ARRAY['jardineiro', 'paisagista', 'poda', 'plantio', 'irrigação'],
  'Córrego Grande, Florianópolis',
  'available',
  -27.5833,
  -48.5167
);

-- Comentário sobre os novos perfis
COMMENT ON TABLE usuarios IS 'Tabela principal de usuários do TEX - agora com perfis de construção civil da Grande Florianópolis';