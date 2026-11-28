// =============================================================================
// Lista dos FIIs mais negociados, com filtro por tipo, busca e ordenação.
// Tocar em um fundo abre a página dele (detalhe.js).
// =============================================================================

import { botaoExplica } from '../../componentes/explica.js';
import { mediana } from '../../componentes/blocos.js';
import {
  formatarMoeda, formatarMoedaCompacta, formatarPercentual, formatarNumero, formatarDecimal, formatarData, formatarMesCurto,
} from '../../util/formatar.js';
import { escapar } from '../../util/dom.js';
import { celulaPreco, notaDoDia } from '../../componentes/hoje.js';
import { lerSalvo, salvar } from '../../util/armazenamento.js';

const TIPOS = ['Tijolo', 'Papel', 'Fundo de fundos', 'Híbrido'];

/** Vacância física do último informe trimestral (NaN se não houver ou for inconsistente). */
function vacancia(fundo) {
  const v = fundo.vacancia;
  return v && Number.isFinite(v.fisica) ? v.fisica : NaN;
}

// Critérios de ordenação. Valores ausentes (NaN) vão sempre para o fim.
const ORDENACOES = {
  liquidez: { nome: 'Mais negociados', valor: (f) => -f.liquidezMedia },
  // Só aparecem durante o pregão (quando há cotações do dia).
  quedaHoje: { nome: 'Maiores quedas hoje', valor: (f) => (f.hoje ? f.hoje.variacao : NaN), doDia: true },
  altaHoje: { nome: 'Maiores altas hoje', valor: (f) => (f.hoje ? -f.hoje.variacao : NaN), doDia: true },
  dy: { nome: 'Maior Dividend Yield', valor: (f) => -f.indicadores.dividendYield },
  pvp: { nome: 'Menor P/VP', valor: (f) => f.indicadores.pvp },
  retorno: { nome: 'Maior retorno em 12 meses', valor: (f) => -f.indicadores.retornoTotal },
  vacancia: { nome: 'Menor vacância (tijolo)', valor: vacancia },
  codigo: { nome: 'Código (A–Z)', valor: (f) => f.codigo },
};

function comparar(criterio) {
  const valor = ORDENACOES[criterio].valor;
  return (a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (typeof va === 'string') return va.localeCompare(vb);
    if (Number.isNaN(va)) return 1;
    if (Number.isNaN(vb)) return -1;
    return va - vb;
  };
}

/** Tabela-resumo: o "típico" de cada tipo, para servir de referência. */
function tabelaPorTipo(fundos) {
  const linhas = TIPOS.map((tipo) => {
    const grupo = fundos.filter((f) => f.tipo === tipo);
    if (!grupo.length) return '';
    return `
      <tr>
        <td>${tipo}</td>
        <td>${grupo.length}</td>
        <td>${formatarPercentual(mediana(grupo.map((f) => f.indicadores.dividendYield)), 1)}</td>
        <td>${formatarDecimal(mediana(grupo.map((f) => f.indicadores.pvp)))}</td>
        <td>${formatarPercentual(mediana(grupo.map(vacancia)), 1)}</td>
      </tr>`;
  }).join('');
  return `
    <details class="painel">
      <summary>Valores típicos por tipo de fundo</summary>
      <p class="nota">Mediana de cada grupo (metade dos fundos fica acima, metade abaixo).
        Comparar um fundo com outros do mesmo tipo é mais justo do que com todos.</p>
      <div class="tabela-rolavel">
        <table class="tabela">
          <thead><tr><th>Tipo</th><th>Fundos</th><th>DY 12 meses</th><th>P/VP</th><th>Vacância</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </details>`;
}

