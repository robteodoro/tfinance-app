// =============================================================================
// Cálculos da carteira pessoal: posições, preço médio, valor da renda fixa,
// proventos recebidos, evolução no tempo, correlação e concentração.
// (As medidas de risco com o histórico longo ficam em calc/risco.js.)
//
// Funções puras (sem acesso à página, ao navegador ou à internet), testadas
// em testes/carteira.teste.js.
//
// Formato dos dados da carteira (guardados só no navegador da pessoa):
//   operacoes:  [{ id, tipo: 'compra'|'venda'|'ajuste', codigo, data, quantidade, preco, custos }]
//               "ajuste" = ações recebidas ou retiradas sem custo
//               (bonificação, desdobramento, grupamento): quantidade com sinal.
//   rendaFixa:  [{ id, nome, produto, indexador, taxa, data, valor, vencimento, resgate: {data, valor} }]
//   outros:     [{ id, nome, valor, data }]   bens com valor informado à mão
//
// Datas "AAAA-MM-DD"; taxas em decimal (1,1 = 110% do CDI; 0,06 = 6% a.a.).
// =============================================================================

import { taxaPercentualCDI, compor } from './taxas.js';
import { impostosNoResgate } from './impostos.js';
import { CUSTODIA_TESOURO } from '../config/tributos.js';
import { PRODUTOS } from '../config/produtos.js';

const DIA = 86400000;
const paraData = (iso) => new Date(`${iso}T12:00:00Z`);
export const diasEntre = (inicio, fim) => Math.round((paraData(fim) - paraData(inicio)) / DIA);

// ---------------------------------------------------------------------------
// Ações, FIIs e ETFs
// ---------------------------------------------------------------------------

/** Operações em ordem de data (compras antes de vendas no mesmo dia). */
function emOrdem(operacoes) {
  const peso = { compra: 0, ajuste: 1, venda: 2 };
  return operacoes.slice().sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : peso[a.tipo] - peso[b.tipo]));
}

/**
 * Posição de cada ativo a partir das operações até `ate` (inclusive).
 * Para cada código devolve:
 *   quantidade, custo (do que ainda se tem), precoMedio,
 *   lucroRealizado (ganho ou perda nas vendas), primeiraData.
 *
 * Preço médio: o custo total das compras (com taxas) dividido pela
 * quantidade. Vendas não mudam o preço médio; o resultado da venda é
 * (preço de venda − preço médio) × quantidade − custos da venda.
 */
export function calcularPosicoes(operacoes, ate = '9999-12-31') {
  const posicoes = {};
  for (const op of emOrdem(operacoes)) {
    if (op.data > ate) continue;
    const p = posicoes[op.codigo] || (posicoes[op.codigo] = {
      codigo: op.codigo, quantidade: 0, custo: 0, lucroRealizado: 0, primeiraData: op.data,
    });
    const custos = op.custos || 0;
    if (op.tipo === 'compra') {
      p.quantidade += op.quantidade;
      p.custo += op.quantidade * op.preco + custos;
    } else if (op.tipo === 'venda') {
      const quantidade = Math.min(op.quantidade, p.quantidade);
      const precoMedio = p.quantidade > 0 ? p.custo / p.quantidade : 0;
      p.lucroRealizado += quantidade * (op.preco - precoMedio) - custos;
      p.custo -= quantidade * precoMedio;
      p.quantidade -= quantidade;
    } else if (op.tipo === 'ajuste') {
      // Bonificação/desdobramento: muda a quantidade, não o custo total.
      p.quantidade = Math.max(0, p.quantidade + op.quantidade);
      if (p.quantidade === 0) p.custo = 0;
    }
  }
  for (const p of Object.values(posicoes)) {
    if (p.quantidade < 1e-9) { p.quantidade = 0; p.custo = 0; }
    p.precoMedio = p.quantidade > 0 ? p.custo / p.quantidade : NaN;
  }
  return posicoes;
}

/** Quantidade de um ativo que a pessoa tinha ao final do dia `data`. */
export function quantidadeNaData(operacoes, codigo, data) {
  const p = calcularPosicoes(operacoes.filter((op) => op.codigo === codigo), data)[codigo];
  return p ? p.quantidade : 0;
}

