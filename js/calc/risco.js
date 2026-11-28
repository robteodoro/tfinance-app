// =============================================================================
// Risco da carteira com o histórico longo (mês a mês, desde 2015).
//
// Ideia central: "e se eu tivesse a carteira de hoje durante os últimos
// anos?". Com os pesos atuais de cada investimento e o que cada um de fato
// rendeu em cada mês, montamos a sequência de retornos mensais da carteira.
// Dela saem todas as medidas, sem supor que os retornos seguem uma curva
// "normal": as perdas são as que realmente aconteceram (simulação histórica).
//
//   - volatilidade, perda em um mês ruim e média dos piores meses;
//   - maior queda e tempo de recuperação;
//   - cenários de crise (Covid, recessão de 2015-16, alta de juros...);
//   - quanto a carteira costuma reagir ao dólar e aos juros;
//   - perda da renda fixa prefixada e IPCA+ se os juros subirem.
//
// Funções puras, testadas em testes/risco.teste.js.
// Séries mensais: um valor por mês, null quando não há dado.
// =============================================================================

import { regressao } from './historico.js';

// Crises que aparecem no histórico. Cada cenário vai do fechamento do mês
// anterior a `inicio` até o fechamento de `fim`.
export const CENARIOS = [
  { nome: 'Recessão e crise política', inicio: '2015-05', fim: '2016-01',
    descricao: 'PIB em queda, perda do grau de investimento e início do processo de impeachment' },
  { nome: 'Greve dos caminhoneiros', inicio: '2018-05', fim: '2018-06',
    descricao: 'paralisação do país e incerteza eleitoral' },
  { nome: 'Pandemia de Covid-19', inicio: '2020-02', fim: '2020-03',
    descricao: 'a queda mais rápida da bolsa no período' },
  { nome: 'Alta forte dos juros', inicio: '2021-07', fim: '2022-06',
    descricao: 'Selic subiu de 4,25% para 13,25% ao ano em 12 meses' },
  { nome: 'Desconfiança fiscal', inicio: '2024-09', fim: '2024-12',
    descricao: 'dólar passou de R$ 6 e os juros futuros dispararam' },
];

// Fração dos meses usada para "um mês ruim": 1 em cada 20 (5%).
export const NIVEL_MES_RUIM = 0.05;

const valido = (v) => v !== null && v !== undefined && Number.isFinite(v);

/** Retorno de um índice entre dois meses seguidos (null se faltar um). */
function retornoDoIndice(indice, k) {
  return indice && valido(indice[k]) && valido(indice[k - 1]) && indice[k - 1] > 0
    ? indice[k] / indice[k - 1] - 1
    : null;
}

/**
 * Retornos mensais da carteira de hoje, com os pesos de hoje (reajustados
 * todo mês). Cada componente é um dos tipos:
 *   { peso, tipo: 'variavel', indice }  ação, FII ou ETF (índice mensal de
 *        retorno total; meses sem dado usam o Ibovespa no lugar)
 *   { peso, tipo: 'cdi' }   renda fixa: rende o CDI de cada mês
 *   { peso, tipo: 'fixo' }  outros bens: valor constante
 * `fatores` = { ibovespa: [índice], cdi: [taxa do mês em decimal] }
 *
 * Devolve { retornos, substituido }: retornos[0] = null; substituido[k] =
 * peso que usou o Ibovespa no lugar do ativo (sem histórico naquele mês).
 */
export function retornosCarteira(componentes, fatores) {
  const n = fatores.ibovespa.length;
  const retornos = [null];
  const substituido = [0];
  for (let k = 1; k < n; k++) {
    const ibovespa = retornoDoIndice(fatores.ibovespa, k);
    let total = 0;
    let semDado = 0;
    for (const c of componentes) {
      let r = 0;
      if (c.tipo === 'cdi') {
        r = valido(fatores.cdi[k]) ? fatores.cdi[k] : 0;
      } else if (c.tipo === 'variavel') {
        r = retornoDoIndice(c.indice, k);
        if (r === null) {
          r = ibovespa === null ? 0 : ibovespa;
          semDado += c.peso;
        }
      }
      total += c.peso * r;
    }
    retornos.push(total);
    substituido.push(semDado);
  }
  return { retornos, substituido };
}

/** Índice acumulado a partir dos retornos mensais (começa em 100). */
export function indiceAcumulado(retornos) {
  let valor = 100;
  return retornos.map((r, k) => {
    if (k > 0) valor *= 1 + (valido(r) ? r : 0);
    return valor;
  });
}

/** Retornos mensais de um índice qualquer (Ibovespa, dólar...). */
export function retornosDoIndice(indice) {
  return indice.map((_, k) => (k > 0 ? retornoDoIndice(indice, k) : null));
}

/** Desvio padrão dos retornos mensais, em ritmo anual (× √12). */
export function volatilidadeAnual(retornos) {
  const v = retornos.filter(valido);
  if (v.length < 12) return NaN;
  const media = v.reduce((s, x) => s + x, 0) / v.length;
  const variancia = v.reduce((s, x) => s + (x - media) ** 2, 0) / (v.length - 1);
  return Math.sqrt(variancia * 12);
}

