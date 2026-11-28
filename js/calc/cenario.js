// =============================================================================
// Cenário econômico usado nas simulações: Selic, CDI, IPCA e TR.
//
// Toda simulação de longo prazo precisa supor como os juros e a inflação vão
// se comportar. O aplicativo oferece dois pontos de partida:
//   - "atual":  as taxas vigentes hoje, mantidas constantes;
//   - "focus":  a média das projeções do Boletim Focus para o prazo simulado.
// Em ambos os casos o usuário pode ajustar os números livremente.
// =============================================================================

/** Valores usados se os dados ainda não tiverem sido carregados. */
export const CENARIO_PADRAO = { selic: 0.1375, cdi: 0.1365, ipca: 0.045, trMensal: 0.0015 };

/** Diferença típica entre a meta Selic e o CDI (CDI ≈ Selic − 0,10 p.p.). */
const DIFERENCA_SELIC_CDI = 0.001;

/** Cenário com as taxas vigentes hoje. */
export function cenarioAtual(macro) {
  if (!macro) return { ...CENARIO_PADRAO };
  return {
    selic: macro.selicMeta.valor / 100,
    cdi: macro.cdi.valor / 100,
    ipca: macro.ipca12m.valor / 100,
    trMensal: macro.trMensal.valor / 100,
  };
}

/**
 * Média das projeções anuais do Focus para os anos cobertos pelo prazo.
 * Anos além da última projeção repetem a última disponível.
 */
function mediaProjecoes(projecoes, anoInicial, quantidadeAnos) {
  const anos = Object.keys(projecoes).map(Number).sort((a, b) => a - b);
  const ultimoAno = anos[anos.length - 1];
  let soma = 0;
  for (let i = 0; i < quantidadeAnos; i++) {
    const ano = Math.min(anoInicial + i, ultimoAno);
    soma += projecoes[ano];
  }
  return soma / quantidadeAnos;
}

/** Cenário com a média das projeções do Focus para um prazo em dias. */
export function cenarioFocus(macro, dias) {
  const atual = cenarioAtual(macro);
  if (!macro || !macro.focus) return atual;
  const anoAtual = new Date().getFullYear();
  const quantidadeAnos = Math.max(1, Math.ceil(dias / 365));
  // O Focus projeta a Selic de FIM de cada ano. Incluímos a taxa de hoje na
  // média para representar o caminho entre o valor atual e as projeções.
  const selicFocus = mediaProjecoes(macro.focus.selic, anoAtual + 1, quantidadeAnos) / 100;
  const selic = (atual.selic + selicFocus * quantidadeAnos) / (quantidadeAnos + 1);
  return {
    selic,
    cdi: selic - DIFERENCA_SELIC_CDI,
    ipca: mediaProjecoes(macro.focus.ipca, anoAtual + 1, quantidadeAnos) / 100,
    trMensal: atual.trMensal,
  };
}
