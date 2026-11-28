// =============================================================================
// Simulador de aplicações de renda fixa.
//
// Como funciona:
//   1. Cada depósito (aplicação inicial e cada aporte mensal) é tratado como
//      um "lote" separado, porque o Imposto de Renda depende de quanto tempo
//      CADA depósito ficou aplicado.
//   2. O tempo avança mês a mês. Em cada passo, todos os lotes rendem e, se o
//      produto tiver taxa de custódia, ela é descontada.
//   3. No resgate, calcula-se IOF e IR de cada lote sobre o seu rendimento.
//
// Simplificações (adequadas para um simulador, não para conferir extrato):
//   - Taxas constantes durante todo o período (o cenário é uma média).
//   - Um mês = 365/12 dias corridos; a taxa anual é aplicada por dias corridos.
//   - Títulos levados até o vencimento (sem marcação a mercado).
// =============================================================================

import { impostosNoResgate, aliquotaIR } from './impostos.js';
import { bissecao, menorValorQueAtinge } from './resolver.js';
import { CUSTODIA_TESOURO } from '../config/tributos.js';

export const DIAS_POR_MES = 365 / 12;

/** Valor de resgate líquido de um conjunto de lotes no dia `dia`. */
function avaliarLotes(lotes, dia, isentoIR) {
  let bruto = 0, iof = 0, ir = 0;
  for (const lote of lotes) {
    const impostos = impostosNoResgate(lote.valor - lote.principal, dia - lote.dia, isentoIR);
    bruto += lote.valor;
    iof += impostos.iof;
    ir += impostos.ir;
  }
  return { bruto, iof, ir, liquido: bruto - iof - ir };
}

/** Parte do saldo sobre a qual incide taxa de custódia. */
function baseDeCustodia(tipo, saldo) {
  if (tipo === 'tesouro') return saldo;
  if (tipo === 'tesouro-selic') return Math.max(0, saldo - CUSTODIA_TESOURO.isencaoTesouroSelicAte);
  return 0;
}

/**
 * Simula uma aplicação.
 *
 * @param {object}  p
 * @param {object}  p.produto        item de config/produtos.js
 * @param {number}  p.taxaAnual      rentabilidade bruta efetiva ao ano (decimal)
 * @param {number}  p.dias           prazo total em dias corridos
 * @param {number} [p.valorInicial]  depósito no dia zero
 * @param {number} [p.aporteMensal]  depósito no início de cada mês, inclusive o primeiro
 * @param {number} [p.inflacaoAnual] para calcular o valor em reais de hoje
 * @returns {{serie: object[], resumo: object}}
 */
export function simular(p) {
  const { produto, taxaAnual, dias } = p;
  const valorInicial = p.valorInicial || 0;
  const aporteMensal = p.aporteMensal || 0;
  const inflacaoAnual = p.inflacaoAnual || 0;

  const lotes = [];
  const fluxos = []; // depósitos, usados para calcular a rentabilidade anual
  let custodiaTotal = 0;

  function depositar(valor, dia) {
    if (valor <= 0) return;
    lotes.push({ principal: valor, valor, dia });
    fluxos.push({ valor, dia });
  }

  const serie = [];
  function registrar(dia, mes) {
    const r = avaliarLotes(lotes, dia, produto.isentoIR);
    const investido = fluxos.reduce((soma, f) => soma + f.valor, 0);
    serie.push({ dia, mes, investido, bruto: r.bruto, liquido: r.liquido });
  }

  // Dia zero: aplicação inicial e primeiro aporte.
  depositar(valorInicial, 0);
  depositar(aporteMensal, 0);
  registrar(0, 0);

  let diaAtual = 0;
  for (let mes = 1; diaAtual < dias; mes++) {
    const proximoDia = Math.min(mes * DIAS_POR_MES, dias);
    const anos = (proximoDia - diaAtual) / 365;

    // 1. Rendimento do período.
    const fator = Math.pow(1 + taxaAnual, anos);
    for (const lote of lotes) lote.valor *= fator;

    // 2. Taxa de custódia, descontada proporcionalmente de cada lote.
    const saldo = lotes.reduce((soma, l) => soma + l.valor, 0);
    const custodia = baseDeCustodia(produto.custodia, saldo) * CUSTODIA_TESOURO.taxaAnual * anos;
    if (custodia > 0) {
      for (const lote of lotes) lote.valor -= custodia * (lote.valor / saldo);
      custodiaTotal += custodia;
    }

    diaAtual = proximoDia;
    registrar(diaAtual, diaAtual / DIAS_POR_MES);

    // 3. Aporte no início do mês seguinte (se ainda houver prazo).
    if (diaAtual < dias) depositar(aporteMensal, diaAtual);
  }

  const final = avaliarLotes(lotes, dias, produto.isentoIR);
  const totalInvestido = fluxos.reduce((soma, f) => soma + f.valor, 0);
  const deflator = Math.pow(1 + inflacaoAnual, dias / 365);

  return {
    serie,
    resumo: {
      dias,
      totalInvestido,
      valorBruto: final.bruto,
      rendimentoBruto: final.bruto - totalInvestido,
      custodia: custodiaTotal,
      iof: final.iof,
      ir: final.ir,
      valorLiquido: final.liquido,
      rendimentoLiquido: final.liquido - totalInvestido,
      valorLiquidoReal: final.liquido / deflator,
      taxaLiquidaAnual: taxaInternaDeRetorno(fluxos, final.liquido, dias),
    },
  };
}