/**
 * Perdas mensais que de fato aconteceram (simulação histórica):
 *   perdaMesRuim  - perda que só foi superada em 1 de cada 20 meses
 *                   (o pior mês entre os 5% piores); positiva = perda
 *   mediaPiores   - média desses 5% piores meses (quanto se perde, em média,
 *                   quando o mês é muito ruim; "CVaR" no jargão)
 *   pior          - { k, retorno } o pior mês de todos
 *   quantidade    - quantos meses formam os 5% piores; n - meses usados
 */
export function perdasMensais(retornos, nivel = NIVEL_MES_RUIM) {
  const meses = retornos.map((r, k) => ({ k, r })).filter((m) => valido(m.r)).sort((a, b) => a.r - b.r);
  if (meses.length < 12) return null;
  const quantidade = Math.max(1, Math.round(meses.length * nivel));
  const piores = meses.slice(0, quantidade);
  return {
    perdaMesRuim: -piores[quantidade - 1].r,
    mediaPiores: -piores.reduce((s, m) => s + m.r, 0) / quantidade,
    pior: { k: meses[0].k, retorno: meses[0].r },
    quantidade,
    n: meses.length,
  };
}

/**
 * Maior queda de um índice (do pico ao fundo) e quanto tempo levou para
 * voltar ao pico. Devolve { queda (negativa), pico, fundo, recuperacao }:
 * posições no índice; recuperacao = null se ainda não voltou.
 */
export function quedaMaximaDetalhada(indice) {
  let pico = 0;
  const pior = { queda: 0, pico: 0, fundo: 0, recuperacao: null };
  for (let k = 0; k < indice.length; k++) {
    if (indice[k] > indice[pico]) pico = k;
    const queda = indice[k] / indice[pico] - 1;
    if (queda < pior.queda) Object.assign(pior, { queda, pico, fundo: k, recuperacao: null });
  }
  if (pior.queda < 0) {
    for (let k = pior.fundo + 1; k < indice.length; k++) {
      if (indice[k] >= indice[pior.pico]) { pior.recuperacao = k; break; }
    }
  }
  return pior;
}

/**
 * Retorno acumulado entre os meses `inicio` e `fim` (inclusive), a partir
 * do fechamento do mês anterior a `inicio`. NaN se o período não estiver
 * todo no histórico.
 */
export function retornoNoPeriodo(retornos, meses, inicio, fim) {
  const a = meses.indexOf(inicio);
  const b = meses.indexOf(fim);
  if (a < 1 || b < a) return NaN;
  let fator = 1;
  for (let k = a; k <= b; k++) {
    if (!valido(retornos[k])) return NaN;
    fator *= 1 + retornos[k];
  }
  return fator - 1;
}

/** Pior sequência de `janela` meses seguidos: { retorno, inicio, fim } (posições). */
export function piorJanela(retornos, janela = 12) {
  let pior = null;
  for (let fim = janela; fim < retornos.length; fim++) {
    let fator = 1;
    let completo = true;
    for (let k = fim - janela + 1; k <= fim; k++) {
      if (!valido(retornos[k])) { completo = false; break; }
      fator *= 1 + retornos[k];
    }
    if (completo && (!pior || fator - 1 < pior.retorno)) pior = { retorno: fator - 1, inicio: fim - janela + 1, fim };
  }
  return pior;
}

/**
 * Quanto a carteira costuma variar junto com um fator (dólar, juros,
 * Ibovespa), por regressão simples dos retornos mensais:
 *   retorno da carteira = a + coeficiente × variação do fator
 * Aqui NÃO descontamos o movimento da bolsa: queremos o efeito total sobre
 * o patrimônio (inclusive o que vem pela bolsa toda). Devolve
 * { coeficiente, t, r2, n } ou null. Com |t| < 2 a relação é fraca.
 */
export function reacaoAoFator(retornos, variacoesDoFator) {
  const y = [];
  const x = [];
  for (let k = 0; k < retornos.length; k++) {
    if (valido(retornos[k]) && valido(variacoesDoFator[k])) {
      y.push(retornos[k]);
      x.push(variacoesDoFator[k]);
    }
  }
  if (y.length < 24) return null;
  const r = regressao(y, [x]);
  if (!r) return null;
  return { coeficiente: r.coeficientes[1], t: r.estatisticaT[1], r2: r.r2, n: r.n };
}

// -----------------------------------------------------------------------------
// Renda fixa: sensibilidade aos juros (marcação a mercado)
// -----------------------------------------------------------------------------

/**
 * Duração modificada aproximada de uma aplicação prefixada ou IPCA+: quanto
 * o valor de mercado cai (em fração) para cada 1 ponto percentual de alta
 * nos juros, se fosse vendida antes do vencimento.
 *   duração ≈ anos até o vencimento ÷ (1 + taxa)
 * É exata para títulos sem cupom (Tesouro Prefixado, Tesouro IPCA+ e a
 * maioria dos CDBs); títulos com juros semestrais têm duração um pouco menor.
 * Pós-fixados (CDI, Selic) e poupança acompanham os juros: duração ~0.
 * Quem leva o título até o vencimento recebe a taxa contratada de qualquer
 * forma; a perda só se realiza se vender antes.
 */
export function duracaoModificada(aplicacao, hoje) {
  if (!['pre', 'ipca'].includes(aplicacao.indexador) || !aplicacao.vencimento || aplicacao.vencimento <= hoje) return 0;
  const anos = (new Date(`${aplicacao.vencimento}T12:00:00Z`) - new Date(`${hoje}T12:00:00Z`)) / (365.25 * 86400000);
  return anos / (1 + (aplicacao.taxa || 0));
}
