// =============================================================================
// Indicadores de ações, calculados a partir de site/dados/acoes.json:
// cotações e proventos (B3) e números dos balanços (CVM).
//
// Funções puras, testadas em testes/acoes.teste.js. Os cálculos de preço
// comuns a FIIs e ações (volatilidade, queda máxima...) ficam em mercado.js.
//
// Valores monetários em reais; percentuais em decimal (0,1 = 10%).
// "12 meses" = soma dos quatro últimos trimestres divulgados.
// =============================================================================

import {
  ultimoPreco, proventos12Meses, variacaoPreco, retornoTotal, volatilidadeAnual,
  quedaMaxima, beta,
} from './mercado.js';

/** Divisão que devolve NaN quando falta algum dado ou o divisor é zero. */
function dividir(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : NaN;
}

/**
 * Valor de mercado: quanto custaria comprar todas as ações da empresa pelo
 * preço de hoje. Ordinárias × preço da ordinária + preferenciais × preço da
 * preferencial. Se uma das classes não é negociada, usa o preço da outra.
 */
export function valorDeMercado(quantidades, precos) {
  const on = quantidades.ordinarias || 0;
  const pn = quantidades.preferenciais || 0;
  const precoOn = precos.ordinarias || precos.preferenciais;
  const precoPn = precos.preferenciais || precos.ordinarias;
  if (!precoOn || on + pn === 0) return NaN;
  return on * precoOn + pn * precoPn;
}

/** P/L: valor de mercado ÷ lucro de 12 meses. Negativo quando há prejuízo. */
export function precoLucro(valorMercado, lucro) {
  return dividir(valorMercado, lucro);
}

/** P/VP: valor de mercado ÷ patrimônio líquido. */
export function precoValorPatrimonial(valorMercado, patrimonio) {
  return patrimonio > 0 ? dividir(valorMercado, patrimonio) : NaN;
}

/** ROE: lucro de 12 meses ÷ patrimônio líquido. */
export function retornoSobrePatrimonio(lucro, patrimonio) {
  return patrimonio > 0 ? dividir(lucro, patrimonio) : NaN;
}

/** Margem líquida: lucro ÷ receita. */
export function margemLiquida(lucro, receita) {
  return receita > 0 ? dividir(lucro, receita) : NaN;
}

/** EBITDA: resultado operacional + depreciação e amortização. */
export function ebitda(ebit, depreciacao) {
  return Number.isFinite(ebit) ? ebit + (depreciacao || 0) : NaN;
}

/**
 * Dívida líquida ÷ EBITDA: quantos anos de geração de caixa operacional
 * pagariam a dívida. Negativo = a empresa tem mais caixa que dívida.
 * Sem sentido quando o EBITDA é negativo (devolve NaN).
 */
export function dividaLiquidaSobreEbitda(dividaBruta, caixa, valorEbitda) {
  if (!(valorEbitda > 0)) return NaN;
  return dividir(dividaBruta - caixa, valorEbitda);
}

/**
 * Payout: parte do lucro distribuída como proventos. Aproximação a partir do
 * Dividend Yield e do P/L (DY × P/L = proventos ÷ lucro por ação).
 */
export function payout(dividendYield, valorPrecoLucro) {
  return valorPrecoLucro > 0 ? dividendYield * valorPrecoLucro : NaN;
}

/**
 * Crescimento médio anual (CAGR) entre o primeiro e o último valor da lista.
 * Só faz sentido com valores positivos nas duas pontas.
 */
export function crescimentoMedioAnual(valores) {
  const validos = valores.filter(Number.isFinite);
  if (validos.length < 2 || validos[0] <= 0 || validos[validos.length - 1] <= 0) return NaN;
  return Math.pow(validos[validos.length - 1] / validos[0], 1 / (validos.length - 1)) - 1;
}

// -----------------------------------------------------------------------------
// Endividamento
// -----------------------------------------------------------------------------

/**
 * Z de Altman, versão para empresas não industriais e de países emergentes
 * (Altman, 1995), conhecida como Z''. Combina quatro proporções do balanço:
 *   X1 = capital de giro ÷ ativo total     (folga de curto prazo)
 *   X2 = lucros retidos ÷ ativo total      (lucros acumulados no passado)
 *   X3 = EBIT ÷ ativo total                (rentabilidade operacional)
 *   X4 = patrimônio ÷ passivo total        (quanto é capital próprio)
 *   Z'' = 6,56·X1 + 3,26·X2 + 6,72·X3 + 1,05·X4
 * Abaixo de 1,1 = zona de risco de dificuldade financeira; entre 1,1 e 2,6 =
 * zona cinzenta; acima de 2,6 = zona segura. Não vale para bancos.
 */
export function zAltman(balanco, ebit) {
  const b = balanco || {};
  const ativo = b.ativoTotal;
  if (!(ativo > 0) || !(b.passivoTotal > 0)) return NaN;
  const x1 = dividir(b.ativoCirculante - b.passivoCirculante, ativo);
  const x2 = dividir(b.lucrosRetidos, ativo);
  const x3 = dividir(ebit, ativo);
  const x4 = dividir(b.patrimonioLiquido, b.passivoTotal);
  return 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;
}

