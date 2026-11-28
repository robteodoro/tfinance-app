// =============================================================================
// Produtos de renda fixa disponíveis no simulador.
//
// Cada produto informa:
//   nome          - nome exibido na tela
//   isentoIR      - true se pessoa física não paga Imposto de Renda
//   custodia      - tipo de taxa de custódia: null (nenhuma), 'tesouro' ou
//                   'tesouro-selic' (com faixa de isenção)
//   indexadores   - formas de remuneração aceitas (ver INDEXADORES abaixo)
//   fgc           - true se coberto pelo Fundo Garantidor de Créditos
//   glossario     - verbete do glossário que explica o produto
// =============================================================================

export const INDEXADORES = {
  cdi:      { nome: '% do CDI',          rotuloTaxa: 'Percentual do CDI (%)',   exemplo: 100 },
  pre:      { nome: 'Prefixado',         rotuloTaxa: 'Taxa ao ano (%)',         exemplo: 14 },
  ipca:     { nome: 'IPCA + taxa',       rotuloTaxa: 'Taxa real ao ano (%)',    exemplo: 7 },
  selic:    { nome: 'Selic + taxa',      rotuloTaxa: 'Taxa adicional ao ano (%)', exemplo: 0.05 },
  poupanca: { nome: 'Regra da poupança', rotuloTaxa: null,                      exemplo: null },
};

export const PRODUTOS = {
  cdb: {
    nome: 'CDB / RDB / LC',
    isentoIR: false, custodia: null, fgc: true,
    indexadores: ['cdi', 'pre', 'ipca'],
    glossario: 'cdb',
  },
  lci_lca: {
    nome: 'LCI / LCA',
    isentoIR: true, custodia: null, fgc: true,
    indexadores: ['cdi', 'pre', 'ipca'],
    glossario: 'lci-lca',
  },
  cri_cra: {
    nome: 'CRI / CRA',
    isentoIR: true, custodia: null, fgc: false,
    indexadores: ['cdi', 'pre', 'ipca'],
    glossario: 'cri-cra',
  },
  debenture: {
    nome: 'Debênture comum',
    isentoIR: false, custodia: null, fgc: false,
    indexadores: ['cdi', 'pre', 'ipca'],
    glossario: 'debenture',
  },
  debenture_incentivada: {
    nome: 'Debênture incentivada',
    isentoIR: true, custodia: null, fgc: false,
    indexadores: ['cdi', 'pre', 'ipca'],
    glossario: 'debenture',
  },
  tesouro_selic: {
    nome: 'Tesouro Selic',
    isentoIR: false, custodia: 'tesouro-selic', fgc: false,
    indexadores: ['selic'],
    glossario: 'tesouro-direto',
  },
  tesouro_prefixado: {
    nome: 'Tesouro Prefixado',
    isentoIR: false, custodia: 'tesouro', fgc: false,
    indexadores: ['pre'],
    glossario: 'tesouro-direto',
  },
  tesouro_ipca: {
    nome: 'Tesouro IPCA+',
    isentoIR: false, custodia: 'tesouro', fgc: false,
    indexadores: ['ipca'],
    glossario: 'tesouro-direto',
  },
  poupanca: {
    nome: 'Poupança',
    isentoIR: true, custodia: null, fgc: true,
    indexadores: ['poupanca'],
    glossario: 'poupanca',
  },
};
