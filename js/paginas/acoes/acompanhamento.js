// =============================================================================
// Ações "acompanhadas": a pessoa marca com uma estrela as ações que quer
// observar de perto depois da triagem. A lista fica só neste navegador
// (localStorage, chave "tfinance:acoes-acompanhadas") e é copiada junto com
// o backup da carteira.
// =============================================================================

import { lerSalvo, salvar } from '../../util/armazenamento.js';

const CHAVE = 'acoes-acompanhadas';

/** Códigos das ações acompanhadas, na ordem em que foram marcadas. */
export function lerAcompanhadas() {
  const lista = lerSalvo(CHAVE, []);
  return Array.isArray(lista) ? lista.filter((c) => typeof c === 'string') : [];
}

export function estaAcompanhada(codigo) {
  return lerAcompanhadas().includes(codigo);
}

/** Marca ou desmarca uma ação; devolve true se ela passou a ser acompanhada. */
export function alternarAcompanhada(codigo) {
  const lista = lerAcompanhadas();
  const marcada = lista.includes(codigo);
  salvar(CHAVE, marcada ? lista.filter((c) => c !== codigo) : [...lista, codigo]);
  return !marcada;
}

/** Botão de estrela. Quem usa a página trata o clique (ver ligarEstrelas). */
export function botaoEstrela(codigo, comTexto = false) {
  const marcada = estaAcompanhada(codigo);
  const rotulo = marcada ? `Deixar de acompanhar ${codigo}` : `Acompanhar ${codigo}`;
  return `<button type="button" class="estrela${comTexto ? ' com-texto' : ''}" data-estrela="${codigo}"
    aria-pressed="${marcada}" aria-label="${rotulo}" title="${rotulo}"><span aria-hidden="true">${marcada ? '★' : '☆'}</span>${comTexto ? `<span class="texto">${marcada ? 'Acompanhando' : 'Acompanhar'}</span>` : ''}</button>`;
}

/**
 * Faz as estrelas dentro de `elemento` funcionarem. `aoMudar(codigo, marcada)`
 * é chamado depois de cada clique (por exemplo, para atualizar uma lista).
 */
export function ligarEstrelas(elemento, aoMudar) {
  elemento.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-estrela]');
    if (!botao) return;
    evento.preventDefault();
    evento.stopPropagation();
    const codigo = botao.dataset.estrela;
    const marcada = alternarAcompanhada(codigo);
    elemento.querySelectorAll(`[data-estrela="${codigo}"]`).forEach((b) => {
      b.outerHTML = botaoEstrela(codigo, b.classList.contains('com-texto'));
    });
    if (aoMudar) aoMudar(codigo, marcada);
  });
}
