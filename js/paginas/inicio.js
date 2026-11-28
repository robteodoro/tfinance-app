// =============================================================================
// Página inicial: panorama dos principais indicadores econômicos e atalhos
// para as seções do aplicativo.
// =============================================================================

import { carregarDados } from '../util/dados.js';
import { botaoExplica } from '../componentes/explica.js';
import { desenharGrafico } from '../componentes/grafico.js';
import { formatarData, formatarNumero } from '../util/formatar.js';

const SECOES = [
  { rota: 'renda-fixa', titulo: 'Renda fixa', texto: 'Simule e compare CDB, LCI, LCA, Tesouro Direto e outros, já com impostos.' },
  { rota: 'fiis', titulo: 'Fundos imobiliários', texto: 'Dividend Yield, P/VP, rendimentos e carteira dos FIIs mais negociados.' },
  { rota: 'acoes', titulo: 'Ações', texto: 'P/L, dividendos, lucros e risco das ações mais negociadas.' },
  { rota: 'carteira', titulo: 'Minha carteira', texto: 'Acompanhe seus investimentos, compare com o CDI e avalie o risco.' },
  { rota: 'glossario', titulo: 'Glossário', texto: 'Explicações simples de cada indicador e conceito.' },
];

function cartaoIndicador(titulo, valor, detalhe, explica) {
  return `
    <div class="cartao-indicador">
      <span class="titulo">${titulo} ${botaoExplica(explica)}</span>
      <strong>${valor}</strong>
      <small>${detalhe}</small>
    </div>`;
}

export async function renderizar(elemento) {
  const macro = await carregarDados('macro');

  const indicadores = macro ? `
    <div class="grade-indicadores">
      ${cartaoIndicador('Selic (meta)', `${formatarNumero(macro.selicMeta.valor)}% a.a.`, `em ${formatarData(macro.selicMeta.data)}`, 'selic')}
      ${cartaoIndicador('CDI', `${formatarNumero(macro.cdi.valor)}% a.a.`, `em ${formatarData(macro.cdi.data)}`, 'cdi')}
      ${cartaoIndicador('IPCA 12 meses', `${formatarNumero(macro.ipca12m.valor)}%`, `até ${formatarData(macro.ipca12m.data.slice(0, 7))}`, 'ipca')}
      ${cartaoIndicador('Poupança', `${formatarNumero(macro.poupancaMensal.valor, 4)}% a.m.`, 'depósitos de hoje', 'poupanca')}
    </div>` : '<p class="aviso">Não foi possível carregar os indicadores econômicos.</p>';

  const focus = macro && macro.focus ? `
    <h2>O que o mercado espera ${botaoExplica('focus')}</h2>
    <div class="tabela-rolavel">
      <table class="tabela">
        <thead><tr><th>Fim de</th>${Object.keys(macro.focus.selic).map((a) => `<th>${a}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><td>Selic</td>${Object.values(macro.focus.selic).map((v) => `<td>${formatarNumero(v)}%</td>`).join('')}</tr>
          <tr><td>IPCA no ano</td>${Object.keys(macro.focus.selic).map((a) => `<td>${macro.focus.ipca[a] !== undefined ? formatarNumero(macro.focus.ipca[a]) + '%' : '—'}</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
    <p class="nota">Medianas do Boletim Focus de ${formatarData(macro.focus.data)}.</p>` : '';

  elemento.innerHTML = `
    <h1>Panorama</h1>
    ${indicadores}
    <div class="espaco-grafico"></div>
    ${focus}
    <h2>Seções</h2>
    <div class="grade-secoes">
      ${SECOES.map((s) => `
        <a class="cartao-secao ${s.emBreve ? 'em-breve' : ''}" href="#/${s.rota}">
          <strong>${s.titulo}</strong>
          <span>${s.texto}</span>
          ${s.emBreve ? '<em>em construção</em>' : ''}
        </a>`).join('')}
    </div>`;

  if (macro) {
    // Histórico de 5 anos: meta Selic × inflação acumulada em 12 meses.
    const ultimos = (serie) => serie.historico.slice(-60);
    const paraPontos = (serie) => ultimos(serie).map(([mes, valor]) => ({ x: mesParaNumero(mes), y: valor }));
    desenharGrafico(elemento.querySelector('.espaco-grafico'), {
      series: [
        { nome: 'Selic (meta)', cor: 'var(--cor-1)', pontos: paraPontos(macro.selicMeta) },
        { nome: 'IPCA em 12 meses', cor: 'var(--cor-3)', pontos: paraPontos(macro.ipca12m) },
      ],
      formatarX: numeroParaMes,
      // No eixo, só o ano, marcado em cada janeiro (a data completa aparece ao tocar).
      marcacoesX: janeirosEntre(paraPontos(macro.ipca12m)),
      formatarEixoX: (numero) => String(Math.floor(Math.round(numero) / 12)),
      formatarY: (v) => `${formatarNumero(v)}%`,
      formatarEixoY: (v) => `${formatarNumero(v, 0)}%`,
      comecarDoZero: true,
    });
  }
}

// O eixo X do gráfico precisa de números: "2026-11" vira 2026 × 12 + 10.
function mesParaNumero(mesIso) {
  const [ano, mes] = mesIso.split('-').map(Number);
  return ano * 12 + (mes - 1);
}
/** Posições (no formato numérico acima) de cada janeiro presente nos pontos. */
function janeirosEntre(pontos) {
  return pontos.map((p) => p.x).filter((x) => x % 12 === 0);
}
function numeroParaMes(numero) {
  const n = Math.round(numero);
  return `${String((n % 12) + 1).padStart(2, '0')}/${Math.floor(n / 12)}`;
}
