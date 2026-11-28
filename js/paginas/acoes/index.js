// =============================================================================
// Seção "Ações".
//
//   #/acoes               -> triagem: todas as ações, com filtros (lista.js)
//   #/acoes/acompanhando  -> comparação das ações marcadas com estrela (lista.js)
//   #/acoes/PETR4         -> página de uma ação (detalhe.js)
//
// Os dados vêm de site/dados/acoes.json (últimos 12 meses e balanços) e
// site/dados/acoes-historico.json (~10 anos, mês a mês) e, durante o pregão,
// site/dados/intradiario.json (preços do dia), gerados pela
// atualização automática (scripts/acoes.py). Os indicadores são calculados
// aqui, no navegador, pelas funções de js/calc/acoes.js e js/calc/historico.js.
// =============================================================================

import { carregarDados } from '../../util/dados.js';
import { indicadoresAcao } from '../../calc/acoes.js';
import { retornoTotal, acumularTaxaAnual } from '../../calc/mercado.js';
import {
  indiceRetornoTotal, indiceCDI, retornoAnualizado, proventosPorAno, sensibilidades,
} from '../../calc/historico.js';
import { cotacoesDoDia, hojeDe } from '../../componentes/hoje.js';
import { montarLista } from './lista.js';
import { montarDetalhe } from './detalhe.js';

/**
 * Indicadores de longo prazo de uma ação a partir do histórico mensal:
 * retorno anualizado em 5 e 10 anos, proventos por ano e sensibilidades.
 */
function longoPrazo(serie, historico) {
  if (!serie) return null;
  const indice = indiceRetornoTotal(serie.fechamentos, serie.proventos);
  const anos = proventosPorAno(historico.meses, serie.fechamentos, serie.proventos);
  const completos = anos.slice(0, -1).slice(-5); // últimos 5 anos civis completos
  return {
    indice,
    retorno5anos: retornoAnualizado(indice, 60),
    retorno10anos: retornoAnualizado(indice, 120),
    proventosPorAno: anos,
    dividendYieldMedio5anos: completos.length === 5
      ? completos.reduce((s, a) => s + a.dividendYield, 0) / 5 : NaN,
    sensibilidade: sensibilidades(serie.fechamentos, serie.proventos, historico.fatores),
  };
}

export async function renderizar(elemento, rota, codigo) {
  const [dados, macro, historico, intradiario] = await Promise.all(
    ['acoes', 'macro', 'acoes-historico', 'intradiario'].map(carregarDados),
  );
  if (!dados || !dados.acoes || !dados.acoes.length) {
    elemento.innerHTML = `
      <h1>Ações</h1>
      <p class="aviso">Os dados das ações não estão disponíveis no momento.</p>`;
    return;
  }

  const { datas } = dados;
  const doDia = cotacoesDoDia(intradiario, dados.dataCotacao);
  const mercado = dados.referencia.fechamentos;
  // Cada ação ganha os dados da empresa e os indicadores já calculados.
  const acoes = dados.acoes.map((acao) => {
    const empresa = dados.empresas[acao.empresa];
    return {
      ...acao,
      empresaDados: empresa,
      indicadores: indicadoresAcao(acao, empresa, datas, mercado),
      hoje: hojeDe(doDia, acao.codigo), // cotação durante o pregão (ou null)
      longoPrazo: historico ? longoPrazo(historico.acoes[acao.codigo], historico) : null,
    };
  });

  // Referências para comparar o retorno de cada ação no mesmo período.
  const referencias = {
    ibovespa: mercado.length ? retornoTotal(mercado, datas, []) : NaN,
    hoje: doDia,
    cdi: macro ? acumularTaxaAnual(macro.cdi.historico, datas[0], datas[datas.length - 1]) : NaN,
  };
  if (historico) {
    const n = historico.meses.length;
    const ibov = historico.fatores.ibovespa;
    referencias.longoPrazo = {
      ibovespa5anos: retornoAnualizado(ibov, 60),
      ibovespa10anos: retornoAnualizado(ibov, 120),
      cdi5anos: retornoAnualizado(indiceCDI(historico.fatores.cdi, n - 61), 60),
      cdi10anos: retornoAnualizado(indiceCDI(historico.fatores.cdi, Math.max(0, n - 121)), 120),
    };
  }

  if (codigo && codigo !== 'acompanhando') {
    const acao = acoes.find((a) => a.codigo === codigo.toUpperCase());
    if (acao) {
      montarDetalhe(elemento, acao, acoes, dados, macro, referencias, historico);
      return;
    }
  }
  montarLista(elemento, acoes, dados, referencias, codigo === 'acompanhando' ? 'acompanhando' : 'triagem');
}
