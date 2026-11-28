// =============================================================================
// Cálculos sobre preços de mercado, comuns a FIIs e ações: último preço,
// variação, retorno total, volatilidade, queda máxima e soma de proventos.
//
// Funções puras (sem acesso à página ou à internet), testadas em
// testes/mercado.teste.js.
//
// Convenções:
//   - datas no formato "AAAA-MM-DD" (comparáveis como texto);
//   - `fechamentos` é a lista de preços de fechamento, um por pregão, com
//     `null` nos dias em que o ativo não foi negociado;
//   - `proventos` é a lista [dataCom, dataPagamento, valorPorCota, ...];
//   - percentuais são devolvidos em decimal (0,1 = 10%).
// =============================================================================

const DIAS_UTEIS_NO_ANO = 252;

/** Último preço disponível (o fechamento mais recente com negociação). */
export function ultimoPreco(fechamentos) {
  for (let i = fechamentos.length - 1; i >= 0; i--) {
    if (fechamentos[i]) return fechamentos[i];
  }
  return NaN;
}

/** Primeiro preço disponível na lista. */
export function primeiroPreco(fechamentos) {
  const preco = fechamentos.find((p) => p);
  return preco || NaN;
}

/** Data ISO `dias` dias antes de `dataIso`. */
export function diasAntes(dataIso, dias) {
  const data = new Date(`${dataIso}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() - dias);
  return data.toISOString().slice(0, 10);
}

/**
 * Soma dos proventos (dividendos, JCP, rendimentos) por ação ou cota cuja
 * "data com" caiu nos 12 meses que terminam em `dataFinal`. É o numerador
 * do Dividend Yield.
 */
export function proventos12Meses(proventos, dataFinal) {
  const inicio = diasAntes(dataFinal, 365);
  return proventos
    .filter(([dataCom]) => dataCom > inicio && dataCom <= dataFinal)
    .reduce((soma, [, , valor]) => soma + valor, 0);
}

/** Variação do preço entre o primeiro e o último pregão da lista. */
export function variacaoPreco(fechamentos) {
  return ultimoPreco(fechamentos) / primeiroPreco(fechamentos) - 1;
}

/**
 * Retorno total no período: variação do preço somada aos proventos
 * recebidos por quem tinha o ativo desde o primeiro pregão.
 * (Simplificação: os proventos não são reinvestidos.)
 */
export function retornoTotal(fechamentos, datas, proventos) {
  const inicio = datas[fechamentos.findIndex((p) => p)];
  const fim = datas[datas.length - 1];
  const recebidos = proventos
    .filter(([dataCom]) => dataCom >= inicio && dataCom <= fim)
    .reduce((soma, [, , valor]) => soma + valor, 0);
  return (ultimoPreco(fechamentos) + recebidos) / primeiroPreco(fechamentos) - 1;
}

/** Variações diárias (em logaritmo) entre pregões consecutivos com preço. */
function variacoesDiarias(fechamentos) {
  const precos = fechamentos.filter((p) => p);
  const variacoes = [];
  for (let i = 1; i < precos.length; i++) variacoes.push(Math.log(precos[i] / precos[i - 1]));
  return variacoes;
}

/**
 * Volatilidade anualizada: desvio-padrão das variações diárias × √252.
 * Com menos de 60 pregões o número não é confiável e devolvemos NaN.
 */
export function volatilidadeAnual(fechamentos) {
  const variacoes = variacoesDiarias(fechamentos);
  if (variacoes.length < 60) return NaN;
  const media = variacoes.reduce((s, v) => s + v, 0) / variacoes.length;
  const variancia = variacoes.reduce((s, v) => s + (v - media) * (v - media), 0) / (variacoes.length - 1);
  return Math.sqrt(variancia) * Math.sqrt(DIAS_UTEIS_NO_ANO);
}

/**
 * Queda máxima (drawdown): a maior perda do ponto mais alto até um ponto mais
 * baixo posterior. Devolve um número negativo (ex.: -0,18 = queda de 18%).
 */
export function quedaMaxima(fechamentos) {
  let pico = -Infinity;
  let pior = 0;
  for (const preco of fechamentos) {
    if (!preco) continue;
    pico = Math.max(pico, preco);
    pior = Math.min(pior, preco / pico - 1);
  }
  return pior;
}

/** Preço de fechamento na data indicada ou no pregão anterior mais próximo. */
export function precoNaData(fechamentos, datas, dataIso) {
  for (let i = datas.length - 1; i >= 0; i--) {
    if (datas[i] <= dataIso && fechamentos[i]) return fechamentos[i];
  }
  return NaN;
}

/**
 * Beta: quanto o ativo costuma variar quando o mercado varia 1%.
 *   beta 1   -> acompanha o mercado;
 *   beta 1,5 -> amplifica (sobe e cai 50% mais que o mercado);
 *   beta 0,5 -> oscila metade.
 * Calculado com as variações diárias dos dias em que os dois foram
 * negociados (covariância ÷ variância do mercado). Com menos de 60 dias em
 * comum, devolve NaN.
 */
export function beta(fechamentos, fechamentosMercado) {
  const ativo = [];
  const mercado = [];
  for (let i = 1; i < fechamentos.length; i++) {
    if (fechamentos[i] && fechamentos[i - 1] && fechamentosMercado[i] && fechamentosMercado[i - 1]) {
      ativo.push(Math.log(fechamentos[i] / fechamentos[i - 1]));
      mercado.push(Math.log(fechamentosMercado[i] / fechamentosMercado[i - 1]));
    }
  }
  if (ativo.length < 60) return NaN;
  const media = (lista) => lista.reduce((s, v) => s + v, 0) / lista.length;
  const mediaAtivo = media(ativo);
  const mediaMercado = media(mercado);
  let covariancia = 0;
  let variancia = 0;
  for (let i = 0; i < ativo.length; i++) {
    covariancia += (ativo[i] - mediaAtivo) * (mercado[i] - mediaMercado);
    variancia += (mercado[i] - mediaMercado) * (mercado[i] - mediaMercado);
  }
  return variancia > 0 ? covariancia / variancia : NaN;
}

/**
 * Rendimento acumulado de uma taxa anual que mudou ao longo do tempo (ex.:
 * CDI), entre duas datas. `historico` é a lista [["AAAA-MM", taxa % a.a.], ...]
 * com a taxa de cada mês; cada mês rende 1/12 da taxa anual (composta).
 * Meses só parcialmente no intervalo contam pela fração de dias.
 */
export function acumularTaxaAnual(historico, inicioIso, fimIso) {
  const inicio = new Date(`${inicioIso}T12:00:00Z`);
  const fim = new Date(`${fimIso}T12:00:00Z`);
  let fator = 1;
  for (const [mes, taxa] of historico) {
    const comeco = new Date(`${mes}-01T12:00:00Z`);
    const proximo = new Date(comeco);
    proximo.setUTCMonth(proximo.getUTCMonth() + 1);
    const diasNoMes = (proximo - comeco) / 86400000;
    const dias = (Math.min(proximo, fim) - Math.max(comeco, inicio)) / 86400000;
    if (dias > 0) fator *= Math.pow(1 + taxa / 100, (dias / diasNoMes) / 12);
  }
  return fator - 1;
}
