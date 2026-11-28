// =============================================================================
// Página "Renda fixa": painel de cenário econômico + quatro abas.
// =============================================================================

import { cenarioAtual, cenarioFocus } from '../../calc/cenario.js';
import { botaoExplica } from '../../componentes/explica.js';
import { carregarDados } from '../../util/dados.js';
import { lerSalvo, salvar } from '../../util/armazenamento.js';
import { formatarData, formatarNumero, lerNumero } from '../../util/formatar.js';
import { aoParar } from '../../util/dom.js';
import { campoNumero } from './comum.js';
import { montarSimular } from './simular.js';
import { montarComparar } from './comparar.js';
import { montarEquivalencia } from './equivalencia.js';
import { montarTesouro } from './tesouro.js';

const ABAS = [
  { chave: 'simular', nome: 'Simular' },
  { chave: 'comparar', nome: 'Comparar' },
  { chave: 'equivalencia', nome: 'Isento × tributado' },
  { chave: 'tesouro', nome: 'Tesouro Direto hoje' },
];

// Campos do cenário: nome interno, rótulo, verbete do glossário.
const CAMPOS_CENARIO = [
  ['selic', 'Selic (meta)', 'selic', '% a.a.'],
  ['cdi', 'CDI', 'cdi', '% a.a.'],
  ['ipca', 'Inflação (IPCA)', 'ipca', '% a.a.'],
  ['trMensal', 'TR', 'tr', '% a.m.'],
];

export async function renderizar(elemento) {
  const [macro, tesouro] = await Promise.all([carregarDados('macro'), carregarDados('tesouro')]);

  const contexto = {
    macro,
    tesouro,
    cenario: lerSalvo('cenario', null) || cenarioAtual(macro),
  };

  elemento.innerHTML = `
    <h1>Renda fixa</h1>
    <p class="introducao">Simule aplicações já descontando Imposto de Renda, IOF e taxa de custódia,
      compare produtos e veja as taxas do Tesouro Direto.</p>

    <details class="painel" open>
      <summary>Cenário econômico usado nas simulações</summary>
      <form class="formulario cenario" autocomplete="off" onsubmit="return false">
        <div class="grade-campos">
          ${CAMPOS_CENARIO.map(([nome, rotulo, explica, sufixo]) =>
            campoNumero({ nome, rotulo, explica, sufixo })).join('')}
        </div>
        <div class="botoes">
          <button type="button" class="botao-secundario" data-cenario="atual">Usar taxas atuais</button>
          <button type="button" class="botao-secundario" data-cenario="focus">Usar projeções do Focus para o prazo</button>
          ${botaoExplica('focus')}
        </div>
        <p class="nota fonte-cenario"></p>
      </form>
    </details>

    <div class="abas" role="tablist">
      ${ABAS.map((a, i) => `<button type="button" role="tab" data-aba="${a.chave}" aria-selected="${i === 0}">${a.nome}</button>`).join('')}
    </div>
    ${ABAS.map((a, i) => `<div class="conteudo-aba" data-conteudo="${a.chave}" ${i === 0 ? '' : 'hidden'}></div>`).join('')}`;

  // ----------------------------------------------------------------- Cenário
  const formCenario = elemento.querySelector('form.cenario');
  const fonte = elemento.querySelector('.fonte-cenario');

  function mostrarCenario(origem) {
    for (const [nome] of CAMPOS_CENARIO) {
      formCenario[nome].value = formatarNumero(contexto.cenario[nome] * 100, 2);
    }
    if (origem === 'atual' && macro) {
      fonte.textContent = `Taxas vigentes (Banco Central, atualizado em ${formatarData(macro.atualizadoEm)}). IPCA = acumulado em 12 meses.`;
    } else if (origem === 'focus' && macro && macro.focus) {
      fonte.textContent = `Média das projeções do Boletim Focus de ${formatarData(macro.focus.data)} para o prazo de ${Math.ceil(abaAtiva().prazoDias() / 365)} ano(s).`;
    } else if (origem === 'manual') {
      fonte.textContent = 'Cenário ajustado manualmente (fica salvo neste navegador).';
    } else {
      fonte.textContent = '';
    }
  }

  formCenario.addEventListener('input', aoParar(() => {
    const novo = {};
    for (const [nome] of CAMPOS_CENARIO) novo[nome] = lerNumero(formCenario[nome].value) / 100;
    if (Object.values(novo).every(Number.isFinite)) {
      contexto.cenario = novo;
      salvar('cenario', novo);
      salvar('cenario-origem', 'manual');
      fonte.textContent = 'Cenário ajustado manualmente (fica salvo neste navegador).';
      abaAtiva().atualizar();
    }
  }, 300));

  formCenario.addEventListener('click', (evento) => {
    const origem = evento.target.dataset.cenario;
    if (!origem) return;
    contexto.cenario = origem === 'focus' ? cenarioFocus(macro, abaAtiva().prazoDias()) : cenarioAtual(macro);
    // "Taxas atuais" não é salvo: na próxima visita usa os dados mais recentes.
    salvar('cenario', origem === 'focus' ? contexto.cenario : null);
    salvar('cenario-origem', origem);
    mostrarCenario(origem);
    abaAtiva().atualizar();
  });

  // -------------------------------------------------------------------- Abas
  const conteudo = (chave) => elemento.querySelector(`[data-conteudo="${chave}"]`);
  const abas = {};
  abas.simular = montarSimular(conteudo('simular'), contexto);
  abas.comparar = montarComparar(conteudo('comparar'), contexto);
  abas.equivalencia = montarEquivalencia(conteudo('equivalencia'), contexto);
  abas.tesouro = montarTesouro(conteudo('tesouro'), contexto, (titulo) => {
    selecionarAba('simular');
    abas.simular.preencher(titulo);
    elemento.querySelector('.abas').scrollIntoView({ behavior: 'smooth' });
  });

  let chaveAtiva = 'simular';
  function abaAtiva() {
    return abas[chaveAtiva];
  }

  function selecionarAba(chave) {
    chaveAtiva = chave;
    elemento.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', b.dataset.aba === chave));
    elemento.querySelectorAll('[data-conteudo]').forEach((c) => { c.hidden = c.dataset.conteudo !== chave; });
    abas[chave].atualizar();
  }

  elemento.querySelector('.abas').addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-aba]');
    if (botao) selecionarAba(botao.dataset.aba);
  });

  mostrarCenario(lerSalvo('cenario', null) ? lerSalvo('cenario-origem', 'manual') : 'atual');
  abaAtiva().atualizar();
}
