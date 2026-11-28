// =============================================================================
// Junta a carteira (o que a pessoa registrou) com os dados do aplicativo
// (preços, proventos, taxas do Banco Central) e produz tudo o que as abas
// exibem: posições com valor atual, totais, evolução e dados para o risco.
//
// As contas em si ficam em js/calc/carteira.js; aqui só se organiza.
// =============================================================================

import {
  calcularPosicoes, proventosRecebidos, valorRendaFixa, fluxoDasOperacoes, fluxoDaRendaFixa,
  valorSeFosseCDI,
} from '../../calc/carteira.js';
import { diasAntes } from '../../calc/mercado.js';

export const CLASSES = {
  acao: { nome: 'Ações', cor: 'var(--cor-1)' },
  fii: { nome: 'Fundos imobiliários', cor: 'var(--cor-3)' },
  etf: { nome: 'ETFs (fundos de índice)', cor: 'var(--cor-2)' },
  rendaFixa: { nome: 'Renda fixa', cor: 'var(--cor-5)' },
  outro: { nome: 'Outros bens', cor: 'var(--cor-neutra)' },
};

/** Históricos de taxas do Banco Central no formato usado pelos cálculos. */
export function historicosDeTaxas(macro) {
  return {
    cdi: macro.cdi.historico,
    ipcaMensal: macro.ipcaMensal.historico,
    ipca12m: macro.ipca12m.historico,
    poupancaMensal: macro.poupancaMensal.historico,
  };
}

/** Proventos conhecidos de um ativo (só dos que estão nas listas do app). */
function proventosDoAtivo(codigo, dados) {
  const acao = dados.acoes && dados.acoes.acoes.find((a) => a.codigo === codigo);
  if (acao) return acao.proventos;
  const fii = dados.fiis && dados.fiis.fundos.find((f) => f.codigo === codigo);
  return fii ? fii.rendimentos : null;
}

/** Grupo (para medir concentração): setor das ações, tipo dos FIIs... */
function grupoDoAtivo(codigo, classe, dados) {
  if (classe === 'acao' && dados.acoes) {
    const acao = dados.acoes.acoes.find((a) => a.codigo === codigo);
    if (acao) return dados.acoes.empresas[acao.empresa].setor;
    return 'Ações (setor não identificado)';
  }
  if (classe === 'fii' && dados.fiis) {
    const fii = dados.fiis.fundos.find((f) => f.codigo === codigo);
    return fii ? `FII ${fii.tipo.toLowerCase()}` : 'FII (tipo não identificado)';
  }
  return CLASSES[classe].nome;
}

/**
 * Visão completa da carteira na data dos preços mais recentes.
 *   dados = { cotacoes, macro, acoes, fiis }
 */