export const ZONAS_ALTMAN = { risco: 1.1, segura: 2.6 };

/**
 * EBIT ÷ custo financeiro líquido. Infinity quando o resultado financeiro é
 * positivo; se ele não foi informado, usa as despesas financeiras brutas.
 */
export function coberturaDeJuros(dozeMeses) {
  const d = dozeMeses || {};
  if (Number.isFinite(d.resultadoFinanceiro)) {
    if (d.resultadoFinanceiro >= 0) return Number.isFinite(d.ebit) ? Infinity : NaN;
    return dividir(d.ebit, -d.resultadoFinanceiro);
  }
  return d.despesasFinanceiras > 0 ? dividir(d.ebit, d.despesasFinanceiras) : NaN;
}

/**
 * Indicadores de endividamento a partir do balanço mais recente e dos
 * resultados de 12 meses.
 */
export function indicadoresDivida(balanco, dozeMeses) {
  const b = balanco || {};
  const d = dozeMeses || {};
  const dividaLiquida = Number.isFinite(b.dividaBruta) && Number.isFinite(b.caixa) ? b.dividaBruta - b.caixa : NaN;
  const valorEbitda = ebitda(d.ebit, d.depreciacao);
  return {
    dividaLiquida,
    dividaLiquidaEbitda: dividaLiquidaSobreEbitda(b.dividaBruta, b.caixa, valorEbitda),
    // Dívida líquida ÷ patrimônio: quanto da empresa é financiado por dívida.
    dividaLiquidaPatrimonio: b.patrimonioLiquido > 0 ? dividir(dividaLiquida, b.patrimonioLiquido) : NaN,
    // Cobertura de juros: quantas vezes o resultado operacional paga o custo
    // financeiro LÍQUIDO (despesas financeiras − rendimento do caixa). Usar o
    // líquido evita punir quem tem muito caixa: variação cambial e proteções
    // aparecem dos dois lados. Sem custo líquido (o caixa rende mais do que a
    // dívida custa), a cobertura é "infinita".
    coberturaJuros: coberturaDeJuros(d),
    // Parte da dívida que vence em até um ano.
    parcelaCurtoPrazo: b.dividaBruta > 0 ? dividir(b.dividaCurtoPrazo, b.dividaBruta) : NaN,
    // Caixa ÷ dívida de curto prazo: acima de 1, o caixa paga o que vence no ano.
    caixaSobreCurtoPrazo: b.dividaCurtoPrazo > 0 ? dividir(b.caixa, b.dividaCurtoPrazo) : NaN,
    // Liquidez corrente: bens e direitos de curto prazo ÷ obrigações de curto prazo.
    liquidezCorrente: dividir(b.ativoCirculante, b.passivoCirculante),
    zAltman: zAltman(b, d.ebit),
    patrimonioNegativo: b.patrimonioLiquido < 0,
  };
}

// Limites de dívida líquida / EBITDA. Empresas com receita contratada e
// corrigida pela inflação (transmissão de energia, saneamento, concessões de
// rodovias) costumam operar com mais dívida sem tanto risco.
export const LIMITES_DIVIDA = {
  padrao: { atencao: 2.5, alto: 3.5 },
  receitaPrevisivel: { atencao: 4, alto: 5 },
};

/**
 * Classificação simples do risco ligado à dívida: 'baixo', 'atencao' ou
 * 'alto' (o pior dos critérios), com os motivos em texto. Critérios:
 *   - patrimônio negativo                                → alto
 *   - dívida líquida / EBITDA acima dos LIMITES_DIVIDA   → atenção ou alto
 *   - cobertura de juros: < 1,5 alto (atenção se a dívida for pequena,
 *     abaixo de 1× o EBITDA); < 3 atenção
 *   - Z de Altman: < 1,1 atenção (zona de risco)
 *   - dívida de curto prazo maior que o caixa e > 40% da dívida → atenção
 * `receitaPrevisivel` escolhe os limites mais folgados.
 * Devolve null quando não há dados suficientes.
 */
