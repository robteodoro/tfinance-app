// =============================================================================
// Conversões de taxas de juros.
//
// Convenções usadas em todo o aplicativo:
//   - Taxas são números decimais: 13,65% ao ano é escrito 0.1365.
//   - "Taxa efetiva anual" significa juros compostos: R$ 100 a 10% a.a.
//     viram R$ 110 em um ano e R$ 121 em dois.
// =============================================================================

/** Dias úteis em um ano, convenção usada no mercado para o CDI. */
export const DIAS_UTEIS_ANO = 252;

/** Converte uma taxa anual em taxa equivalente para um período menor ou maior.
 *  Ex.: taxaNoPeriodo(0.12, 1/12) = taxa mensal equivalente a 12% ao ano. */
export function taxaNoPeriodo(taxaAnual, anos) {
  return Math.pow(1 + taxaAnual, anos) - 1;
}

/** Converte uma taxa mensal em taxa anual equivalente. */
export function mensalParaAnual(taxaMensal) {
  return Math.pow(1 + taxaMensal, 12) - 1;
}

/** Converte uma taxa anual em taxa mensal equivalente. */
export function anualParaMensal(taxaAnual) {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

/**
 * Rentabilidade anual de uma aplicação que paga um percentual do CDI.
 * O CDI rende dia a dia (em dias úteis); aplicar 110% do CDI significa
 * receber 110% do rendimento DIÁRIO, o que dá um pouco mais que 110% do
 * rendimento anual por causa dos juros compostos.
 */
export function taxaPercentualCDI(percentual, cdiAnual) {
  const cdiDiario = Math.pow(1 + cdiAnual, 1 / DIAS_UTEIS_ANO) - 1;
  return Math.pow(1 + cdiDiario * percentual, DIAS_UTEIS_ANO) - 1;
}

/** Operação inversa: qual percentual do CDI corresponde a uma taxa anual. */
export function percentualCDIEquivalente(taxaAnual, cdiAnual) {
  const cdiDiario = Math.pow(1 + cdiAnual, 1 / DIAS_UTEIS_ANO) - 1;
  const taxaDiaria = Math.pow(1 + taxaAnual, 1 / DIAS_UTEIS_ANO) - 1;
  return taxaDiaria / cdiDiario;
}

/** Soma de duas taxas na forma composta: (1 + a) × (1 + b) − 1.
 *  É assim que se calcula "IPCA + 6%" ou "Selic + 0,1%". */
export function compor(taxaA, taxaB) {
  return (1 + taxaA) * (1 + taxaB) - 1;
}

/**
 * Rentabilidade da poupança (regra válida desde 2012):
 *   - Selic acima de 8,5% a.a.: 0,5% ao mês + TR
 *   - Selic até 8,5% a.a.: 70% da Selic + TR
 */
export function taxaPoupanca(selicMeta, trMensal) {
  const base = selicMeta > 0.085 ? 0.005 : anualParaMensal(selicMeta * 0.7);
  return mensalParaAnual(compor(base, trMensal));
}

/**
 * Calcula a taxa efetiva anual BRUTA (antes de impostos e taxas) de uma
 * aplicação, combinando o indexador escolhido com o cenário econômico.
 *
 * @param {string} indexador  'cdi' | 'pre' | 'ipca' | 'selic' | 'poupanca'
 * @param {number} taxa       valor digitado: percentual do CDI (1.1 = 110%)
 *                            ou taxa anual (0.06 = 6%), conforme o indexador
 * @param {object} cenario    { selic, cdi, ipca, trMensal } em decimais
 */
export function taxaBrutaAnual(indexador, taxa, cenario) {
  switch (indexador) {
    case 'cdi':      return taxaPercentualCDI(taxa, cenario.cdi);
    case 'pre':      return taxa;
    case 'ipca':     return compor(cenario.ipca, taxa);
    // A Selic efetiva diária é praticamente igual ao CDI.
    case 'selic':    return compor(cenario.cdi, taxa);
    case 'poupanca': return taxaPoupanca(cenario.selic, cenario.trMensal);
    default: throw new Error(`Indexador desconhecido: ${indexador}`);
  }
}
