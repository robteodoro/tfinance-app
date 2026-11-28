// =============================================================================
// Ponto de entrada do aplicativo.
//
// O Tfinance é uma "página única": o conteúdo muda conforme o endereço após
// o "#" (ex.: .../#/renda-fixa), sem recarregar a página. Um segundo trecho
// indica um item da seção (ex.: .../#/fiis/MXRF11). Este arquivo
// associa cada endereço à sua página e cuida da instalação como aplicativo.
// =============================================================================

import { instalarExplicacoes } from './componentes/explica.js';

// Cada rota carrega o módulo da página só quando é visitada.
const ROTAS = {
  '': () => import('./paginas/inicio.js'),
  'renda-fixa': () => import('./paginas/rendafixa/index.js'),
  fiis: () => import('./paginas/fiis/index.js'),
  acoes: () => import('./paginas/acoes/index.js'),
  carteira: () => import('./paginas/carteira/index.js'),
  glossario: () => import('./paginas/glossario.js'),
};

const principal = document.querySelector('main');

async function navegar() {
  // "#/fiis/MXRF11" -> rota "fiis", item "MXRF11"
  const [rota, item] = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
  const carregar = ROTAS[rota] || ROTAS[''];

  document.querySelectorAll('nav a').forEach((link) => {
    link.toggleAttribute('aria-current', link.getAttribute('href') === `#/${rota}`);
  });

  // Cada página é montada num contêiner novo: assim os "ouvintes" de clique
  // de uma visita anterior somem junto com o contêiner antigo e não se
  // acumulam (um clique contado duas vezes desfaria a própria ação).
  const conteudo = document.createElement('div');
  conteudo.innerHTML = '<p class="carregando">Carregando…</p>';
  principal.replaceChildren(conteudo);
  try {
    const pagina = await carregar();
    await pagina.renderizar(conteudo, rota, item);
  } catch (erro) {
    console.error(erro);
    conteudo.innerHTML = '<p class="aviso">Ocorreu um erro ao abrir esta página. Tente recarregar.</p>';
  }
  window.scrollTo(0, 0);
}

instalarExplicacoes();
window.addEventListener('hashchange', navegar);
navegar();

// Registro do "service worker": permite instalar o app e usá-lo sem internet.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((erro) => console.warn('Modo offline indisponível:', erro));
}