export function nivelEndividamento(ind, receitaPrevisivel = false) {
  if (!ind) return null;
  const limites = receitaPrevisivel ? LIMITES_DIVIDA.receitaPrevisivel : LIMITES_DIVIDA.padrao;
  const motivos = { alto: [], atencao: [] };
  const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (ind.patrimonioNegativo) motivos.alto.push('patrimônio líquido negativo (deve mais do que tem)');
  const dl = ind.dividaLiquidaEbitda;
  if (dl > limites.alto) motivos.alto.push(`dívida líquida de ${fmt(dl)} vezes o EBITDA`);
  else if (dl > limites.atencao) motivos.atencao.push(`dívida líquida de ${fmt(dl)} vezes o EBITDA`);
  const cobertura = ind.coberturaJuros;
  if (cobertura < 1.5) {
    const texto = `resultado operacional cobre só ${fmt(Math.max(cobertura, 0))} vez(es) o custo financeiro líquido`;
    (dl < 1 ? motivos.atencao : motivos.alto).push(texto);
  } else if (cobertura < 3) {
    motivos.atencao.push(`resultado operacional cobre ${fmt(cobertura)} vezes o custo financeiro líquido`);
  }
  if (ind.zAltman < ZONAS_ALTMAN.risco) motivos.atencao.push(`Z de Altman na zona de risco (${fmt(ind.zAltman)})`);
  if (ind.caixaSobreCurtoPrazo < 1 && ind.parcelaCurtoPrazo > 0.4) {
    motivos.atencao.push('muita dívida vencendo em até um ano e caixa menor que ela');
  }
  const conhecidos = [dl, cobertura, ind.zAltman].filter((v) => !Number.isNaN(v) && v !== undefined).length;
  if (!conhecidos && !ind.patrimonioNegativo) return null;
  const nivel = motivos.alto.length ? 'alto' : motivos.atencao.length ? 'atencao' : 'baixo';
  return { nivel, motivos: [...motivos.alto, ...motivos.atencao] };
}

// Categorias da B3 em que a dívida faz parte do próprio negócio.
const CATEGORIAS_FINANCEIRAS = [
  'Intermediários Financeiros', 'Previdência e Seguros', 'Serviços Financeiros Diversos', 'Holdings Diversificadas',
];

// Categorias (ver scripts/acoes.py) com receita contratada e previsível.
const CATEGORIAS_RECEITA_PREVISIVEL = ['Energia: transmissão', 'Água e Saneamento'];

/**
 * Todos os indicadores de uma ação, no formato usado pelas páginas.
 *   acao     - item de acoes.json ("acoes")
 *   empresa  - item de acoes.json ("empresas"), com preços e fundamentos
 *   datas    - lista de pregões
 *   mercado  - fechamentos do BOVA11 (referência do Ibovespa)
 */
export function indicadoresAcao(acao, empresa, datas, mercado) {
  const dataFinal = datas[datas.length - 1];
  const preco = ultimoPreco(acao.fechamentos);
  const soma12 = proventos12Meses(acao.proventos, dataFinal);
  const negociado = acao.fechamentos.filter((p) => p).length;
  const f = empresa.fundamentos;
  const doze = (f && f.dozeMeses) || {};
  const bal = (f && f.balanco) || {};
  const valorMercado = f ? valorDeMercado(f.acoes, empresa.precos) : NaN;
  const pl = precoLucro(valorMercado, doze.lucro);
  const dy = preco > 0 ? soma12 / preco : NaN;
  const financeira = Boolean(f && f.financeira);
  const valorEbitda = financeira ? NaN : ebitda(doze.ebit, doze.depreciacao);
  // Em bancos, seguradoras, bolsa e holdings financeiras, dívida e captação
  // fazem parte do negócio: os critérios de endividamento não se aplicam.
  // (A B3 põe shoppings no setor "Financeiro"; para eles, a dívida importa.)
  const setorFinanceiro = financeira || CATEGORIAS_FINANCEIRAS.includes(empresa.categoria);
  const divida = setorFinanceiro || !f ? null : indicadoresDivida(bal, doze);
  const receitaPrevisivel = CATEGORIAS_RECEITA_PREVISIVEL.includes(empresa.categoria);
  return {
    preco,
    proventos12m: soma12,
    dividendYield: dy,
    valorMercado,
    precoLucro: pl,
    precoValorPatrimonial: precoValorPatrimonial(valorMercado, bal.patrimonioLiquido),
    roe: retornoSobrePatrimonio(doze.lucro, bal.patrimonioLiquido),
    // Em bancos a "receita" é a de juros, e a margem não é comparável.
    margemLiquida: financeira ? NaN : margemLiquida(doze.lucro, doze.receita),
    ebitda: valorEbitda,
    dividaLiquidaEbitda: financeira ? NaN : dividaLiquidaSobreEbitda(bal.dividaBruta, bal.caixa, valorEbitda),
    payout: payout(dy, pl),
    // Crescimento nos últimos 5 anos completos (6 balanços anuais).
    crescimentoLucro: f ? crescimentoMedioAnual(f.anual.slice(-6).map((a) => a.lucro)) : NaN,
    crescimentoReceita: f ? crescimentoMedioAnual(f.anual.slice(-6).map((a) => a.receita)) : NaN,
    divida,
    nivelDivida: nivelEndividamento(divida, receitaPrevisivel),
    receitaPrevisivel,
    setorFinanceiro,
    variacaoPreco: variacaoPreco(acao.fechamentos),
    retornoTotal: retornoTotal(acao.fechamentos, datas, acao.proventos),
    volatilidade: volatilidadeAnual(acao.fechamentos),
    quedaMaxima: quedaMaxima(acao.fechamentos),
    beta: mercado && mercado.length ? beta(acao.fechamentos, mercado) : NaN,
    financeira,
    historicoCompleto: negociado >= datas.length * 0.9,
  };
}
