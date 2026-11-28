// =============================================================================
// Pequenos blocos de interface usados nas páginas de FIIs e de ações:
// cartões de indicador, linhas de resumo, percentuais coloridos e o gráfico
// de histórico de preços com datas no eixo horizontal.
// =============================================================================

import { botaoExplica } from './explica.js';
import { desenharGrafico } from './grafico.js';
import { formatarData, formatarMesCurto, formatarNumero, formatarPercentual } from '../util/formatar.js';

/** Cartão com título (e botão "?"), valor em destaque e detalhe. */
export function cartao(titulo, valor, detalhe, explica) {
  return `
    <div class="cartao-indicador">
      <span class="titulo">${titulo} ${explica ? botaoExplica(explica) : ''}</span>
      <strong>${valor}</strong>
      <small>${detalhe || ''}</small>
    </div>`;
}

/** Linha "rótulo .......... valor" dentro de um cartão de resumo. */
export function linhaResumo(rotulo, valor, explica) {
  return `
    <div class="linha-resumo">
      <span>${rotulo} ${explica ? botaoExplica(explica) : ''}</span>
      <strong>${valor}</strong>
    </div>`;
}

/** Percentual com sinal e cor: verde se positivo, vermelho se negativo. */
export function percentualComSinal(valor, casas = 1) {
  if (!Number.isFinite(valor)) return '—';
  const texto = formatarPercentual(valor, casas);
  return `<span class="${valor < 0 ? 'negativo' : 'positivo'}">${valor > 0 ? '+' : ''}${texto}</span>`;
}

// O gráfico usa números no eixo horizontal: cada data vira o número do dia.
export const diaNumero = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;
const diaParaIso = (numero) => new Date(Math.round(numero) * 86400000).toISOString().slice(0, 10);

/**
 * Gráfico de linhas ao longo dos pregões de `datas`.
 *   series: [{ nome, cor, valores: [um valor (ou null) por data], tracejado }]
 * O eixo horizontal marca o início de cada mês ("nov/25").
 */
export function graficoPorDatas(espaco, datas, series, { formatarY, formatarEixoY } = {}) {
  const inicioDeMes = datas
    .filter((d, k) => k === 0 || d.slice(0, 7) !== datas[k - 1].slice(0, 7))
    .map(diaNumero);
  desenharGrafico(espaco, {
    series: series.map((s) => ({
      nome: s.nome,
      cor: s.cor,
      tracejado: s.tracejado,
      pontos: datas
        .map((d, i) => ({ x: diaNumero(d), y: s.valores[i] }))
        .filter((p) => Number.isFinite(p.y)),
    })),
    formatarX: (x) => formatarData(diaParaIso(x)),
    marcacoesX: inicioDeMes,
    formatarEixoX: (x) => formatarMesCurto(diaParaIso(x)),
    formatarY: formatarY || ((v) => formatarNumero(v, 2)),
    formatarEixoY: formatarEixoY || ((v) => formatarNumero(v, 2)),
  });
}

/**
 * Gráfico de linhas mês a mês, para séries longas (vários anos).
 *   meses:  ['2016-01', '2016-02', ...]
 *   series: como em graficoPorDatas (um valor por mês)
 * O eixo horizontal marca o início de cada ano. Com escalaLog, o eixo
 * vertical é logarítmico (ver grafico.js).
 */
export function graficoMensal(espaco, meses, series, { formatarY, formatarEixoY, escalaLog } = {}) {
  const dia = (mes) => diaNumero(`${mes}-15`);
  desenharGrafico(espaco, {
    escalaLog,
    series: series.map((s) => ({
      nome: s.nome,
      cor: s.cor,
      tracejado: s.tracejado,
      pontos: meses.map((m, i) => ({ x: dia(m), y: s.valores[i] })).filter((p) => Number.isFinite(p.y)),
    })),
    formatarX: (x) => formatarMesCurto(diaParaIso(x)),
    marcacoesX: meses.filter((m) => m.endsWith('-01')).map((m) => diaNumero(`${m}-01`)),
    formatarEixoX: (x) => diaParaIso(x).slice(0, 4),
    formatarY: formatarY || ((v) => formatarNumero(v, 2)),
    formatarEixoY: formatarEixoY || ((v) => formatarNumero(v, 2)),
  });
}

/** Mediana de uma lista de números (ignora valores ausentes). */
export function mediana(valores) {
  const v = valores.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}
