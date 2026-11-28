// =============================================================================
// Página "Minha carteira": quatro abas.
//   Resumo       - quanto vale, quanto rendeu, evolução e posições
//   Lançamentos  - registrar compras, vendas, aplicações e outros bens
//   Risco        - concentração, volatilidade, correlação, queda máxima
//   Backup       - exportar, importar ou apagar a carteira
//
// Os dados pessoais ficam só neste navegador (ver estado.js).
// =============================================================================

import { carregarDados } from '../../util/dados.js';
import { cotacoesDoDia } from '../../componentes/hoje.js';
import { lerCarteira, salvarCarteira, carteiraExemplo } from './estado.js';
import { montarVisao } from './visao.js';
import { montarResumo } from './resumo.js';
import { montarLancamentos } from './lancamentos.js';
import { montarRisco } from './risco.js';
import { montarBackup } from './backup.js';

const ABAS = [
  { chave: 'resumo', nome: 'Resumo', montar: montarResumo },
  { chave: 'lancamentos', nome: 'Lançamentos', montar: montarLancamentos },
  { chave: 'risco', nome: 'Risco', montar: montarRisco },
  { chave: 'backup', nome: 'Backup', montar: montarBackup },
];

export async function renderizar(elemento, rota, abaInicial) {
  const [cotacoes, macro, acoes, fiis, intradiario] = await Promise.all(
    ['cotacoes', 'macro', 'acoes', 'fiis', 'intradiario'].map(carregarDados),
  );
  if (!macro) {
    elemento.innerHTML = '<h1>Minha carteira</h1><p class="aviso">Não foi possível carregar os dados necessários. Tente novamente.</p>';
    return;
  }
  // doDia: preços do pregão em andamento (só dos ativos das listas do app).
  const doDia = cotacoes ? cotacoesDoDia(intradiario, cotacoes.dataCotacao) : null;
  const dados = { cotacoes, macro, acoes, fiis, doDia };
  let carteira = lerCarteira();
  let abaAtual = 'resumo';

  elemento.innerHTML = `
    <h1>Minha carteira</h1>
    <p class="introducao">Registre seus investimentos para acompanhar quanto valem, quanto renderam e
      o risco do conjunto. <strong>Os dados ficam só neste aparelho</strong> — nada é enviado para a internet.</p>
    <div class="aviso-exemplo"></div>
    <div class="abas" role="tablist">
      ${ABAS.map((a) => `<button type="button" role="tab" data-aba="${a.chave}">${a.nome}</button>`).join('')}
    </div>
    <div class="conteudo-aba"></div>`;

  const conteudo = elemento.querySelector('.conteudo-aba');
  const avisoExemplo = elemento.querySelector('.aviso-exemplo');

  // Funções que as abas usam para mudar a carteira ou trocar de aba.
  const acoesDaPagina = {
    alterar(novaCarteira) {
      carteira = novaCarteira;
      salvarCarteira(carteira);
      mostrar(abaAtual);
    },
    carregarExemplo() {
      acoesDaPagina.alterar(carteiraExemplo());
    },
    irPara(chave) {
      mostrar(chave);
    },
  };

  function mostrar(chave) {
    abaAtual = chave;
    // O endereço acompanha a aba (#/carteira/risco), sem recarregar a página.
    history.replaceState(null, '', `#/carteira${chave === 'resumo' ? '' : `/${chave}`}`);
    elemento.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', b.dataset.aba === chave));
    avisoExemplo.innerHTML = carteira.exemplo
      ? `<p class="aviso">Esta é uma <strong>carteira de exemplo</strong>, com valores fictícios.
          Para começar a sua, apague-a na aba <a href="#" data-ir="backup">Backup</a>.</p>`
      : '';
    const visao = montarVisao(carteira, dados);
    ABAS.find((a) => a.chave === chave).montar(conteudo, { carteira, visao, dados, ...acoesDaPagina });
  }

  elemento.querySelector('.abas').addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-aba]');
    if (botao) mostrar(botao.dataset.aba);
  });
  elemento.addEventListener('click', (evento) => {
    const link = evento.target.closest('[data-ir]');
    if (link) {
      evento.preventDefault();
      mostrar(link.dataset.ir);
    }
  });

  mostrar(ABAS.some((a) => a.chave === abaInicial) ? abaInicial : 'resumo');
}
