// =============================================================================
// Seção "Fundos imobiliários".
//
//   #/fiis          -> lista dos FIIs mais negociados (lista.js)
//   #/fiis/MXRF11   -> página de um fundo (detalhe.js)
//
// Os dados vêm de site/dados/fiis.json, gerado pela atualização automática
// (scripts/atualizar_dados.py). Os indicadores são calculados aqui, no
// navegador, pelas funções de js/calc/fiis.js.
// =============================================================================

import { carregarDados } from '../../util/dados.js';
import { indicadoresFundo } from '../../calc/fiis.js';
import { cotacoesDoDia, hojeDe } from '../../componentes/hoje.js';
import { montarLista } from './lista.js';
import { montarDetalhe } from './detalhe.js';

export async function renderizar(elemento, rota, codigo) {
  const [dados, macro, intradiario] = await Promise.all(['fiis', 'macro', 'intradiario'].map(carregarDados));
  if (!dados || !dados.fundos || !dados.fundos.length) {
    elemento.innerHTML = `
      <h1>Fundos imobiliários</h1>
      <p class="aviso">Os dados dos fundos imobiliários não estão disponíveis no momento.</p>`;
    return;
  }

  // Cada fundo ganha um campo "indicadores" já calculado.
  // Durante o pregão, cada fundo ganha também a cotação do dia ("hoje").
  const doDia = cotacoesDoDia(intradiario, dados.dataCotacao);
  const fundos = dados.fundos.map((fundo) => ({
    ...fundo, indicadores: indicadoresFundo(fundo, dados.datas), hoje: hojeDe(doDia, fundo.codigo),
  }));

  if (codigo) {
    const fundo = fundos.find((f) => f.codigo === codigo.toUpperCase());
    if (fundo) {
      montarDetalhe(elemento, fundo, dados, macro, doDia);
      return;
    }
  }
  montarLista(elemento, fundos, dados, doDia);
}