/**
 * Proventos recebidos: para cada provento do ativo, a quantidade que a pessoa
 * tinha na data com × o valor por ação ou cota.
 * `proventos` = [[dataCom, pagamento, valor, ...], ...]
 */
export function proventosRecebidos(operacoes, codigo, proventos) {
  const recebidos = [];
  for (const [dataCom, pagamento, valor] of proventos) {
    const quantidade = quantidadeNaData(operacoes, codigo, dataCom);
    if (quantidade > 0) recebidos.push({ codigo, dataCom, pagamento, valor, quantidade, total: quantidade * valor });
  }
  return recebidos;
}

/**
 * Dinheiro que entrou na carteira (positivo) ou saiu dela (negativo) em cada
 * operação: compras somam, vendas subtraem. Usado para comparar com o CDI.
 */
export function fluxoDasOperacoes(operacoes) {
  return operacoes
    .filter((op) => op.tipo !== 'ajuste')
    .map((op) => ({
      data: op.data,
      valor: op.tipo === 'compra'
        ? op.quantidade * op.preco + (op.custos || 0)
        : -(op.quantidade * op.preco - (op.custos || 0)),
    }));
}

// ---------------------------------------------------------------------------
// Renda fixa
// ---------------------------------------------------------------------------

/**
 * Valor de uma série mensal [["AAAA-MM", valor], ...] em um mês. Antes do
 * início usa o primeiro valor; depois do fim, o último (taxas ainda não
 * publicadas repetem a mais recente).
 */
function valorNoMes(serie, mes) {
  if (!serie || !serie.length) return NaN;
  let valor = serie[0][1];
  for (const [m, v] of serie) {
    if (m > mes) break;
    valor = v;
  }
  return valor;
}

/**
 * Fator de crescimento bruto de uma aplicação entre duas datas, usando as
 * taxas que de fato vigoraram em cada mês (histórico do Banco Central).
 *
 *   historicos = { cdi: [[mes, % a.a.]], ipcaMensal: [[mes, % a.m.]],
 *                  ipca12m: [[mes, %]], poupancaMensal: [[mes, % a.m.]] }
 *
 * Cada mês contribui pela fração de dias da aplicação nele.
 */
export function fatorRendaFixa(indexador, taxa, inicio, fim, historicos) {
  if (fim <= inicio) return 1;
  if (indexador === 'pre') return Math.pow(1 + taxa, diasEntre(inicio, fim) / 365);
  let fator = 1;
  const dataFim = paraData(fim);
  let comeco = paraData(`${inicio.slice(0, 7)}-01`);
  while (comeco < dataFim) {
    const proximo = new Date(comeco);
    proximo.setUTCMonth(proximo.getUTCMonth() + 1);
    const de = Math.max(comeco, paraData(inicio));
    const ate = Math.min(proximo, dataFim);
    const fracao = (ate - de) / (proximo - comeco); // parte do mês aplicada
    const mes = comeco.toISOString().slice(0, 7);
    if (fracao > 0) {
      const cdi = valorNoMes(historicos.cdi, mes) / 100;
      let mensal;
      if (indexador === 'cdi') {
        mensal = Math.pow(1 + taxaPercentualCDI(taxa, cdi), 1 / 12) - 1;
      } else if (indexador === 'selic') {
        // A Selic efetiva diária é praticamente igual ao CDI.
        mensal = Math.pow(1 + compor(cdi, taxa), 1 / 12) - 1;
      } else if (indexador === 'ipca') {
        // Mês sem IPCA divulgado: usa o ritmo dos últimos 12 meses.
        const publicado = historicos.ipcaMensal.some(([m]) => m === mes);
        const ipca = publicado
          ? valorNoMes(historicos.ipcaMensal, mes) / 100
          : Math.pow(1 + valorNoMes(historicos.ipca12m, mes) / 100, 1 / 12) - 1;
        mensal = compor(ipca, Math.pow(1 + taxa, 1 / 12) - 1);
      } else if (indexador === 'poupanca') {
        mensal = valorNoMes(historicos.poupancaMensal, mes) / 100;
      } else {
        throw new Error(`Indexador desconhecido: ${indexador}`);
      }
      fator *= Math.pow(1 + mensal, fracao);
    }
    comeco = proximo;
  }
  return fator;
}

