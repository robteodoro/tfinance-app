// =============================================================================
// Glossário: explicações acessíveis de cada indicador e conceito.
//
// Cada verbete tem:
//   titulo     - nome do conceito
//   categoria  - agrupamento na página do glossário
//   resumo     - uma frase curta
//   texto      - explicação completa (HTML simples: <p>, <ul>, <strong>)
//
// Os botões "?" espalhados pelo aplicativo abrem estes verbetes.
// =============================================================================

export const CATEGORIAS = [
  'Economia',
  'Renda fixa',
  'Impostos e custos',
  'Matemática financeira',
  'Ações',
  'Fundos imobiliários',
  'Risco',
];

export const GLOSSARIO = {
  // ---------------------------------------------------------------- Economia
  selic: {
    titulo: 'Taxa Selic',
    categoria: 'Economia',
    resumo: 'A taxa básica de juros da economia brasileira, definida pelo Banco Central.',
    texto: `
      <p>A Selic é a principal ferramenta do Banco Central para controlar a inflação.
      O Comitê de Política Monetária (Copom) se reúne a cada 45 dias e define a
      <strong>meta</strong> da Selic.</p>
      <p>Quando a Selic sobe, os investimentos de renda fixa passam a render mais e
      os empréstimos ficam mais caros. Quando cai, acontece o contrário.</p>`,
  },
  cdi: {
    titulo: 'CDI',
    categoria: 'Economia',
    resumo: 'Taxa de juros dos empréstimos entre bancos; referência para a maioria dos investimentos pós-fixados.',
    texto: `
      <p>O CDI (Certificado de Depósito Interbancário) é a taxa que os bancos cobram
      entre si em empréstimos de um dia. Na prática, fica sempre muito próxima da
      Selic (cerca de 0,10 ponto percentual abaixo).</p>
      <p>Quando um investimento promete "110% do CDI", ele rende 10% a mais do que o
      CDI rende a cada dia. É a forma mais comum de remunerar CDBs, LCIs e LCAs.</p>`,
  },
  ipca: {
    titulo: 'IPCA (inflação)',
    categoria: 'Economia',
    resumo: 'O índice oficial de inflação do Brasil, medido pelo IBGE.',
    texto: `
      <p>O IPCA mede quanto subiram, em média, os preços de produtos e serviços
      consumidos pelas famílias. É o índice usado na meta de inflação do governo.</p>
      <p>Um investimento só aumenta seu poder de compra se render <strong>acima</strong>
      da inflação. Por isso existem aplicações "IPCA + taxa", que garantem a
      correção pela inflação mais um ganho adicional.</p>`,
  },
  tr: {
    titulo: 'TR (Taxa Referencial)',
    categoria: 'Economia',
    resumo: 'Taxa calculada pelo Banco Central, usada na correção da poupança e do FGTS.',
    texto: `
      <p>A TR é calculada a partir dos juros praticados pelos bancos. Quando a Selic
      está baixa, a TR costuma ficar próxima de zero; com Selic alta, ela fica um
      pouco acima de zero e soma-se ao rendimento da poupança.</p>`,
  },
  focus: {
    titulo: 'Boletim Focus',
    categoria: 'Economia',
    resumo: 'Pesquisa semanal do Banco Central com as projeções de economistas para juros, inflação e outros indicadores.',
    texto: `
      <p>Toda semana o Banco Central consulta cerca de 100 instituições financeiras
      sobre o que esperam para Selic, inflação, câmbio e crescimento. O Focus
      publica a <strong>mediana</strong> dessas projeções.</p>
      <p>É a melhor referência pública do que o mercado espera, mas
      <strong>projeções erram</strong>, principalmente para prazos longos.
      Use-as como cenário, não como certeza.</p>`,
  },

  // -------------------------------------------------------------- Renda fixa
  'renda-fixa': {
    titulo: 'Renda fixa',
    categoria: 'Renda fixa',
    resumo: 'Investimentos em que você empresta dinheiro e a forma de remuneração é combinada no início.',
    texto: `
      <p>Ao investir em renda fixa você empresta dinheiro a um banco, empresa ou ao
      governo, que devolve o valor com juros. "Fixa" se refere à <strong>regra</strong>
      de remuneração ser conhecida desde o começo — não necessariamente o valor
      final, que pode depender do CDI ou da inflação.</p>`,
  },
  prefixado: {
    titulo: 'Prefixado',
    categoria: 'Renda fixa',
    resumo: 'Rentabilidade definida no momento da aplicação. Ex.: 14% ao ano.',
    texto: `
      <p>Você sabe exatamente quanto vai receber no vencimento. É vantajoso quando
      os juros caem depois da sua aplicação, e desvantajoso quando sobem
      (você fica "preso" a uma taxa menor) ou quando a inflação surpreende para cima.</p>`,
  },
  posfixado: {
    titulo: 'Pós-fixado (% do CDI ou Selic)',
    categoria: 'Renda fixa',
    resumo: 'Rentabilidade que acompanha a taxa de juros ao longo do tempo.',
    texto: `
      <p>O rendimento segue o CDI ou a Selic de cada dia. Se os juros subirem, você
      ganha mais; se caírem, ganha menos. É a opção mais previsível para reserva de
      emergência, porque o valor quase não oscila.</p>`,
  },
  hibrido: {
    titulo: 'Híbrido (IPCA + taxa)',
    categoria: 'Renda fixa',
    resumo: 'Corrige o dinheiro pela inflação e soma uma taxa fixa por cima.',
    texto: `
      <p>Ex.: IPCA + 6% ao ano. Se a inflação do ano for 4%, o rendimento será de
      aproximadamente 10,2% (as taxas se multiplicam: 1,04 × 1,06).</p>
      <p>A parte "+ 6%" é chamada de <strong>juro real</strong>: o ganho acima da
      inflação. É uma forma de proteger o poder de compra no longo prazo.</p>`,
  },
  cdb: {
    titulo: 'CDB, RDB e LC',
    categoria: 'Renda fixa',
    resumo: 'Empréstimos que você faz a bancos e financeiras. Tributados pelo IR e garantidos pelo FGC.',
    texto: `
      <p>CDB (Certificado de Depósito Bancário), RDB (Recibo de Depósito Bancário) e
      LC (Letra de Câmbio) funcionam da mesma forma: você empresta ao banco ou
      financeira e recebe juros. Pagam Imposto de Renda e têm proteção do FGC.</p>
      <p>Bancos menores costumam pagar taxas maiores para atrair investidores.</p>`,
  },
  'lci-lca': {
    titulo: 'LCI e LCA',
    categoria: 'Renda fixa',
    resumo: 'Letras de crédito imobiliário e do agronegócio. Isentas de IR para pessoa física e garantidas pelo FGC.',
    texto: `
      <p>Funcionam como um CDB, mas o dinheiro é destinado a financiar os setores
      imobiliário (LCI) ou agrícola (LCA). Por isso o governo isenta o
      rendimento de Imposto de Renda para pessoas físicas.</p>
      <p>Costumam ter <strong>carência</strong> (prazo mínimo antes de poder resgatar)
      e taxas nominalmente menores — compare sempre pela taxa equivalente.</p>`,
  },
  'cri-cra': {
    titulo: 'CRI e CRA',
    categoria: 'Renda fixa',
    resumo: 'Títulos lastreados em dívidas imobiliárias ou do agronegócio. Isentos de IR, mas SEM garantia do FGC.',
    texto: `
      <p>Certificados de Recebíveis são emitidos por securitizadoras a partir de
      dívidas de empresas. São isentos de IR, mas o risco é da empresa devedora:
      não há FGC. Costumam ter baixa liquidez (difícil vender antes do vencimento).</p>`,
  },
  debenture: {
    titulo: 'Debêntures',
    categoria: 'Renda fixa',
    resumo: 'Títulos de dívida emitidos por empresas. As "incentivadas" (infraestrutura) são isentas de IR.',
    texto: `
      <p>Ao comprar uma debênture você empresta dinheiro diretamente a uma empresa.
      Não há FGC: se a empresa quebrar, você pode perder dinheiro. Por isso pagam
      mais que títulos bancários.</p>
      <p>Debêntures <strong>incentivadas</strong> financiam projetos de infraestrutura e
      são isentas de IR para pessoa física.</p>`,
  },
  'tesouro-direto': {
    titulo: 'Tesouro Direto',
    categoria: 'Renda fixa',
    resumo: 'Títulos públicos federais vendidos a pessoas físicas. Considerados o investimento mais seguro do país.',
    texto: `
      <p>Você empresta dinheiro ao governo federal. Os principais títulos são:</p>
      <ul>
        <li><strong>Tesouro Selic</strong>: pós-fixado, rende a Selic. Indicado para
        reserva de emergência.</li>
        <li><strong>Tesouro Prefixado</strong>: taxa fixa definida na compra.</li>
        <li><strong>Tesouro IPCA+</strong>: inflação mais uma taxa real.</li>
        <li><strong>Renda+ e Educa+</strong>: pagam renda mensal no futuro, para
        aposentadoria ou educação.</li>
      </ul>
      <p>Pagam IR regressivo e taxa de custódia da B3. Prefixados e IPCA+ sofrem
      <strong>marcação a mercado</strong> se vendidos antes do vencimento.</p>`,
  },
  poupanca: {
    titulo: 'Poupança',
    categoria: 'Renda fixa',
    resumo: 'Isenta de IR e garantida pelo FGC, mas costuma render menos que outras opções seguras.',
    texto: `
      <p>Regra atual: com a Selic acima de 8,5% ao ano, rende 0,5% ao mês + TR.
      Com a Selic igual ou abaixo de 8,5%, rende 70% da Selic + TR.</p>
      <p>O rendimento só é creditado no "aniversário" mensal do depósito: sacar
      antes faz perder o mês. Aqui ela serve como referência de comparação.</p>`,
  },
  fgc: {
    titulo: 'FGC (Fundo Garantidor de Créditos)',
    categoria: 'Renda fixa',
    resumo: 'Garante a devolução de até R$ 250 mil por CPF por instituição se um banco quebrar.',
    texto: `
      <p>Cobre CDB, RDB, LC, LCI, LCA e poupança, até R$ 250 mil por CPF e por
      instituição financeira (com teto global de R$ 1 milhão a cada 4 anos).
      Não cobre Tesouro Direto (que tem garantia do próprio governo), CRI, CRA
      nem debêntures.</p>`,
  },
  'marcacao-mercado': {
    titulo: 'Marcação a mercado',
    categoria: 'Renda fixa',
    resumo: 'Variação diária do preço de um título conforme as taxas de juros do mercado.',
    texto: `
      <p>Se você comprou um título prefixado a 14% e depois as taxas de mercado
      sobem para 16%, ninguém vai querer pagar o preço cheio pelo seu título:
      o preço de venda cai. Se as taxas caem, o preço sobe.</p>
      <p><strong>Levando até o vencimento</strong> você recebe exatamente a taxa
      contratada. Vendendo antes, pode ganhar ou perder. Este simulador considera
      sempre o resgate no vencimento.</p>`,
  },
  liquidez: {
    titulo: 'Liquidez',
    categoria: 'Renda fixa',
    resumo: 'A facilidade de transformar o investimento em dinheiro sem perder valor.',
    texto: `
      <p>Liquidez diária significa poder resgatar a qualquer dia. Aplicações com
      carência ou vencimento longo costumam pagar mais justamente porque você
      abre mão de ter o dinheiro disponível.</p>`,
  },

  // ------------------------------------------------------- Impostos e custos
  'imposto-renda': {
    titulo: 'Imposto de Renda regressivo',
    categoria: 'Impostos e custos',
    resumo: 'Quanto mais tempo o dinheiro fica aplicado, menor o imposto sobre o rendimento.',
    texto: `
      <p>Na renda fixa tributada, o IR incide <strong>só sobre o rendimento</strong>,
      não sobre o valor aplicado, e é descontado automaticamente no resgate:</p>
      <ul>
        <li>até 180 dias: 22,5%</li>
        <li>de 181 a 360 dias: 20%</li>
        <li>de 361 a 720 dias: 17,5%</li>
        <li>acima de 720 dias: 15%</li>
      </ul>
      <p>Com aportes mensais, cada aporte tem seu próprio prazo e, portanto,
      sua própria alíquota.</p>`,
  },
  iof: {
    titulo: 'IOF',
    categoria: 'Impostos e custos',
    resumo: 'Imposto cobrado apenas em resgates feitos antes de 30 dias.',
    texto: `
      <p>Começa em 96% do rendimento no 1º dia e cai até zero no 30º dia. É cobrado
      antes do IR. Na prática, só importa para quem resgata muito rápido.</p>`,
  },
  isencao: {
    titulo: 'Isenção de IR',
    categoria: 'Impostos e custos',
    resumo: 'LCI, LCA, CRI, CRA, debêntures incentivadas e poupança não pagam IR para pessoa física.',
    texto: `
      <p>Por isso uma LCI a 90% do CDI pode render mais que um CDB a 105% do CDI.
      Para comparar, use a <strong>taxa equivalente</strong>.</p>`,
  },
  custodia: {
    titulo: 'Taxa de custódia',
    categoria: 'Impostos e custos',
    resumo: 'Taxa cobrada pela B3 para guardar seus títulos do Tesouro Direto: 0,20% ao ano.',
    texto: `
      <p>É cobrada sobre o valor investido, proporcionalmente ao tempo. No
      Tesouro Selic, os primeiros R$ 10 mil são isentos. Algumas corretoras
      cobram taxas adicionais; o simulador considera apenas a da B3.</p>`,
  },
  'taxa-equivalente': {
    titulo: 'Taxa equivalente (isento × tributado)',
    categoria: 'Impostos e custos',
    resumo: 'Quanto um investimento tributado precisa render para empatar com um isento.',
    texto: `
      <p>Como o IR é descontado do rendimento, um investimento isento "vale mais"
      do que sua taxa sugere. A conta aproximada é:</p>
      <p><strong>taxa tributada equivalente = taxa isenta ÷ (1 − alíquota de IR)</strong></p>
      <p>Ex.: uma LCI que rende 85% do CDI, por mais de 2 anos (IR de 15%),
      equivale a um CDB de cerca de 100% do CDI (85 ÷ 0,85).</p>`,
  },

  // ------------------------------------------------- Matemática financeira
  'valor-futuro': {
    titulo: 'Valor futuro',
    categoria: 'Matemática financeira',
    resumo: 'Quanto um valor aplicado hoje vai valer no futuro, com juros compostos.',
    texto: `
      <p>Com juros compostos, os juros de cada período passam a render juros nos
      períodos seguintes. Por isso o crescimento acelera com o tempo: R$ 1.000 a
      10% ao ano viram R$ 1.100 em 1 ano, R$ 2.594 em 10 anos e R$ 6.727 em 20.</p>`,
  },
  'valor-presente': {
    titulo: 'Valor presente',
    categoria: 'Matemática financeira',
    resumo: 'Quanto é preciso aplicar hoje para ter um valor desejado no futuro.',
    texto: `
      <p>É a conta inversa do valor futuro. Responde a perguntas como "quanto devo
      aplicar hoje para ter R$ 50 mil daqui a 5 anos?". O simulador já desconta
      impostos e taxas, então o valor indicado é o necessário para ter a meta
      <strong>líquida</strong>.</p>`,
  },
  'aporte-mensal': {
    titulo: 'Aportes mensais',
    categoria: 'Matemática financeira',
    resumo: 'Depósitos regulares que somam ao investimento ao longo do tempo.',
    texto: `
      <p>No simulador, os aportes são feitos no <strong>início de cada mês</strong>,
      começando junto com a aplicação inicial. Um prazo de 12 meses tem,
      portanto, 12 aportes.</p>`,
  },
  'valor-real': {
    titulo: 'Valor real (em reais de hoje)',
    categoria: 'Matemática financeira',
    resumo: 'O valor futuro descontada a inflação: mostra o poder de compra que você terá.',
    texto: `
      <p>R$ 100 mil daqui a 10 anos não compram o mesmo que R$ 100 mil hoje.
      O valor real divide o resultado pela inflação acumulada no período,
      mostrando quanto ele "vale em dinheiro de hoje".</p>`,
  },
  'rentabilidade-liquida': {
    titulo: 'Rentabilidade líquida anual',
    categoria: 'Matemática financeira',
    resumo: 'Quanto a aplicação rendeu por ano, em média, já descontados impostos e taxas.',
    texto: `
      <p>É a melhor forma de comparar opções com tributações diferentes. Quando há
      aportes mensais, considera o tempo que cada depósito ficou aplicado
      (tecnicamente, é a "taxa interna de retorno").</p>`,
  },
  'juros-reais': {
    titulo: 'Juros reais',
    categoria: 'Matemática financeira',
    resumo: 'O rendimento acima da inflação.',
    texto: `
      <p>Se um investimento rendeu 12% num ano com inflação de 5%, o ganho real foi
      de cerca de 6,7% (1,12 ÷ 1,05 − 1). É esse ganho que aumenta seu poder de compra.</p>`,
  },

  // -------------------------------------------------------------------- Ações
  'preco-lucro': {
    titulo: 'P/L (Preço / Lucro)',
    categoria: 'Ações',
    resumo: 'Quantos anos de lucro atual seriam necessários para "pagar" o preço da ação.',
    texto: `
      <p>Divide o preço da ação pelo lucro por ação dos últimos 12 meses. Um P/L de
      10 significa que o mercado paga R$ 10 por cada R$ 1 de lucro anual.</p>
      <p>P/L baixo pode indicar ação barata — ou uma empresa da qual o mercado espera
      queda nos lucros. Compare sempre com empresas do mesmo setor. P/L negativo
      significa prejuízo.</p>`,
  },
  'preco-valor-patrimonial': {
    titulo: 'P/VP (Preço / Valor Patrimonial)',
    categoria: 'Ações',
    resumo: 'Compara o preço de mercado com o valor contábil do patrimônio.',
    texto: `
      <p>P/VP abaixo de 1 significa que a empresa (ou fundo) é negociada por menos
      do que vale seu patrimônio no balanço. Pode ser oportunidade, ou sinal de
      que o mercado desconfia da qualidade dos ativos.</p>`,
  },
  'dividend-yield': {
    titulo: 'Dividend Yield (DY)',
    categoria: 'Ações',
    resumo: 'Proventos pagos nos últimos 12 meses divididos pelo preço atual.',
    texto: `
      <p>Mostra quanto a ação (ou fundo) pagou em dinheiro ao investidor em relação
      ao preço. Um DY muito alto pode vir de um pagamento extraordinário que não se
      repetirá, ou de uma queda forte no preço.</p>`,
  },
  roe: {
    titulo: 'ROE (Retorno sobre o Patrimônio)',
    categoria: 'Ações',
    resumo: 'Lucro anual dividido pelo patrimônio: mostra quão bem a empresa usa o capital dos sócios.',
    texto: `
      <p>Um ROE de 20% significa que a empresa gera R$ 20 de lucro por ano para cada
      R$ 100 de patrimônio. Empresas com ROE alto e estável tendem a ser
      mais rentáveis. Endividamento elevado pode inflar o ROE.</p>`,
  },
  'margem-liquida': {
    titulo: 'Margem líquida',
    categoria: 'Ações',
    resumo: 'Quanto sobra de lucro para cada R$ 100 vendidos.',
    texto: `
      <p>Lucro líquido dividido pela receita. Varia muito entre setores: varejo tem
      margens baixas, software e bancos costumam ter margens altas.</p>`,
  },
  'divida-ebitda': {
    titulo: 'Dívida líquida / EBITDA',
    categoria: 'Ações',
    resumo: 'Quantos anos de geração de caixa operacional a empresa levaria para pagar sua dívida.',
    texto: `
      <p>EBITDA é o lucro operacional antes de juros, impostos e depreciação — uma
      aproximação da geração de caixa. Acima de 3 costuma indicar endividamento
      elevado. Não se aplica a bancos.</p>
      <p>Valor negativo significa que a empresa tem mais dinheiro em caixa do que
      dívidas. O Tfinance considera como dívida os empréstimos, financiamentos e
      debêntures do balanço (sem os aluguéis contabilizados como dívida).</p>`,
  },
  'nivel-endividamento': {
    titulo: 'Risco ligado à dívida',
    categoria: 'Ações',
    resumo: 'Classificação simples (baixo, atenção, alto) do risco de a dívida trazer problemas à empresa.',
    texto: `
      <p>Com juros altos, empresas muito endividadas gastam boa parte do que ganham
      com juros, ficam sem folga para investir ou pagar dividendos e, nos casos
      graves, chegam à recuperação judicial ou à falência. O Tfinance junta alguns
      sinais conhecidos e mostra o pior deles:</p>
      <ul>
        <li><strong>Alto</strong>: patrimônio negativo; dívida líquida acima de 3,5
        vezes o EBITDA; ou resultado operacional que cobre menos de 1,5 vez o custo
        financeiro líquido (se a dívida não for pequena).</li>
        <li><strong>Atenção</strong>: dívida líquida entre 2,5 e 3,5 vezes o EBITDA;
        cobertura de juros entre 1,5 e 3; Z de Altman na zona de risco; ou muita
        dívida vencendo no ano com caixa menor que ela.</li>
        <li><strong>Baixo</strong>: nenhum desses sinais.</li>
      </ul>
      <p>Transmissão de energia e saneamento têm receita contratada e corrigida
      pela inflação e operam normalmente com mais dívida; para elas, os limites
      de dívida líquida/EBITDA são 4 (atenção) e 5 (alto).</p>
      <p>São critérios simples, para triagem. Não se aplicam a bancos, seguradoras,
      bolsa e holdings financeiras.</p>`,
  },
  'divida-liquida-patrimonio': {
    titulo: 'Dívida líquida / patrimônio',
    categoria: 'Ações',
    resumo: 'Quanto a empresa deve (descontado o caixa) para cada R$ 1 de patrimônio dos acionistas.',
    texto: `
      <p>Mostra o peso do dinheiro de terceiros no financiamento da empresa. Acima
      de 1, a dívida líquida é maior que todo o patrimônio dos acionistas. Valor
      negativo: há mais caixa do que dívida.</p>`,
  },
  'cobertura-juros': {
    titulo: 'Cobertura de juros',
    categoria: 'Ações',
    resumo: 'Quantas vezes o resultado operacional (EBIT) paga as despesas financeiras do período.',
    texto: `
      <p>Resultado operacional (antes de juros e impostos) ÷ custo financeiro
      líquido dos últimos 12 meses (despesas financeiras menos o rendimento do
      caixa). Abaixo de 1,5, quase tudo o que a operação gera vai para os juros —
      situação frágil, principalmente com a Selic alta. Acima de 3, há folga.
      "Folgada" quando o caixa rende mais do que a dívida custa.</p>
      <p>O resultado financeiro também inclui variação cambial e operações de
      proteção; por isso o número é uma aproximação.</p>`,
  },
  'divida-curto-prazo': {
    titulo: 'Dívida de curto prazo',
    categoria: 'Ações',
    resumo: 'Parte da dívida que vence em até um ano, comparada ao caixa.',
    texto: `
      <p>Dívida que vence logo precisa ser paga ou renovada (refinanciada). Se o
      caixa é menor que ela e o crédito fica caro ou escasso, a empresa pode ter
      dificuldade — foi o que aconteceu em vários pedidos de recuperação judicial.
      Dívida concentrada no longo prazo dá mais tempo e tranquilidade.</p>`,
  },
  'liquidez-corrente': {
    titulo: 'Liquidez corrente',
    categoria: 'Ações',
    resumo: 'Bens e direitos de curto prazo ÷ obrigações de curto prazo.',
    texto: `
      <p>Compara o que a empresa tem para receber ou usar em até um ano (caixa,
      estoques, contas a receber) com o que tem a pagar no mesmo prazo. Acima de
      1, há mais recursos que obrigações de curto prazo. Varia muito por setor:
      supermercados, por exemplo, operam normalmente abaixo de 1.</p>`,
  },
  'z-altman': {
    titulo: 'Z de Altman',
    categoria: 'Ações',
    resumo: 'Nota que combina quatro números do balanço para estimar o risco de dificuldade financeira.',
    texto: `
      <p>Criado pelo professor Edward Altman para prever falências. O Tfinance usa
      a versão para empresas não industriais e de mercados emergentes (Z″), que
      combina:</p>
      <ul>
        <li>capital de giro ÷ ativo total (folga de curto prazo);</li>
        <li>lucros retidos ÷ ativo total (lucros acumulados no passado);</li>
        <li>resultado operacional ÷ ativo total (rentabilidade);</li>
        <li>patrimônio ÷ dívidas totais (quanto é capital próprio).</li>
      </ul>
      <p>Z″ = 6,56·X1 + 3,26·X2 + 6,72·X3 + 1,05·X4. Abaixo de 1,1: zona de risco;
      entre 1,1 e 2,6: zona cinzenta; acima de 2,6: zona segura.</p>
      <p>Cuidados: empresas de infraestrutura (energia, saneamento, rodovias) têm
      muitos ativos e pouco capital de giro e costumam ficar na zona cinzenta sem
      estar em perigo. Use para comparar empresas do mesmo setor e como um sinal a
      mais, não como veredito. Não vale para bancos.</p>`,
  },
  'sensibilidade-dolar': {
    titulo: 'Sensibilidade ao dólar',
    categoria: 'Ações',
    resumo: 'Se a ação costuma ir melhor ou pior que a bolsa quando o dólar sobe.',
    texto: `
      <p>Exportadoras (minério, celulose, carnes, petróleo, aviões) faturam em dólar
      e ganham com o dólar alto. Importadoras e empresas com custos ou dívidas em
      dólar (companhias aéreas, varejo de importados) perdem. Empresas voltadas ao
      mercado interno sofrem indiretamente, porque o dólar alto costuma vir junto
      com desconfiança na economia.</p>
      <p>Em vez de classificar à mão, o Tfinance <strong>mede</strong> o
      comportamento nos últimos 5 anos: compara, mês a mês, o retorno da ação com a
      variação do dólar, descontando o movimento geral da bolsa (regressão
      linear). Só classifica como "ganha" ou "perde" quando a relação é
      consistente (estatística t acima de 2); senão, "pouco sensível".</p>
      <p>É um retrato do passado: uma empresa que troca dívida em dólar por dívida
      em reais, por exemplo, pode mudar de comportamento.</p>`,
  },
  'sensibilidade-juros': {
    titulo: 'Sensibilidade aos juros',
    categoria: 'Ações',
    resumo: 'Se a ação costuma ir melhor ou pior que a bolsa quando o mercado passa a esperar juros mais altos.',
    texto: `
      <p>Juros altos encarecem dívidas, esfriam o consumo e o crédito e tornam a
      renda fixa mais atraente que as ações. Sofrem mais: empresas endividadas,
      varejo, construção civil e empresas cujo valor depende de lucros distantes
      no futuro. Bancos e seguradoras, que aplicam muito dinheiro em renda fixa,
      às vezes ganham.</p>
      <p>As ações reagem quando as <strong>expectativas</strong> mudam, antes de o
      Banco Central mexer na Selic. Por isso o Tfinance usa a variação mensal da
      Selic que o mercado espera para o fim do ano seguinte (mediana do Boletim
      Focus) e mede, nos últimos 5 anos, como a ação reagiu a essas mudanças,
      descontado o movimento da bolsa. Classificação só quando a relação é
      consistente (estatística t acima de 2).</p>`,
  },
  'retorno-anualizado': {
    titulo: 'Retorno anualizado (5 e 10 anos)',
    categoria: 'Ações',
    resumo: 'Quanto a ação rendeu, em média, por ano, somando a valorização e os proventos reinvestidos.',
    texto: `
      <p>Considera que cada provento recebido foi usado para comprar mais ações da
      mesma empresa. O resultado é a taxa média anual que levaria do valor inicial
      ao final — comparável diretamente com o CDI e o Ibovespa no mesmo período.</p>
      <p>Preços ajustados por desdobramentos, grupamentos e bonificações. Antes de
      impostos. Rentabilidade passada não garante rentabilidade futura, mas
      períodos longos mostram melhor a qualidade do negócio do que 12 meses.</p>`,
  },
  'categorias-energia': {
    titulo: 'Setores e categorias (energia elétrica)',
    categoria: 'Ações',
    resumo: 'Como as empresas são agrupadas para comparar negócios parecidos.',
    texto: `
      <p>O setor e o subsetor seguem a classificação da B3. Nas elétricas, que a B3
      chama todas de "Energia Elétrica", o Tfinance separa pelo negócio principal:</p>
      <ul>
        <li><strong>Geração</strong>: usinas (hidrelétricas, eólicas, solares,
        térmicas). Receita ligada a contratos de venda de energia; risco de chuvas
        e de preço da energia.</li>
        <li><strong>Transmissão</strong>: linhas de alta tensão. A receita é fixa,
        definida em contrato com a Aneel e corrigida pela inflação, recebida mesmo
        sem uso total da linha. É o negócio mais previsível e costuma pagar bons
        dividendos.</li>
        <li><strong>Distribuição</strong>: leva a energia até casas e empresas. Mais
        exposta a inadimplência, perdas (furtos de energia) e revisões de tarifa.</li>
        <li><strong>Integrada</strong> ou <strong>geração e transmissão</strong>:
        atuam em mais de uma etapa.</li>
      </ul>
      <p>A classificação foi feita à mão, pelo negócio principal de cada empresa.</p>`,
  },
  'valor-mercado': {
    titulo: 'Valor de mercado',
    categoria: 'Ações',
    resumo: 'Quanto custaria comprar todas as ações da empresa pelo preço de hoje.',
    texto: `
      <p>É o número de ações multiplicado pelo preço de cada uma (ordinárias e
      preferenciais somadas). Serve de base para o P/L e o P/VP calculados pela
      empresa inteira. Ações que a própria empresa recomprou (em tesouraria) não
      entram na conta.</p>`,
  },
  'acao-on-pn': {
    titulo: 'Ações ON, PN e Units',
    categoria: 'Ações',
    resumo: 'Os tipos de ação: ordinária (final 3), preferencial (final 4, 5 ou 6) e unit (final 11).',
    texto: `
      <ul>
        <li><strong>ON (ordinária)</strong>: dá direito a voto nas assembleias.</li>
        <li><strong>PN (preferencial)</strong>: em geral sem voto, mas com
        preferência no recebimento de dividendos.</li>
        <li><strong>Unit</strong>: um "pacote" de ações ON e PN da mesma empresa,
        negociado como um só papel.</li>
      </ul>
      <p>Todas representam a mesma empresa; por isso o P/L, o P/VP e o ROE são os
      mesmos. Preço e Dividend Yield podem diferir.</p>`,
  },
  jcp: {
    titulo: 'Dividendos e Juros sobre Capital Próprio (JCP)',
    categoria: 'Ações',
    resumo: 'As duas formas de a empresa repartir o lucro em dinheiro com os acionistas.',
    texto: `
      <p><strong>Dividendos</strong> são isentos de IR para o acionista
      (regra vigente quando os dados foram preparados; há propostas de mudança).</p>
      <p><strong>JCP</strong> tem 15% de IR retido na fonte, mas reduz o imposto
      pago pela empresa. Os valores exibidos no Tfinance são brutos, antes do IR.</p>
      <p>Para receber, é preciso ter a ação ao final da <em>data com</em>.</p>`,
  },
  payout: {
    titulo: 'Payout',
    categoria: 'Ações',
    resumo: 'Parte do lucro que a empresa distribui aos acionistas.',
    texto: `
      <p>Payout de 50% significa que metade do lucro virou dividendos ou JCP e a
      outra metade ficou na empresa para investir ou pagar dívidas. Por lei, as
      empresas distribuem no mínimo 25% do lucro ajustado, salvo exceções.</p>
      <p>Acima de 100% a empresa pagou mais do que lucrou no período — o que não se
      sustenta por muito tempo. O Tfinance estima o payout pelo Dividend Yield
      multiplicado pelo P/L.</p>`,
  },
  'crescimento-lucro': {
    titulo: 'Crescimento médio anual',
    categoria: 'Ações',
    resumo: 'Quanto a receita ou o lucro cresceram, em média, por ano.',
    texto: `
      <p>É a taxa constante que levaria do primeiro ao último valor do período
      (em inglês, CAGR). Não aparece quando a empresa teve prejuízo em uma das
      pontas, pois a conta perde o sentido.</p>
      <p>Lucros que oscilam muito de um ano para outro indicam um negócio mais
      cíclico ou mais arriscado.</p>`,
  },
  'balancos-cvm': {
    titulo: 'Balanços: DFP, ITR e "12 meses"',
    categoria: 'Ações',
    resumo: 'De onde vêm os números contábeis das empresas e como o Tfinance os soma.',
    texto: `
      <p>As empresas abertas enviam à CVM a <strong>DFP</strong> (demonstrações
      anuais) e o <strong>ITR</strong> (informações trimestrais), em até cerca de
      45 dias depois de cada trimestre.</p>
      <p>Para indicadores como P/L e ROE o Tfinance usa o lucro dos
      <strong>últimos 12 meses</strong>: o acumulado do ano mais recente, mais o
      último ano completo, menos o mesmo período do ano anterior. Assim os números
      se atualizam a cada trimestre, sem esperar o balanço anual.</p>
      <p>Usa-se o balanço consolidado (empresa e suas controladas) e o lucro dos
      acionistas da própria empresa.</p>`,
  },
  beta: {
    titulo: 'Beta',
    categoria: 'Risco',
    resumo: 'Quanto a ação costuma subir ou cair quando o mercado sobe ou cai 1%.',
    texto: `
      <p>Beta 1 significa que a ação acompanha o mercado (Ibovespa). Beta 1,5
      significa que ela tende a oscilar 50% mais: sobe mais nas altas e cai mais
      nas quedas. Beta 0,5, que oscila metade.</p>
      <p>Nas ações, é calculado com as variações diárias do último ano; na
      carteira, com os retornos mensais desde 2015. Pode mudar com o tempo e não
      mede riscos específicos de cada empresa.</p>`,
  },
  ibovespa: {
    titulo: 'Ibovespa e BOVA11',
    categoria: 'Ações',
    resumo: 'O principal índice da bolsa brasileira, que resume o desempenho das ações mais negociadas.',
    texto: `
      <p>O Ibovespa funciona como uma carteira teórica das principais ações da B3.
      Comparar uma ação com ele mostra se ela foi melhor ou pior que "a bolsa".</p>
      <p>O Tfinance usa o <strong>BOVA11</strong>, um fundo negociado na bolsa que
      replica o Ibovespa, como referência — ele é a forma mais simples de investir
      no índice.</p>`,
  },

  // ------------------------------------------------------ Fundos imobiliários
  fii: {
    titulo: 'Fundo Imobiliário (FII)',
    categoria: 'Fundos imobiliários',
    resumo: 'Fundo negociado na bolsa que investe em imóveis ou títulos imobiliários e distribui renda mensal.',
    texto: `
      <p>Os <strong>fundos de tijolo</strong> possuem imóveis (lajes, galpões,
      shoppings) e recebem aluguéis. Os <strong>fundos de papel</strong> investem em
      CRIs e recebem juros. Os rendimentos mensais distribuídos a pessoas físicas são
      isentos de IR (sob certas condições); o lucro na venda das cotas paga 20%.</p>`,
  },
  'liquidez-diaria': {
    titulo: 'Liquidez diária (volume negociado)',
    categoria: 'Fundos imobiliários',
    resumo: 'Valor médio negociado por dia na bolsa.',
    texto: `
      <p>Quanto maior, mais fácil comprar ou vender sem afetar o preço. Ativos
      pouco negociados podem obrigar você a vender com desconto.</p>
      <p>No Tfinance, é a média do valor negociado por pregão nos últimos três
      meses. Os FIIs exibidos são os de maior liquidez.</p>`,
  },
  'tipo-fii': {
    titulo: 'Tipos de FII: tijolo, papel, fundo de fundos e híbrido',
    categoria: 'Fundos imobiliários',
    resumo: 'Classificação conforme aquilo em que o fundo investe a maior parte do dinheiro.',
    texto: `
      <ul>
        <li><strong>Tijolo</strong>: possui imóveis (galpões, shoppings, escritórios,
        lojas) e vive de aluguéis. O valor acompanha o mercado imobiliário; o risco
        principal é a vacância e a renegociação de contratos.</li>
        <li><strong>Papel</strong>: empresta dinheiro ao setor imobiliário comprando
        títulos (CRI, LCI). Rende juros, em geral atrelados ao CDI ou ao IPCA, e o
        risco principal é o calote dos devedores.</li>
        <li><strong>Fundo de fundos</strong>: compra cotas de outros FIIs. Oferece
        diversificação, mas há duas camadas de taxas.</li>
        <li><strong>Híbrido</strong>: nenhum tipo de ativo predomina.</li>
      </ul>
      <p>O Tfinance classifica pela carteira informada à CVM: 60% ou mais do valor
      investido em um tipo de ativo define o tipo; abaixo disso, híbrido.</p>`,
  },
  'valor-patrimonial-cota': {
    titulo: 'Valor patrimonial da cota (VP)',
    categoria: 'Fundos imobiliários',
    resumo: 'Patrimônio do fundo dividido pelo número de cotas: quanto "vale no papel" cada cota.',
    texto: `
      <p>É calculado pelo administrador a partir da avaliação dos imóveis e títulos
      do fundo e informado mensalmente à CVM. O preço na bolsa pode ficar acima ou
      abaixo dele — é o que mostra o P/VP.</p>
      <p>Avaliações de imóveis são feitas por laudos e podem demorar a refletir
      mudanças do mercado, então o VP também é uma estimativa.</p>`,
  },
  'rendimento-fii': {
    titulo: 'Rendimentos de FII',
    categoria: 'Fundos imobiliários',
    resumo: 'Valor distribuído mensalmente por cota, vindo de aluguéis ou juros recebidos pelo fundo.',
    texto: `
      <p>Os FIIs são obrigados a distribuir pelo menos 95% do lucro apurado em
      caixa a cada semestre; a maioria paga todo mês.</p>
      <p>Para pessoas físicas os rendimentos são <strong>isentos de IR</strong>
      quando o fundo tem cotas negociadas em bolsa e ao menos 100 cotistas, e o
      investidor tem menos de 10% das cotas. O lucro na venda das cotas paga 20%.</p>
      <p>Rendimentos passados não garantem os futuros: eles mudam com aluguéis,
      vacância, juros e inflação.</p>`,
  },
  'data-com': {
    titulo: 'Data com',
    categoria: 'Fundos imobiliários',
    resumo: 'Último dia em que é preciso ter a cota para receber o rendimento anunciado.',
    texto: `
      <p>Quem tiver a cota ao final da data com recebe o rendimento na data de
      pagamento, mesmo que venda a cota antes disso. No dia seguinte (data "ex") o
      preço costuma cair aproximadamente o valor do rendimento.</p>`,
  },
  'retorno-total': {
    titulo: 'Retorno total',
    categoria: 'Fundos imobiliários',
    resumo: 'Variação do preço somada aos rendimentos recebidos no período.',
    texto: `
      <p>Olhar só o preço esconde a renda distribuída; olhar só o Dividend Yield
      esconde a valorização ou a perda no preço. O retorno total junta os dois:
      quanto teria ganhado quem comprou no início do período e manteve a cota.</p>
      <p>No Tfinance, os rendimentos são somados sem reinvestimento.</p>`,
  },
  'taxa-administracao': {
    titulo: 'Taxa de administração',
    categoria: 'Fundos imobiliários',
    resumo: 'Remuneração do administrador e do gestor, descontada do patrimônio do fundo.',
    texto: `
      <p>É cobrada continuamente e reduz o que sobra para distribuir aos cotistas.
      O informe à CVM traz a despesa do mês em relação ao patrimônio; o Tfinance a
      multiplica por 12 para dar uma ideia do custo anual.</p>`,
  },
  cotistas: {
    titulo: 'Número de cotistas',
    categoria: 'Fundos imobiliários',
    resumo: 'Quantas pessoas e instituições possuem cotas do fundo.',
    texto: `
      <p>Muitos cotistas indicam um fundo conhecido e, em geral, com boa liquidez.
      Também importa para o IR: a isenção dos rendimentos exige ao menos 100
      cotistas.</p>`,
  },
  'composicao-fii': {
    titulo: 'Composição da carteira do FII',
    categoria: 'Fundos imobiliários',
    resumo: 'Como o patrimônio do fundo está dividido entre imóveis, títulos, cotas de outros FIIs e caixa.',
    texto: `
      <ul>
        <li><strong>Imóveis</strong>: imóveis próprios e participações em empresas
        donas de imóveis.</li>
        <li><strong>Títulos imobiliários</strong>: CRI, LCI e semelhantes.</li>
        <li><strong>Cotas de FIIs</strong>: investimento em outros fundos imobiliários.</li>
        <li><strong>Caixa e renda fixa</strong>: reserva para despesas, obras e novas compras.</li>
        <li><strong>Outros</strong>: ações, debêntures e demais ativos.</li>
      </ul>
      <p>Dados do último informe mensal enviado à CVM.</p>`,
  },
  vacancia: {
    titulo: 'Vacância',
    categoria: 'Fundos imobiliários',
    resumo: 'Parte dos imóveis do fundo que está vazia, sem inquilino pagando aluguel.',
    texto: `
      <p>Imóvel vazio não gera aluguel e ainda tem custos (condomínio, IPTU,
      manutenção) que o fundo paga sozinho. Por isso a vacância é o principal
      ponto de atenção nos fundos de tijolo.</p>
      <p>A <strong>vacância física</strong> mostrada aqui é a parte da área total
      dos imóveis que está desocupada: cada imóvel pesa pelo seu tamanho. Ela é
      calculada pelo Tfinance com os dados que o fundo informa à CVM a cada
      trimestre, imóvel por imóvel.</p>
      <ul>
        <li>Até uns 5%: em geral considerada baixa.</li>
        <li>Acima de 10% a 15%: merece atenção — veja se é um imóvel específico
        e o que o gestor diz sobre ele no relatório gerencial.</li>
      </ul>
      <p>Cuidados: os relatórios dos fundos costumam trazer também a
      <strong>vacância financeira</strong> (quanto de aluguel deixa de entrar),
      que pode ser diferente da física. Alguns fundos preenchem o informe da CVM
      de forma inconsistente; quando o número parece errado, o app avisa.
      Fundos de papel não têm imóveis, então não têm vacância.</p>`,
  },

  'regularidade-rendimentos': {
    titulo: 'Regularidade dos rendimentos',
    categoria: 'Fundos imobiliários',
    resumo: 'Se o fundo pagou todo mês e o quanto os valores variaram.',
    texto: `
      <p>Mostra em quantos dos últimos 12 meses houve rendimento e a diferença
      entre o menor e o maior pagamento. Pagamentos estáveis tornam a renda mais
      previsível; grandes saltos podem indicar receitas extraordinárias (venda de
      um imóvel, por exemplo) que não se repetem.</p>`,
  },

  // --------------------------------------------------------------------- Risco
  volatilidade: {
    titulo: 'Volatilidade',
    categoria: 'Risco',
    resumo: 'Mede o quanto o preço oscila. Quanto maior, mais imprevisível no curto prazo.',
    texto: `
      <p>Calculada a partir das variações dos preços (diárias nas ações, mensais
      desde 2015 na carteira) e expressa ao ano. Uma
      volatilidade de 30% indica que, em um ano típico, o preço pode facilmente
      variar 30% para cima ou para baixo.</p>`,
  },
  drawdown: {
    titulo: 'Queda máxima (drawdown)',
    categoria: 'Risco',
    resumo: 'A maior queda do pico ao fundo em um período.',
    texto: `
      <p>Responde: "no pior momento, quanto eu teria perdido?". Uma queda de 50%
      exige uma alta de 100% para recuperar o valor. Ajuda a avaliar se você
      suportaria emocionalmente segurar o investimento.</p>`,
  },
  diversificacao: {
    titulo: 'Diversificação',
    categoria: 'Risco',
    resumo: 'Distribuir o dinheiro entre ativos que não sobem e caem juntos.',
    texto: `
      <p>Se dois investimentos costumam oscilar em direções diferentes, a carteira
      como um todo oscila menos do que cada um sozinho. Ter muitos ativos do mesmo
      setor diversifica pouco.</p>`,
  },
  concentracao: {
    titulo: 'Concentração e número efetivo de investimentos',
    categoria: 'Risco',
    resumo: 'Quanto da carteira depende de poucos investimentos.',
    texto: `
      <p>Ter 10 investimentos não garante diversificação: se um deles for 90% do
      total, a carteira se comporta quase como se tivesse um só.</p>
      <p>O <strong>número efetivo</strong> resume isso: é quantos investimentos de
      mesmo tamanho dariam a mesma concentração (1 ÷ soma dos pesos ao quadrado).
      Quatro investimentos de 25% cada resultam em 4; um de 90% e outro de 10%,
      em cerca de 1,2.</p>`,
  },
  correlacao: {
    titulo: 'Correlação',
    categoria: 'Risco',
    resumo: 'Mede se dois investimentos costumam subir e cair juntos.',
    texto: `
      <p>Vai de −1 a +1. Perto de <strong>+1</strong>: andam juntos (ex.: duas
      ações de bancos). Perto de <strong>0</strong>: sem relação. Negativa:
      tendem a ir em sentidos opostos.</p>
      <p>Juntar ativos de correlação baixa reduz a oscilação da carteira sem,
      necessariamente, reduzir o retorno esperado — é a ideia da diversificação.
      Na carteira, o Tfinance calcula com os retornos mensais dos últimos 5 anos.</p>`,
  },
  'perda-mes-ruim': {
    titulo: 'Perda em um mês ruim',
    categoria: 'Risco',
    resumo: 'Quanto a carteira pode perder em um mês desfavorável (que acontece cerca de 1 vez a cada 20 meses).',
    texto: `
      <p>Na carteira, o Tfinance aplica os pesos de hoje a cada mês desde 2015 e
      ordena os resultados do pior para o melhor. A perda em um mês ruim é a do
      mês na fronteira dos 5% piores: só 1 em cada 20 meses foi pior que ela (em
      inglês, <em>Value at Risk</em> histórico de 95% em um mês).</p>
      <p>Por usar perdas que de fato aconteceram, inclui o tamanho real das crises,
      que as fórmulas baseadas na curva "normal" subestimam. Não é o pior caso:
      veja também a média dos meses muito ruins e o pior mês.</p>
      <p>Ajuda a responder: "eu ficaria tranquilo vendo minha carteira cair esse
      valor num mês?". Se a resposta for não, talvez a carteira esteja arriscada
      demais para você.</p>`,
  },
  'preco-medio': {
    titulo: 'Preço médio e ganho',
    categoria: 'Matemática financeira',
    resumo: 'O custo médio de cada ação ou cota que você tem, incluindo taxas.',
    texto: `
      <p>Somam-se os valores pagos em todas as compras (com corretagem e taxas) e
      divide-se pela quantidade. Vendas não alteram o preço médio; o ganho ou perda
      da venda é a diferença entre o preço de venda e o preço médio.</p>
      <p>É também a base do Imposto de Renda sobre vendas de ações e FIIs. O
      Tfinance não calcula o imposto devido; consulte as regras da Receita Federal.</p>`,
  },
  'rentabilidade-carteira': {
    titulo: 'Ganho da carteira e comparação com o CDI',
    categoria: 'Matemática financeira',
    resumo: 'Quanto seus investimentos renderam, e quanto o mesmo dinheiro renderia no CDI.',
    texto: `
      <p><strong>Ganho</strong> = valor atual dos investimentos + dinheiro de
      vendas e resgates + proventos recebidos − tudo o que foi aplicado.</p>
      <p><strong>Se fosse no CDI</strong>: o Tfinance refaz as mesmas entradas e
      saídas de dinheiro, nas mesmas datas, como se tudo tivesse rendido 100% do
      CDI. Assim dá para saber se assumir riscos valeu a pena em relação à opção
      mais simples. É uma comparação aproximada (o CDI aparece antes do IR).</p>`,
  },

  'media-piores-meses': {
    titulo: 'Média dos meses muito ruins',
    categoria: 'Risco',
    resumo: 'Quanto a carteira perdeu, em média, nos 5% piores meses (1 em cada 20).',
    texto: `
      <p>A "perda em um mês ruim" diz onde começam os meses muito ruins; esta
      medida diz <strong>quão ruins eles foram</strong>, em média. Duas carteiras
      podem ter a mesma perda em um mês ruim, mas uma delas ter quedas muito
      maiores nas crises.</p>
      <p>No jargão, é o <em>CVaR</em> (ou <em>Expected Shortfall</em>) histórico
      de 95% em um mês, calculado com a carteira de hoje aplicada a cada mês
      desde 2015.</p>`,
  },
  'cenarios-crise': {
    titulo: 'Cenários de crise',
    categoria: 'Risco',
    resumo: 'Quanto a carteira de hoje teria variado em crises que de fato aconteceram.',
    texto: `
      <p>Um "teste de estresse": em vez de fórmulas, repete crises reais com os
      pesos atuais da carteira. Cada crise vai do fechamento do mês anterior ao
      início até o fechamento do último mês indicado.</p>
      <p>Mostra também como o Ibovespa e o dólar se moveram, para comparar. Cada
      crise tem causas diferentes: a de 2015-16 foi recessão e crise política; a
      da Covid, uma queda muito rápida; a de 2021-22, alta forte dos juros, que
      afeta mais empresas endividadas e títulos prefixados.</p>
      <p>Uma crise futura pode ser diferente de todas elas.</p>`,
  },
  'exposicao-carteira': {
    titulo: 'Reação da carteira ao dólar e aos juros',
    categoria: 'Risco',
    resumo: 'Quanto a carteira costumou variar no mês em que o dólar ou os juros esperados subiram.',
    texto: `
      <p>Regressão linear, mês a mês desde 2015, entre o retorno da carteira de
      hoje e a variação do dólar (ou da Selic esperada pelo mercado para o ano
      seguinte, no Boletim Focus). O resultado é ajustado para um choque de 10%
      no dólar ou de 1 ponto percentual nos juros.</p>
      <p>Aqui o efeito é <strong>total</strong>: quando o dólar sobe, a bolsa
      costuma cair junto, e isso entra na conta. Já a tabela por ativo desconta o
      movimento da bolsa e mostra só a reação própria de cada um.</p>
      <p>"Relação fraca" significa que, no histórico, a carteira ora subiu ora
      caiu nesses meses (estatística t abaixo de 2): não dá para contar com o
      efeito.</p>`,
  },
  duracao: {
    titulo: 'Duração e risco de juros da renda fixa',
    categoria: 'Renda fixa',
    resumo: 'Quanto o valor de mercado de um título cai se os juros subirem 1 ponto.',
    texto: `
      <p>Títulos prefixados e IPCA+ pagam uma taxa fixa. Se os juros do mercado
      sobem, títulos novos passam a pagar mais, e o seu vale menos se for vendido
      antes do vencimento (marcação a mercado). Quanto mais longo o prazo, maior
      o efeito.</p>
      <p>O Tfinance estima a <strong>duração</strong> como anos até o vencimento
      ÷ (1 + taxa): um Tesouro IPCA+ com 20 anos pela frente, a 7%, perde cerca de
      19% para cada 1 ponto de alta. É exata para títulos sem pagamentos
      intermediários; os com juros semestrais oscilam um pouco menos.</p>
      <p>Levando até o vencimento, você recebe a taxa contratada: a perda só se
      realiza se precisar vender antes. Pós-fixados (CDI, Selic) quase não
      oscilam com os juros.</p>`,
  },
  'simulacao-historica': {
    titulo: 'Simulação histórica da carteira',
    categoria: 'Risco',
    resumo: 'Medir o risco aplicando a carteira de hoje ao que aconteceu nos últimos anos.',
    texto: `
      <p>Para cada mês desde 2015, o Tfinance calcula quanto a carteira de hoje
      teria rendido: soma o retorno de cada investimento naquele mês (com
      proventos) multiplicado pelo peso que ele tem hoje. Daí saem a volatilidade,
      as piores perdas, a maior queda e os cenários de crise.</p>
      <p>Vantagens: usa perdas que de fato aconteceram (crises incluídas) e a
      forma real como os ativos se moveram juntos. Limites: supõe que a carteira
      manteve os mesmos pesos; ativos com pouco histórico usam o Ibovespa no
      lugar; a renda fixa entra rendendo o CDI, sem marcação a mercado.</p>
      <p>Antes, o Tfinance usava só o último ano e a curva "normal", o que
      subestimava o risco quando o ano tinha sido calmo.</p>`,
  },
  'cotacao-intradiaria': {
    titulo: 'Cotação durante o pregão',
    categoria: 'Ações',
    resumo: 'Preço do momento, atualizado a cada meia hora nos dias úteis, com ~15 minutos de atraso.',
    texto: `
      <p>Nos dias úteis, das 10h30 às 18h, o Tfinance busca no site da B3 o
      último preço, a abertura, a mínima, a máxima e a variação do dia das ações e
      FIIs das listas (e do BOVA11). A B3 divulga esses preços gratuitamente com
      cerca de <strong>15 minutos de atraso</strong>, e a atualização acontece a
      cada meia hora, às vezes com alguns minutos a mais de demora.</p>
      <p>A <strong>variação do dia</strong> é em relação ao fechamento do pregão
      anterior. Os demais indicadores (P/L, Dividend Yield, retornos) continuam
      calculados com o último fechamento, atualizado toda noite.</p>
      <p>Para quem investe no longo prazo, o preço do dia serve para aproveitar
      quedas fortes em empresas que já foram analisadas, não para operar no curto
      prazo. Antes de comprar, vale entender o motivo da queda: uma notícia que
      muda os fundamentos não é oportunidade.</p>
      <p>Na carteira, ativos fora das listas do app continuam com o preço do
      último fechamento.</p>`,
  },
};
