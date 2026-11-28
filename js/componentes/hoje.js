// =============================================================================
// Cotações durante o pregão (dados/intradiario.json, atualizado a cada meia
// hora nos dias úteis, com ~15 minutos de atraso da B3).
//
// As cotações do dia só são usadas quando são de um pregão MAIS NOVO que o
// último fechamento já processado (o arquivo noturno da B3). Assim, à noite,
// em fins de semana e em feriados, o app mostra o fechamento normalmente.
// =============================================================================

import { botaoExplica } from './explica.js';
import { formatarMoeda, formatarPercentual, formatarData } from '../util/formatar.js';

/**
 * Cotações do dia válidas, ou null. `ultimoFechamento` = data ("AAAA-MM-DD")
 * do último fechamento que o app já tem.
 */
export function cotacoesDoDia(intradiario, ultimoFechamento) {
  if (!intradiario || !intradiario.ativos || !(intradiario.data > ultimoFechamento)) return null;
  return intradiario;
}

/** Cotação de hoje de um ativo, ou null. */
export function hojeDe(cotacoes, codigo) {
  return cotacoes ? cotacoes.ativos[codigo] || null : null;
}

/** "+1,6%" colorido, sem quebrar a linha. */
export function variacaoDoDia(variacao) {
  if (!Number.isFinite(variacao)) return '';
  const classe = variacao < 0 ? 'negativo' : variacao > 0 ? 'positivo' : '';
  const seta = variacao < 0 ? '▼' : variacao > 0 ? '▲' : '';
  return `<span class="${classe} sem-quebra">${seta} ${variacao > 0 ? '+' : ''}${formatarPercentual(variacao, 1)}</span>`;
}

/** Célula de preço das listas: preço de agora e a variação do dia abaixo. */
export function celulaPreco(precoFechamento, hoje) {
  if (!hoje) return formatarMoeda(precoFechamento);
  return `${formatarMoeda(hoje.preco)}<br><small>${variacaoDoDia(hoje.variacao)}</small>`;
}

/** Horário "12:19" da última atualização. */
export function horario(cotacoes) {
  return cotacoes.horario.slice(11, 16);
}

/** Aviso exibido abaixo das listas quando há cotações do dia. */
export function notaDoDia(cotacoes) {
  if (!cotacoes) return '';
  return `<p class="nota">Preços do pregão de hoje até ${horario(cotacoes)}, com cerca de 15 minutos de
    atraso; atualizados a cada meia hora ${botaoExplica('cotacao-intradiaria')}. Os demais indicadores usam o
    último fechamento.</p>`;
}

/** Cartão "Preço" das páginas de detalhe, com abertura, mínima e máxima. */
export function detalheDoDia(hoje, cotacoes, precoFechamento, dataFechamento) {
  if (!hoje) {
    return { valor: formatarMoeda(precoFechamento), detalhe: `fechamento de ${formatarData(dataFechamento)}` };
  }
  return {
    valor: `${formatarMoeda(hoje.preco)} <small>${variacaoDoDia(hoje.variacao)}</small>`,
    detalhe: `hoje às ${horario(cotacoes)} · mín. ${formatarMoeda(hoje.minima)} · máx. ${formatarMoeda(hoje.maxima)}`,
  };
}