/**
 * Valor de uma aplicação de renda fixa em uma data, se resgatada naquele dia.
 * Devolve { bruto, rendimento, custodia, iof, ir, liquido, resgatada }.
 *
 * Estimativa "pela curva": usa as taxas contratadas, sem a marcação a
 * mercado (o preço de venda antecipada pode ser maior ou menor).
 */
export function valorRendaFixa(aplicacao, data, historicos) {
  const vazio = { bruto: 0, rendimento: 0, custodia: 0, iof: 0, ir: 0, liquido: 0, resgatada: false };
  if (data < aplicacao.data) return vazio;
  if (aplicacao.resgate && data >= aplicacao.resgate.data) {
    return { ...vazio, resgatada: true };
  }
  // Depois do vencimento o dinheiro para de render (fica disponível).
  const fim = aplicacao.vencimento && aplicacao.vencimento < data ? aplicacao.vencimento : data;
  const produto = PRODUTOS[aplicacao.produto];
  const bruto = aplicacao.valor * fatorRendaFixa(aplicacao.indexador, aplicacao.taxa, aplicacao.data, fim, historicos);
  const dias = diasEntre(aplicacao.data, fim);

  // Taxa de custódia da B3 nos títulos públicos (0,20% ao ano), com a
  // isenção do Tesouro Selic até o limite definido em config/tributos.js.
  let custodia = 0;
  if (produto && produto.custodia) {
    const isento = produto.custodia === 'tesouro-selic' && bruto <= CUSTODIA_TESOURO.isencaoTesouroSelicAte;
    if (!isento) custodia = ((aplicacao.valor + bruto) / 2) * CUSTODIA_TESOURO.taxaAnual * (dias / 365);
  }
  const rendimento = bruto - aplicacao.valor;
  const { iof, ir } = impostosNoResgate(rendimento - custodia, dias, Boolean(produto && produto.isentoIR));
  return { bruto, rendimento, custodia, iof, ir, liquido: bruto - custodia - iof - ir, resgatada: false };
}

/** Fluxo de dinheiro da renda fixa: aplicações entram, resgates saem. */
export function fluxoDaRendaFixa(rendaFixa) {
  const fluxo = [];
  for (const a of rendaFixa) {
    fluxo.push({ data: a.data, valor: a.valor });
    if (a.resgate) fluxo.push({ data: a.resgate.data, valor: -a.resgate.valor });
  }
  return fluxo;
}

// ---------------------------------------------------------------------------
// Comparação com o CDI
// ---------------------------------------------------------------------------

/**
 * Quanto valeria hoje o mesmo dinheiro, aplicado e retirado nas mesmas datas,
 * se rendesse 100% do CDI (bruto). `fluxo` = [{ data, valor }].
 */
export function valorSeFosseCDI(fluxo, data, historicos) {
  return fluxo
    .filter((f) => f.data <= data)
    .reduce((soma, f) => soma + f.valor * fatorRendaFixa('cdi', 1, f.data, data, historicos), 0);
}

// ---------------------------------------------------------------------------
// Risco
// ---------------------------------------------------------------------------

/** Covariância entre duas listas de variações (só onde as duas existem). */
export function covariancia(a, b) {
  const pares = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== null && b[i] !== null) pares.push([a[i], b[i]]);
  if (pares.length < 10) return NaN;
  const mediaA = pares.reduce((s, p) => s + p[0], 0) / pares.length;
  const mediaB = pares.reduce((s, p) => s + p[1], 0) / pares.length;
  return pares.reduce((s, p) => s + (p[0] - mediaA) * (p[1] - mediaB), 0) / (pares.length - 1);
}

/** Correlação: de −1 (andam em sentidos opostos) a +1 (andam juntos). */
export function correlacao(a, b) {
  const c = covariancia(a, b);
  return c / Math.sqrt(covariancia(a, a) * covariancia(b, b));
}

/**
 * Concentração da carteira pelo índice de Herfindahl (soma dos pesos ao
 * quadrado). "Número efetivo" = 1 ÷ índice: uma carteira com 10 ativos, mas
 * 90% em um deles, equivale a pouco mais de 1 ativo.
 */
export function concentracao(pesos) {
  const indice = pesos.reduce((s, p) => s + p * p, 0);
  return { indice, numeroEfetivo: indice > 0 ? 1 / indice : NaN, maiorPeso: Math.max(0, ...pesos) };
}
