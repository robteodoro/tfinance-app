// =============================================================================
// Página do glossário: todos os verbetes, agrupados e pesquisáveis.
// =============================================================================

import { GLOSSARIO, CATEGORIAS } from '../conteudo/glossario.js';

function semAcentos(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function renderizar(elemento) {
  const verbetes = Object.entries(GLOSSARIO);
  elemento.innerHTML = `
    <h1>Glossário</h1>
    <p class="introducao">Explicações simples dos conceitos usados no aplicativo.</p>
    <input type="search" class="busca" placeholder="Procurar termo..." aria-label="Procurar termo">
    ${CATEGORIAS.map((categoria) => `
      <section class="categoria-glossario">
        <h2>${categoria}</h2>
        ${verbetes.filter(([, v]) => v.categoria === categoria).map(([chave, v]) => `
          <details class="verbete" id="verbete-${chave}" data-busca="${semAcentos(v.titulo + ' ' + v.resumo)}">
            <summary><strong>${v.titulo}</strong> <span>${v.resumo}</span></summary>
            <div class="texto-verbete">${v.texto}</div>
          </details>`).join('')}
      </section>`).join('')}`;

  elemento.querySelector('.busca').addEventListener('input', (evento) => {
    const termo = semAcentos(evento.target.value.trim());
    elemento.querySelectorAll('.verbete').forEach((v) => { v.hidden = termo && !v.dataset.busca.includes(termo); });
    elemento.querySelectorAll('.categoria-glossario').forEach((s) => {
      s.hidden = ![...s.querySelectorAll('.verbete')].some((v) => !v.hidden);
    });
  });
}