export function montarVisao(carteira, dados) {
  const hoje = dados.cotacoes ? dados.cotacoes.dataCotacao : new Date().toISOString().slice(0, 10);
  const historicos = historicosDeTaxas(dados.macro);
  const ativosCotados = dados.cotacoes ? dados.cotacoes.ativos : {};
  const itens = [];
  const proventos = [];
  let lucroRealizado = 0;
  // Variação de hoje (durante o pregão), dos ativos que têm cotação do dia.
  const doDia = { variacao: 0, ativos: 0 };

  // ----------------------------------------------- Ações, FIIs e ETFs
  const posicoes = calcularPosicoes(carteira.operacoes);
  for (const p of Object.values(posicoes)) {
    lucroRealizado += p.lucroRealizado;
    const lista = proventosDoAtivo(p.codigo, dados);
    if (lista) proventos.push(...proventosRecebidos(carteira.operacoes, p.codigo, lista));
    if (p.quantidade === 0) continue;
    const cotado = ativosCotados[p.codigo];
    const agora = dados.doDia && dados.doDia.ativos[p.codigo];
    // Durante o pregão vale o preço do momento; senão, o último fechamento.
    const preco = agora ? agora.preco : cotado ? cotado.preco : NaN;
    if (agora && Number.isFinite(agora.variacao)) {
      doDia.variacao += p.quantidade * (agora.preco - agora.preco / (1 + agora.variacao));
      doDia.ativos += 1;
    }
    const classe = cotado ? cotado.tipo : 'acao';
    const valor = cotado ? p.quantidade * preco : p.custo; // sem cotação: vale o custo
    itens.push({
      id: p.codigo,
      nome: p.codigo,
      descricao: cotado ? cotado.nome : 'sem cotação no Tfinance (valor pelo custo)',
      classe,
      grupo: grupoDoAtivo(p.codigo, classe, dados),
      quantidade: p.quantidade,
      precoMedio: p.precoMedio,
      preco,
      custo: p.custo,
      valor,
      semCotacao: !cotado,
      link: proventosDoAtivo(p.codigo, dados) ? `#/${classe === 'fii' ? 'fiis' : 'acoes'}/${p.codigo}` : null,
    });
  }

  // ----------------------------------------------------------- Renda fixa
  for (const a of carteira.rendaFixa) {
    const v = valorRendaFixa(a, hoje, historicos);
    if (a.resgate && a.resgate.data <= hoje) {
      // Resgatada: o resultado já se realizou.
      lucroRealizado += a.resgate.valor - a.valor;
      continue;
    }
    itens.push({
      id: a.id,
      nome: a.nome,
      descricao: 'estimativa líquida de IR e taxas',
      classe: 'rendaFixa',
      grupo: 'Renda fixa',
      custo: a.valor,
      valor: v.liquido,
      bruto: v.bruto,
      impostos: v.ir + v.iof + v.custodia,
      aplicacao: a,
    });
  }

  // ---------------------------------------------------------------- Outros
  for (const o of carteira.outros) {
    itens.push({
      id: o.id, nome: o.nome, descricao: `valor informado em ${o.data.split('-').reverse().join('/')}`,
      classe: 'outro', grupo: 'Outros bens', custo: o.valor, valor: o.valor,
    });
  }

  const total = itens.reduce((s, i) => s + i.valor, 0);
  const custo = itens.reduce((s, i) => s + i.custo, 0);
  for (const i of itens) i.peso = total > 0 ? i.valor / total : 0;
  itens.sort((a, b) => b.valor - a.valor);

  const porClasse = {};
  for (const i of itens) porClasse[i.classe] = (porClasse[i.classe] || 0) + i.valor;

  // Fluxo de dinheiro (entradas e saídas) para comparar com o CDI. Os
  // "outros bens" ficam de fora: seu valor é informado à mão e não varia.
  const fluxo = [
    ...fluxoDasOperacoes(carteira.operacoes),
    ...fluxoDaRendaFixa(carteira.rendaFixa),
  ].sort((a, b) => (a.data < b.data ? -1 : 1));
  const totalOutros = porClasse.outro || 0;
  const aplicadoLiquido = fluxo.reduce((s, f) => s + f.valor, 0);
  const seFosseCDI = valorSeFosseCDI(fluxo, hoje, historicos);

  const umAnoAntes = diasAntes(hoje, 365);
  const proventos12m = proventos.filter((p) => p.dataCom > umAnoAntes);

  return {
    hoje,
    doDia: dados.doDia && doDia.ativos ? { ...doDia, horario: dados.doDia.horario.slice(11, 16) } : null,
    itens,
    total,
    custo,
    ganhoNaoRealizado: total - custo,
    lucroRealizado,
    porClasse,
    fluxo,
    aplicadoLiquido,
    seFosseCDI,
    proventos: proventos.sort((a, b) => (a.dataCom < b.dataCom ? 1 : -1)),
    proventos12m: proventos12m.reduce((s, p) => s + p.total, 0),
    totalInvestimentos: total - totalOutros,
    // "Ganho total" dos investimentos: quanto valem hoje acima do dinheiro
    // líquido que entrou, somando os proventos recebidos.
    ganhoTotal: total - totalOutros - aplicadoLiquido + proventos.reduce((s, p) => s + p.total, 0),
    historicos,
  };
}

/**
 * Evolução semanal no último ano (sem os "outros bens"): valor dos investimentos, dinheiro aplicado
 * (entradas − saídas acumuladas) e quanto valeria o mesmo fluxo no CDI.
 */
export function evolucaoSemanal(carteira, visao, dados) {
  const { semanas, ativos } = dados.cotacoes;
  return semanas.map((semana, k) => {
    let valor = 0;
    const posicoes = calcularPosicoes(carteira.operacoes, semana);
    for (const p of Object.values(posicoes)) {
      if (!p.quantidade) continue;
      const serie = ativos[p.codigo] && ativos[p.codigo].semanal;
      let preco = serie ? serie[k] : null;
      for (let j = k; serie && !preco && j >= 0; j--) preco = serie[j];
      valor += preco ? p.quantidade * preco : p.custo;
    }
    for (const a of carteira.rendaFixa) valor += valorRendaFixa(a, semana, visao.historicos).liquido;
    const aplicado = visao.fluxo.filter((f) => f.data <= semana).reduce((s, f) => s + f.valor, 0);
    return { semana, valor, aplicado, cdi: valorSeFosseCDI(visao.fluxo, semana, visao.historicos) };
  });
}
