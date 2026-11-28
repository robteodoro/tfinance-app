// =============================================================================
// Indicadores de fundos imobiliários, calculados a partir dos dados de
// site/dados/fiis.json (cotações diárias, rendimentos e informes da CVM).
//
// Funções puras, testadas em testes/fiis.teste.js. Os cálculos de preço
// comuns a FIIs e ações ficam em mercado.js.
// =============================================================================

import {
  ultimoPreco, diasAntes, proventos12Meses, variacaoPreco, retornoTotal,
  volatilidadeAnual, quedaMaxima,
} from './mercado.js';

/** Dividend Yield: rendimentos de 12 meses ÷ preço atual. */
export function dividendYield(somaRendimentos, preco) {
  return preco > 0 ? somaRendimentos / preco : NaN;
}

/** P/VP: preço de mercado ÷ valor patrimonial da cota. */
export function precoSobreValorPatrimonial(preco, valorPatrimonialCota) {
  return valorPatrimonialCota > 0 ? preco / valorPatrimonialCota : NaN;
}

/**
 * Regularidade dos rendimentos nos 12 meses até `dataFinal`:
 *   meses      - quantos meses diferentes tiveram rendimento
 *   minimo, maximo, media - valores por cota
 *   variacao   - coeficiente de variação (desvio-padrão ÷ média); quanto
 *                menor, mais estáveis os pagamentos
 */
export function regularidadeRendimentos(rendimentos, dataFinal) {
  const inicio = diasAntes(dataFinal, 365);
  // Soma por mês da data com (alguns fundos pagam mais de uma vez no mês).
  const porMes = {};
  for (const [dataCom, , valor] of rendimentos) {
    if (dataCom > inicio && dataCom <= dataFinal) {
      const mes = dataCom.slice(0, 7);
      porMes[mes] = (porMes[mes] || 0) + valor;
    }
  }
  const valores = Object.values(porMes);
  if (valores.length === 0) return { meses: 0, minimo: NaN, maximo: NaN, media: NaN, variacao: NaN };
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  const desvio = Math.sqrt(valores.reduce((s, v) => s + (v - media) * (v - media), 0) / valores.length);
  return {
    meses: valores.length,
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
    media,
    variacao: media > 0 ? desvio / media : NaN,
  };
}

/**
 * Resumo com todos os indicadores de um fundo, no formato usado pelas
 * páginas. `fundo` é um item de fiis.json; `datas` é a lista de pregões.
 */
export function indicadoresFundo(fundo, datas) {
  const dataFinal = datas[datas.length - 1];
  const preco = ultimoPreco(fundo.fechamentos);
  const soma12 = proventos12Meses(fundo.rendimentos, dataFinal);
  const negociado = fundo.fechamentos.filter((p) => p).length;
  return {
    preco,
    rendimentos12m: soma12,
    dividendYield: soma12 > 0 ? dividendYield(soma12, preco) : NaN,
    pvp: precoSobreValorPatrimonial(preco, fundo.informe.valorPatrimonialCota),
    variacaoPreco: variacaoPreco(fundo.fechamentos),
    retornoTotal: retornoTotal(fundo.fechamentos, datas, fundo.rendimentos),
    volatilidade: volatilidadeAnual(fundo.fechamentos),
    quedaMaxima: quedaMaxima(fundo.fechamentos),
    regularidade: regularidadeRendimentos(fundo.rendimentos, dataFinal),
    // Fundos listados há pouco tempo têm histórico curto: os números de 12
    // meses ficam incompletos e a página avisa.
    historicoCompleto: negociado >= datas.length * 0.9,
  };
}