/**
 * Rentabilidade anual equivalente, já descontados impostos e taxas.
 * É a taxa que, aplicada a cada depósito, produziria exatamente o valor
 * líquido final ("taxa interna de retorno").
 */
export function taxaInternaDeRetorno(fluxos, valorFinal, dias) {
  if (dias <= 0 || fluxos.length === 0) return 0;
  const diferenca = (taxa) =>
    fluxos.reduce((soma, f) => soma + f.valor * Math.pow(1 + taxa, (dias - f.dia) / 365), 0) - valorFinal;
  const taxa = bissecao(diferenca, -0.99, 10, 200);
  return taxa === null ? 0 : taxa;
}

/**
 * Quanto aplicar HOJE (de uma só vez) para obter `meta` líquida ao final.
 * Se houver aporte mensal em `p`, ele é mantido e só o valor inicial é calculado.
 */
export function valorInicialNecessario(meta, p) {
  return menorValorQueAtinge(
    (v) => simular({ ...p, valorInicial: v }).resumo.valorLiquido - meta,
    meta,
  );
}

/**
 * Quanto aplicar POR MÊS para obter `meta` líquida ao final.
 * Se houver valor inicial em `p`, ele é mantido e só o aporte é calculado.
 */
export function aporteMensalNecessario(meta, p) {
  const meses = Math.max(1, Math.ceil(p.dias / DIAS_POR_MES));
  return menorValorQueAtinge(
    (a) => simular({ ...p, aporteMensal: a }).resumo.valorLiquido - meta,
    meta / meses,
  );
}

/**
 * Taxa bruta que um produto TRIBUTADO precisa render para empatar com um
 * produto ISENTO, numa aplicação única mantida por `dias` dias.
 *   Ex.: LCI a 12% a.a. por 2 anos ≈ CDB a 13,9% a.a.
 */
export function taxaTributadaEquivalente(taxaIsenta, dias) {
  const anos = dias / 365;
  const ganhoIsento = Math.pow(1 + taxaIsenta, anos) - 1;
  const ganhoBrutoNecessario = ganhoIsento / (1 - aliquotaIR(dias));
  return Math.pow(1 + ganhoBrutoNecessario, 1 / anos) - 1;
}

/** Operação inversa: taxa isenta que empata com uma taxa tributada. */
export function taxaIsentaEquivalente(taxaTributada, dias) {
  const anos = dias / 365;
  const ganhoBruto = Math.pow(1 + taxaTributada, anos) - 1;
  const ganhoLiquido = ganhoBruto * (1 - aliquotaIR(dias));
  return Math.pow(1 + ganhoLiquido, 1 / anos) - 1;
}
