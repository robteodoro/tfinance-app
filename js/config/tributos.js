// =============================================================================
// Regras de tributação e taxas usadas pelo simulador de renda fixa.
//
// ATENÇÃO: estas regras são definidas por lei e podem mudar. Quando mudarem,
// basta atualizar os números deste arquivo; o restante do aplicativo usa
// estes valores automaticamente.
//
// Última revisão: novembro de 2026.
// =============================================================================

/**
 * Imposto de Renda regressivo para renda fixa (pessoa física).
 * A alíquota depende de quantos dias corridos o dinheiro ficou aplicado.
 * Cada faixa vale "até" o número de dias indicado.
 */
export const FAIXAS_IR = [
  { ateDias: 180, aliquota: 0.225 },      // até 6 meses: 22,5%
  { ateDias: 360, aliquota: 0.20 },       // de 6 meses a 1 ano: 20%
  { ateDias: 720, aliquota: 0.175 },      // de 1 a 2 anos: 17,5%
  { ateDias: Infinity, aliquota: 0.15 },  // acima de 2 anos: 15%
];

/**
 * IOF regressivo: cobrado apenas em resgates antes de 30 dias.
 * Percentual do RENDIMENTO que vai para o IOF, conforme o dia do resgate.
 * Posição 0 = resgate no mesmo dia (dia 0); posição 29 = 29º dia.
 * A partir do 30º dia o IOF é zero.
 */
export const TABELA_IOF = [
  1.00, 0.96, 0.93, 0.90, 0.86, 0.83, 0.80, 0.76, 0.73, 0.70,
  0.66, 0.63, 0.60, 0.56, 0.53, 0.50, 0.46, 0.43, 0.40, 0.36,
  0.33, 0.30, 0.26, 0.23, 0.20, 0.16, 0.13, 0.10, 0.06, 0.03,
];

/**
 * Taxa de custódia cobrada pela B3 sobre títulos do Tesouro Direto.
 * Percentual ao ano sobre o valor aplicado.
 * No Tesouro Selic, a parte do saldo até o limite de isenção não paga custódia.
 */
export const CUSTODIA_TESOURO = {
  taxaAnual: 0.002,                  // 0,20% ao ano
  isencaoTesouroSelicAte: 10000,     // R$ 10 mil isentos no Tesouro Selic
};

// Garantia do FGC: até R$ 250 mil por CPF e por instituição financeira
// (com teto global de R$ 1 milhão a cada 4 anos). Usado na avaliação de
// risco da carteira.
export const LIMITE_FGC = 250000;
