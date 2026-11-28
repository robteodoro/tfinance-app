// =============================================================================
// Botões "?" que abrem a explicação de um conceito do glossário.
//
// Uso em qualquer página:  `${botaoExplica('cdi')}`  dentro do HTML.
// Um único "ouvinte" de cliques (instalado em app.js) abre a janela.
// =============================================================================

import { GLOSSARIO } from '../conteudo/glossario.js';

/** HTML do botão "?" para o verbete `chave`. */
export function botaoExplica(chave) {
  const verbete = GLOSSARIO[chave];
  const rotulo = verbete ? `O que é ${verbete.titulo}?` : 'Explicação';
  return `<button type="button" class="explica" data-explica="${chave}"
    aria-label="${rotulo}" title="${rotulo}">?</button>`;
}

/** Cria a janela de explicação e passa a responder aos cliques nos botões "?". */
export function instalarExplicacoes() {
  const janela = document.createElement('dialog');
  janela.className = 'janela-explica';
  document.body.appendChild(janela);

  document.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-explica]');
    if (botao) {
      abrirExplicacao(janela, botao.dataset.explica);
    } else if (evento.target === janela || evento.target.closest('[data-fechar]')) {
      janela.close(); // clique fora do conteúdo ou no botão "Fechar"
    }
  });
}

function abrirExplicacao(janela, chave) {
  const verbete = GLOSSARIO[chave];
  if (!verbete) return;
  janela.innerHTML = `
    <div class="janela-conteudo">
      <h2>${verbete.titulo}</h2>
      <p class="resumo">${verbete.resumo}</p>
      ${verbete.texto}
      <div class="janela-acoes">
        <a href="#/glossario">Ver glossário completo</a>
        <button type="button" data-fechar>Fechar</button>
      </div>
    </div>`;
  janela.querySelector('a').addEventListener('click', () => janela.close());
  janela.showModal();
}
