// =============================================================================
// Peças de formulário compartilhadas pelas abas do simulador de renda fixa.
// =============================================================================

import { PRODUTOS, INDEXADORES } from '../../config/produtos.js';
import { botaoExplica } from '../../componentes/explica.js';
import { formatarNumero, lerNumero } from '../../util/formatar.js';
import { DIAS_POR_MES } from '../../calc/rendafixa.js';

/** Campo numérico com rótulo. Aceita vírgula ou ponto como separador decimal. */
export function campoNumero({ nome, rotulo, valor = '', explica = '', sufixo = '', classe = '' }) {
  return `
    <label class="campo ${classe}" data-campo="${nome}">
      <span class="rotulo">${rotulo} ${explica ? botaoExplica(explica) : ''}</span>
      <span class="entrada">
        <input type="text" inputmode="decimal" name="${nome}" value="${valor}" autocomplete="off">
        ${sufixo ? `<span class="sufixo">${sufixo}</span>` : ''}
      </span>
    </label>`;
}

/** Campo de prazo: número + unidade (dias, meses ou anos). */
export function campoPrazo({ nome = 'prazo', valor = 2, unidade = 'anos' }) {
  const opcao = (u) => `<option value="${u}" ${u === unidade ? 'selected' : ''}>${u}</option>`;
  return `
    <label class="campo" data-campo="${nome}">
      <span class="rotulo">Prazo</span>
      <span class="entrada">
        <input type="text" inputmode="decimal" name="${nome}" value="${valor}" autocomplete="off">
        <select name="${nome}-unidade" aria-label="Unidade do prazo">
          ${['dias', 'meses', 'anos'].map(opcao).join('')}
        </select>
      </span>
    </label>`;
}

/** Converte o prazo digitado em dias corridos. */
export function prazoEmDias(valor, unidade) {
  if (unidade === 'anos') return valor * 365;
  if (unidade === 'meses') return valor * DIAS_POR_MES;
  return valor;
}

export function opcoesProdutos(selecionado) {
  return Object.entries(PRODUTOS).map(([chave, p]) =>
    `<option value="${chave}" ${chave === selecionado ? 'selected' : ''}>${p.nome}</option>`).join('');
}

export function opcoesIndexadores(produto, selecionado) {
  return PRODUTOS[produto].indexadores.map((chave) =>
    `<option value="${chave}" ${chave === selecionado ? 'selected' : ''}>${INDEXADORES[chave].nome}</option>`).join('');
}

/** Rótulo do campo de taxa conforme o indexador. */
export function rotuloTaxa(indexador) {
  return INDEXADORES[indexador].rotuloTaxa;
}

/** Explicação (verbete do glossário) apropriada para cada indexador. */
export function explicacaoIndexador(indexador) {
  return { cdi: 'posfixado', selic: 'posfixado', pre: 'prefixado', ipca: 'hibrido', poupanca: 'poupanca' }[indexador];
}

/** Texto curto que descreve a taxa: "110% do CDI", "IPCA + 6,50%"... */
export function descreverTaxa(indexador, taxa) {
  const pct = formatarNumero(taxa * 100, 2);
  switch (indexador) {
    case 'cdi': return `${pct}% do CDI`;
    case 'pre': return `${pct}% a.a.`;
    case 'ipca': return `IPCA + ${pct}%`;
    case 'selic': return `Selic + ${pct}%`;
    default: return 'Regra da poupança';
  }
}

/** Lê o valor numérico de um campo pelo nome. */
export function lerCampo(raiz, nome) {
  const campo = raiz.querySelector(`[name="${nome}"]`);
  return campo ? lerNumero(campo.value) : NaN;
}

/**
 * Mantém coerentes os campos produto → indexador → taxa:
 * ao trocar o produto, atualiza os indexadores disponíveis; ao trocar o
 * indexador, ajusta o rótulo da taxa e sugere um valor de exemplo.
 */
export function ligarProdutoIndexador(raiz, aoMudar) {
  const produto = raiz.querySelector('[name="produto"]');
  const indexador = raiz.querySelector('[name="indexador"]');
  const taxa = raiz.querySelector('[name="taxa"]');
  const campoTaxa = raiz.querySelector('[data-campo="taxa"]');

  function ajustarTaxa(sugerirValor) {
    const info = INDEXADORES[indexador.value];
    // "visibility" (em vez de esconder) mantém o alinhamento dos demais campos.
    campoTaxa.style.visibility = info.rotuloTaxa === null ? 'hidden' : '';
    if (info.rotuloTaxa) {
      campoTaxa.querySelector('.rotulo').innerHTML =
        `${info.rotuloTaxa} ${botaoExplica(explicacaoIndexador(indexador.value))}`;
      if (sugerirValor) taxa.value = formatarNumero(info.exemplo, 2);
    }
  }

  produto.addEventListener('change', () => {
    const anterior = indexador.value;
    indexador.innerHTML = opcoesIndexadores(produto.value, anterior);
    ajustarTaxa(indexador.value !== anterior);
    aoMudar();
  });
  indexador.addEventListener('change', () => {
    ajustarTaxa(true);
    aoMudar();
  });
  ajustarTaxa(false);
}