export function montarLista(elemento, fundos, dados, doDia) {
  const filtros = lerSalvo('fiis-filtros', { tipo: 'todos', ordem: 'liquidez' });
  const ordenacoes = Object.fromEntries(Object.entries(ORDENACOES).filter(([, o]) => !o.doDia || doDia));
  if (!ordenacoes[filtros.ordem]) filtros.ordem = 'liquidez';
  const mesesInforme = fundos.map((f) => f.informe.mes).filter(Boolean).sort();

  elemento.innerHTML = `
    <h1>Fundos imobiliários ${botaoExplica('fii')}</h1>
    <p class="introducao">Os ${fundos.length} FIIs mais negociados na bolsa nos últimos três meses.
      Toque em um fundo para ver o histórico, os rendimentos e a composição da carteira.</p>

    <form class="formulario filtros-fiis" autocomplete="off" onsubmit="return false">
      <fieldset class="objetivos">
        <legend class="rotulo">Tipo de fundo ${botaoExplica('tipo-fii')}</legend>
        ${['todos', ...TIPOS].map((tipo) => `
          <label class="opcao-objetivo">
            <input type="radio" name="tipo" value="${tipo}" ${filtros.tipo === tipo ? 'checked' : ''}>
            <span>${tipo === 'todos' ? 'Todos' : tipo}</span>
          </label>`).join('')}
      </fieldset>
      <div class="grade-campos">
        <label class="campo">
          <span class="rotulo">Buscar</span>
          <input type="search" name="busca" placeholder="Código ou nome (ex.: HGLG)">
        </label>
        <label class="campo">
          <span class="rotulo">Ordenar por</span>
          <select name="ordem">
            ${Object.entries(ordenacoes).map(([chave, o]) => `
              <option value="${chave}" ${filtros.ordem === chave ? 'selected' : ''}>${o.nome}</option>`).join('')}
          </select>
        </label>
      </div>
    </form>

    <div class="tabela-rolavel lista-longa">
      <table class="tabela tabela-ativos">
        <thead><tr>
          <th>Fundo</th>
          <th>Preço</th>
          <th>DY 12m ${botaoExplica('dividend-yield')}</th>
          <th>P/VP ${botaoExplica('preco-valor-patrimonial')}</th>
          <th>Liquidez/dia ${botaoExplica('liquidez-diaria')}</th>
          <th>Retorno 12m ${botaoExplica('retorno-total')}</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <p class="nenhum aviso" hidden>Nenhum fundo encontrado com esses filtros.</p>

    ${notaDoDia(doDia)}

    ${tabelaPorTipo(fundos)}

    <p class="nota">Cotações da B3 até ${formatarData(dados.dataCotacao)}. Rendimentos informados pela B3.
      Patrimônio e carteira dos informes mensais à CVM; vacância ("vac.") ${botaoExplica('vacancia')} dos trimestrais (${formatarMesCurto(mesesInforme[mesesInforme.length - 1])},
      ou o mais recente entregue). Indicadores de 12 meses. Informação para estudo, não é recomendação de investimento.</p>`;

  const formulario = elemento.querySelector('form');
  const corpo = elemento.querySelector('tbody');
  const nenhum = elemento.querySelector('.nenhum');

  function atualizar() {
    const tipo = formulario.tipo.value;
    const ordem = formulario.ordem.value;
    const busca = formulario.busca.value.trim().toUpperCase();
    salvar('fiis-filtros', { tipo, ordem });

    const visiveis = fundos
      .filter((f) => tipo === 'todos' || f.tipo === tipo)
      .filter((f) => !busca || f.codigo.includes(busca) || f.nome.toUpperCase().includes(busca))
      .sort(comparar(ordem));

    corpo.innerHTML = visiveis.map((f) => {
      const i = f.indicadores;
      const retorno = Number.isFinite(i.retornoTotal) && i.historicoCompleto
        ? `<span class="${i.retornoTotal < 0 ? 'negativo' : 'positivo'}">${formatarPercentual(i.retornoTotal, 1)}</span>`
        : '<small>histórico curto</small>';
      return `
        <tr data-codigo="${f.codigo}">
          <td><a href="#/fiis/${f.codigo}"><strong>${f.codigo}</strong></a><br>
            <small>${escapar(f.tipo)}${Number.isFinite(vacancia(f)) ? ` · vac. ${formatarPercentual(vacancia(f), 1)}` : ''}</small></td>
          <td>${celulaPreco(i.preco, f.hoje)}</td>
          <td>${formatarPercentual(i.dividendYield, 1)}</td>
          <td>${formatarDecimal(i.pvp)}</td>
          <td>${formatarMoedaCompacta(f.liquidezMedia)}</td>
          <td>${retorno}</td>
        </tr>`;
    }).join('');
    nenhum.hidden = visiveis.length > 0;
  }

  formulario.addEventListener('input', atualizar);
  // A linha inteira funciona como link (mais fácil de tocar no celular).
  corpo.addEventListener('click', (evento) => {
    const linha = evento.target.closest('tr[data-codigo]');
    if (linha && !evento.target.closest('a')) location.hash = `#/fiis/${linha.dataset.codigo}`;
  });
  atualizar();
}
