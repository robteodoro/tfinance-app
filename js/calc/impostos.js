// =============================================================================
// Cálculo de Imposto de Renda e IOF sobre aplicações de renda fixa.
// As tabelas ficam em config/tributos.js.
// =============================================================================

import { FAIXAS_IR, TABELA_IOF } from '../config/tributos.js';

/** Alíquota de IR conforme o número de dias corridos aplicados. */
export function aliquotaIR(dias) {
  return FAIXAS_IR.find((faixa) => dias <= faixa.ateDias).aliquota;
}

/** Percentual do rendimento cobrado como IOF (zero a partir do 30º dia). */
export function aliquotaIOF(dias) {
  const dia = Math.floor(dias);
  return dia < TABELA_IOF.length ? TABELA_IOF[Math.max(dia, 0)] : 0;
}

/**
 * Impostos devidos no resgate de uma aplicação.
 * Primeiro se cobra o IOF sobre o rendimento; o IR incide sobre o que sobra.
 * Se houve prejuízo, não há imposto.
 *
 * @param {number}  rendimento  ganho bruto em reais
 * @param {number}  dias        dias corridos entre aplicação e resgate
 * @param {boolean} isentoIR    produto isento de IR (LCI, LCA, CRI...)
 * @returns {{iof:number, ir:number}}
 */
export function impostosNoResgate(rendimento, dias, isentoIR) {
  if (rendimento <= 0 || isentoIR) return { iof: 0, ir: 0 };
  const iof = rendimento * aliquotaIOF(dias);
  const ir = (rendimento - iof) * aliquotaIR(dias);
  return { iof, ir };
}
