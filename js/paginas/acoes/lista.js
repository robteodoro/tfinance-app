// =============================================================================
// Lista das ações, em duas abas:
//
//   Triagem      - todas as ações, com filtros (setor/categoria, dólar, juros,
//                  endividamento), busca e ordenação. Serve para encontrar
//                  candidatas e marcá-las com a estrela.
//   Acompanhando - só as ações marcadas, com mais indicadores de longo prazo
//                  lado a lado, para comparar de perto.
//
// Tocar em uma ação abre a página dela (detalhe.js).
// =============================================================================

import { botaoExplica } from '../../componentes/explica.js';
import { mediana, percentualComSinal } from '../../componentes/blocos.js';
import {
  formatarMoeda, formatarPercentual, formatarDecimal, formatarData, formatarNumero,
} from '../../util/formatar.js';
import { escapar } from '../../util/dom.js';
import { lerSalvo, salvar } from '../../util/armazenamento.js';
import { botaoEstrela, ligarEstrelas, lerAcompanhadas } from './acompanhamento.js';
import { celulaPreco, notaDoDia, variacaoDoDia, horario } from '../../componentes/hoje.js';

// Critérios de ordenação. Valores ausentes (NaN) vão sempre para o fim.
const ORDENACOES = {
  liquidez: { nome: 'Mais negociadas', valor: (a) => -a.liquidezMedia },
  // Só aparecem durante o pregão (quando há cotações do dia).
  quedaHoje: { nome: 'Maiores quedas hoje', valor: (a) => (a.hoje ? a.hoje.variacao : NaN), doDia: true },
  altaHoje: { nome: 'Maiores altas hoje', valor: (a) => (a.hoje ? -a.hoje.variacao : NaN), doDia: true },
  dy: { nome: 'Maior Dividend Yield', valor: (a) => -a.indicadores.dividendYield },
  dy5: { nome: 'Maior Dividend Yield médio (5 anos)', valor: (a) => -longo(a, 'dividendYieldMedio5anos') },
  // P/L negativo (prejuízo) não é "barato": vai para o fim.
  pl: { nome: 'Menor P/L', valor: (a) => (a.indicadores.precoLucro > 0 ? a.indicadores.precoLucro : NaN) },
  pvp: { nome: 'Menor P/VP', valor: (a) => a.indicadores.precoValorPatrimonial },
  roe: { nome: 'Maior ROE', valor: (a) => -a.indicadores.roe },
  divida: { nome: 'Menor dívida líquida / EBITDA', valor: (a) => divida(a, 'dividaLiquidaEbitda') },
  retorno5: { nome: 'Maior retorno em 5 anos', valor: (a) => -longo(a, 'retorno5anos') },
  retorno: { nome: 'Maior retorno em 12 meses', valor: (a) => -a.indicadores.retornoTotal },
  codigo: { nome: 'Código (A–Z)', valor: (a) => a.codigo },
};

const longo = (a, campo) => (a.longoPrazo ? a.longoPrazo[campo] : NaN);
const divida = (a, campo) => (a.indicadores.divida ? a.indicadores.divida[campo] : NaN);
const direcaoDe = (a, fator) => {
  const s = a.longoPrazo && a.longoPrazo.sensibilidade;
  return s ? s[fator].direcao : null;
};

// Filtros de exposição. 'sobe' = a ação costuma ir melhor que a bolsa quando
// o fator sobe; 'cai' = pior. Ver calc/historico.js (sensibilidades).
const FILTRO_DOLAR = {
  todas: 'Todas',
  sobe: 'Ganham com dólar alto (exportadoras…)',
  cai: 'Perdem com dólar alto (importadoras, dívida em dólar…)',
  neutra: 'Pouco sensíveis ao dólar',
};
const FILTRO_JUROS = {
  todas: 'Todas',
  cai: 'Sofrem com juros altos',
  sobe: 'Ganham com juros altos',
  neutra: 'Pouco sensíveis aos juros',
};
export const NIVEIS_DIVIDA = {
  baixo: { nome: 'Baixo', classe: 'nivel-baixo' },
  atencao: { nome: 'Atenção', classe: 'nivel-atencao' },
  alto: { nome: 'Alto', classe: 'nivel-alto' },
};
const FILTRO_DIVIDA = { todas: 'Todas', baixo: 'Risco baixo', atencao: 'Atenção', alto: 'Risco alto', semDados: 'Bancos e sem dados' };

function comparar(criterio) {
  const valor = ORDENACOES[criterio].valor;
  return (a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (typeof va === 'string') return va.localeCompare(vb);
    if (!Number.isFinite(va)) return Number.isFinite(vb) ? 1 : 0;
    if (!Number.isFinite(vb)) return -1;
    return va - vb;
  };
}

/** P/L para exibir: negativo vira "prejuízo". */
export function textoPrecoLucro(valor) {
  if (!Number.isFinite(valor)) return '—';
  return valor < 0 ? '<small>prejuízo</small>' : formatarNumero(valor, 1);
}

/** Etiqueta colorida do risco de endividamento. */
export function etiquetaDivida(acao) {
  const nivel = acao.indicadores.nivelDivida;
  if (!nivel) return '<small>—</small>';
  const n = NIVEIS_DIVIDA[nivel.nivel];
  return `<span class="etiqueta ${n.classe}">${n.nome}</span>`;
}

/** Setas de exposição: "dólar ▲ juros ▼" (só quando a relação é confiável). */
export function textoExposicao(acao) {
  const partes = [];
  for (const [fator, nome] of [['dolar', 'dólar'], ['juros', 'juros']]) {
    const d = direcaoDe(acao, fator);
    if (d === 'sobe') partes.push(`<span class="positivo">${nome} ▲</span>`);
    if (d === 'cai') partes.push(`<span class="negativo">${nome} ▼</span>`);
  }
  if (partes.length) return partes.join('<br>');
  return acao.longoPrazo && acao.longoPrazo.sensibilidade ? '<small>pouco sensível</small>' : '<small>—</small>';
}

/** Filtro de setor: "s:Setor" pega o setor inteiro; "c:Categoria", só a categoria. */
function opcoesSetor(acoes, escolhido) {
  const setores = new Map();
  for (const a of acoes) {
    const e = a.empresaDados;
    if (!setores.has(e.setor)) setores.set(e.setor, new Set());
    setores.get(e.setor).add(e.categoria || e.setor);
  }
  return [...setores.keys()].sort().map((setor) => {
    const categorias = [...setores.get(setor)].sort();
    const opcao = (valor, texto) => `<option value="${escapar(valor)}" ${escolhido === valor ? 'selected' : ''}>${escapar(texto)}</option>`;
    return `
      <optgroup label="${escapar(setor)}">
        ${opcao(`s:${setor}`, categorias.length > 1 ? `${setor} (todo o setor)` : setor)}
        ${categorias.length > 1 ? categorias.map((c) => opcao(`c:${c}`, c)).join('') : ''}
      </optgroup>`;
  }).join('');
}

function passaSetor(acao, filtro) {
  if (filtro === 'todos') return true;
  const e = acao.empresaDados;
  return filtro.startsWith('s:') ? e.setor === filtro.slice(2) : (e.categoria || e.setor) === filtro.slice(2);
}

/** Tabela-resumo: o "típico" de cada setor, para servir de referência. */
function tabelaPorSetor(acoes) {
  // Uma linha por empresa (ações ON e PN da mesma empresa contam uma vez).
  const porEmpresa = new Map();
  for (const a of acoes) if (!porEmpresa.has(a.empresa)) porEmpresa.set(a.empresa, a);
  const setores = [...new Set([...porEmpresa.values()].map((a) => a.empresaDados.setor))].sort();
  const linhas = setores.map((setor) => {
    const grupo = [...porEmpresa.values()].filter((a) => a.empresaDados.setor === setor);
    const i = (campo) => grupo.map((a) => a.indicadores[campo]);
    return `
      <tr>
        <td>${escapar(setor)}</td>
        <td>${grupo.length}</td>
        <td>${textoPrecoLucro(mediana(i('precoLucro').filter((v) => v > 0)))}</td>
        <td>${formatarDecimal(mediana(i('precoValorPatrimonial')))}</td>
        <td>${formatarPercentual(mediana(i('dividendYield')), 1)}</td>
        <td>${formatarPercentual(mediana(i('roe')), 1)}</td>
        <td>${formatarDecimal(mediana(grupo.map((a) => divida(a, 'dividaLiquidaEbitda'))))}</td>
      </tr>`;
  }).join('');
  return `
    <details class="painel">
      <summary>Valores típicos por setor</summary>
      <p class="nota">Mediana de cada setor entre as empresas da lista (metade fica acima,
        metade abaixo). Indicadores variam muito entre setores: compare uma empresa
        com outras do mesmo setor.</p>
      <div class="tabela-rolavel">
        <table class="tabela">
          <thead><tr><th>Setor</th><th>Empresas</th><th>P/L</th><th>P/VP</th><th>DY</th><th>ROE</th><th>Dív./EBITDA</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </details>`;
}

function abas(atual, quantidade) {
  return `
    <div class="abas" role="tablist">
      <a role="tab" href="#/acoes" aria-selected="${atual === 'triagem'}">Triagem</a>
      <a role="tab" href="#/acoes/acompanhando" aria-selected="${atual === 'acompanhando'}">Acompanhando (${quantidade})</a>
    </div>`;
}

export function montarLista(elemento, acoes, dados, referencias, aba = 'triagem') {
  const acompanhadas = lerAcompanhadas();
  const cabecalho = `
    <h1>Ações</h1>
    <p class="introducao">As ${acoes.length} ações mais negociadas na bolsa (e algumas elétricas
      menos negociadas). Use a <strong>Triagem</strong> para encontrar candidatas e marque com
      ☆ as que quer <strong>acompanhar</strong> de perto.</p>
    ${abas(aba, acompanhadas.length)}`;
  if (aba === 'acompanhando') {
    montarAcompanhando(elemento, cabecalho, acoes, acompanhadas, dados, referencias);
  } else {
    montarTriagem(elemento, cabecalho, acoes, dados, referencias);
  }
}

// -----------------------------------------------------------------------------
// Aba "Triagem"
// -----------------------------------------------------------------------------

function montarTriagem(elemento, cabecalho, acoes, dados, referencias) {
  const padrao = { setor: 'todos', ordem: 'liquidez', dolar: 'todas', juros: 'todas', divida: 'todas' };
  const filtros = { ...padrao, ...lerSalvo('acoes-filtros', padrao) };
  // Fora do pregão, as ordenações "hoje" não fazem sentido e somem.
  const ordenacoes = Object.fromEntries(Object.entries(ORDENACOES).filter(([, o]) => !o.doDia || referencias.hoje));
  if (!ordenacoes[filtros.ordem]) filtros.ordem = 'liquidez';
  const lp = referencias.longoPrazo;
  const selecao = (nome, opcoes, valor) => `
    <select name="${nome}">
      ${Object.entries(opcoes).map(([chave, texto]) => `<option value="${chave}" ${valor === chave ? 'selected' : ''}>${texto}</option>`).join('')}
    </select>`;

  elemento.innerHTML = `
    ${cabecalho}
    <p class="referencias">Em 12 meses: Ibovespa ${percentualComSinal(referencias.ibovespa)} ${botaoExplica('ibovespa')}
      · CDI ${percentualComSinal(referencias.cdi)} ${botaoExplica('cdi')}</p>
    ${lp ? `<p class="referencias">Em 5 anos, média ao ano: Ibovespa ${percentualComSinal(lp.ibovespa5anos)}
      · CDI ${percentualComSinal(lp.cdi5anos)} ${botaoExplica('retorno-anualizado')}</p>` : ''}

    <form class="formulario" autocomplete="off" onsubmit="return false">
      <div class="grade-campos">
        <label class="campo">
          <span class="rotulo">Setor ou categoria ${botaoExplica('categorias-energia')}</span>
          <select name="setor">
            <option value="todos">Todos os setores</option>
            ${opcoesSetor(acoes, filtros.setor)}
          </select>
        </label>
        <label class="campo">
          <span class="rotulo">Dólar ${botaoExplica('sensibilidade-dolar')}</span>
          ${selecao('dolar', FILTRO_DOLAR, filtros.dolar)}
        </label>
        <label class="campo">
          <span class="rotulo">Juros ${botaoExplica('sensibilidade-juros')}</span>
          ${selecao('juros', FILTRO_JUROS, filtros.juros)}
        </label>
        <label class="campo">
          <span class="rotulo">Risco da dívida ${botaoExplica('nivel-endividamento')}</span>
          ${selecao('divida', FILTRO_DIVIDA, filtros.divida)}
        </label>
        <label class="campo">
          <span class="rotulo">Buscar</span>
          <input type="search" name="busca" placeholder="Código ou nome (ex.: CMIG)">
        </label>
        <label class="campo">
          <span class="rotulo">Ordenar por</span>
          ${selecao('ordem', Object.fromEntries(Object.entries(ordenacoes).map(([k, o]) => [k, o.nome])), filtros.ordem)}
        </label>
      </div>
      <p class="contagem nota"></p>
    </form>

    <div class="tabela-rolavel lista-longa">
      <table class="tabela tabela-ativos">
        <thead><tr>
          <th>Ação</th>
          <th>Preço</th>
          <th>P/L ${botaoExplica('preco-lucro')}</th>
          <th>P/VP ${botaoExplica('preco-valor-patrimonial')}</th>
          <th>DY 12m ${botaoExplica('dividend-yield')}</th>
          <th>ROE ${botaoExplica('roe')}</th>
          <th>Dívida ${botaoExplica('nivel-endividamento')}</th>
          <th>Sensível a ${botaoExplica('sensibilidade-dolar')}</th>
          <th>Retorno 5a ${botaoExplica('retorno-anualizado')}</th>
          <th class="opcional">Retorno 12m ${botaoExplica('retorno-total')}</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <p class="nenhum aviso" hidden>Nenhuma ação encontrada com esses filtros.</p>
    <p class="nota">"Sensível a": <span class="positivo">▲</span> a ação costuma ir melhor que a bolsa
      quando o dólar (ou os juros) sobe; <span class="negativo">▼</span>, pior. Medido nos últimos 5 anos.
      "Retorno 5a" = média ao ano, com proventos reinvestidos.</p>
    ${notaDoDia(referencias.hoje)}

    ${tabelaPorSetor(acoes)}

    <p class="nota">Cotações da B3 até ${formatarData(dados.dataCotacao)}. Lucro, patrimônio e dívida
      dos balanços enviados à CVM (últimos 12 meses divulgados) ${botaoExplica('balancos-cvm')}.
      Informação para estudo, não é recomendação de investimento.</p>`;

  const formulario = elemento.querySelector('form');
  const corpo = elemento.querySelector('tbody');
  const nenhum = elemento.querySelector('.nenhum');
  const contagem = elemento.querySelector('.contagem');

  function atualizar() {
    const f = Object.fromEntries(['setor', 'ordem', 'dolar', 'juros', 'divida'].map((n) => [n, formulario[n].value]));
    const busca = formulario.busca.value.trim().toUpperCase();
    salvar('acoes-filtros', f);

    const visiveis = acoes
      .filter((a) => passaSetor(a, f.setor))
      .filter((a) => f.dolar === 'todas' || direcaoDe(a, 'dolar') === f.dolar)
      .filter((a) => f.juros === 'todas' || direcaoDe(a, 'juros') === f.juros)
      .filter((a) => {
        if (f.divida === 'todas') return true;
        const n = a.indicadores.nivelDivida;
        return f.divida === 'semDados' ? !n : Boolean(n) && n.nivel === f.divida;
      })
      .filter((a) => !busca || a.codigo.includes(busca) || a.empresaDados.nome.toUpperCase().includes(busca))
      .sort(comparar(f.ordem));

    contagem.textContent = visiveis.length === acoes.length
      ? `${acoes.length} ações` : `${visiveis.length} de ${acoes.length} ações com esses filtros`;
    corpo.innerHTML = visiveis.map((a) => {
      const i = a.indicadores;
      return `
        <tr data-codigo="${a.codigo}">
          <td>${botaoEstrela(a.codigo)} <a href="#/acoes/${a.codigo}"><strong>${a.codigo}</strong></a><br>
            <small>${escapar(a.empresaDados.nome)}</small></td>
          <td>${celulaPreco(i.preco, a.hoje)}</td>
          <td>${textoPrecoLucro(i.precoLucro)}</td>
          <td>${formatarDecimal(i.precoValorPatrimonial)}</td>
          <td>${formatarPercentual(i.dividendYield, 1)}</td>
          <td>${formatarPercentual(i.roe, 1)}</td>
          <td>${etiquetaDivida(a)}</td>
          <td>${textoExposicao(a)}</td>
          <td>${percentualComSinal(longo(a, 'retorno5anos'))}</td>
          <td class="opcional">${i.historicoCompleto ? percentualComSinal(i.retornoTotal) : '<small>histórico curto</small>'}</td>
        </tr>`;
    }).join('');
    nenhum.hidden = visiveis.length > 0;
  }

  formulario.addEventListener('input', atualizar);
  ligarEstrelas(elemento, () => {
    elemento.querySelector('.abas').outerHTML = abas('triagem', lerAcompanhadas().length);
  });
  // A linha inteira funciona como link (mais fácil de tocar no celular).
  corpo.addEventListener('click', (evento) => {
    const linha = evento.target.closest('tr[data-codigo]');
    if (linha && !evento.target.closest('a, button')) location.hash = `#/acoes/${linha.dataset.codigo}`;
  });
  atualizar();
}

// -----------------------------------------------------------------------------
// Aba "Acompanhando"
// -----------------------------------------------------------------------------

// Variação no dia a partir da qual o movimento é destacado (3%).
const MOVIMENTO_FORTE = 0.03;

/**
 * Quadro com as ações acompanhadas que mais se moveram hoje. Para quem
 * investe no longo prazo, uma queda forte sem mudança nos fundamentos pode
 * ser oportunidade de compra; uma alta forte, de rever o preço pago.
 */
function movimentosFortes(lista, cotacoes) {
  if (!cotacoes) return '';
  const fortes = lista
    .filter((a) => a.hoje && Math.abs(a.hoje.variacao) >= MOVIMENTO_FORTE)
    .sort((a, b) => a.hoje.variacao - b.hoje.variacao);
  if (!fortes.length) {
    return `<p class="nota">Hoje, até ${horario(cotacoes)}, nenhuma ação acompanhada variou mais de
      ${formatarPercentual(MOVIMENTO_FORTE, 0)}.</p>`;
  }
  return `
    <div class="cartao-resultado movimentos-fortes">
      <h2>Movimentos fortes hoje ${botaoExplica('cotacao-intradiaria')}</h2>
      <ul>${fortes.map((a) => `
        <li><a href="#/acoes/${a.codigo}"><strong>${a.codigo}</strong></a> ${variacaoDoDia(a.hoje.variacao)}
          <small>${formatarMoeda(a.hoje.preco)} · mín. ${formatarMoeda(a.hoje.minima)} · máx. ${formatarMoeda(a.hoje.maxima)}</small></li>`).join('')}
      </ul>
      <p class="nota">Variação desde o fechamento de ontem, até ${horario(cotacoes)}. Uma queda forte sem
        notícia que mude os fundamentos pode ser oportunidade; vale ver o motivo antes de decidir.</p>
    </div>`;
}

function montarAcompanhando(elemento, cabecalho, acoes, acompanhadas, dados, referencias) {
  const lista = acompanhadas.map((c) => acoes.find((a) => a.codigo === c)).filter(Boolean);
  const foraDaLista = acompanhadas.filter((c) => !acoes.some((a) => a.codigo === c));
  if (!lista.length) {
    elemento.innerHTML = `
      ${cabecalho}
      <div class="cartao-resultado boas-vindas">
        <h2>Nenhuma ação acompanhada ainda</h2>
        <p>Na aba <a href="#/acoes">Triagem</a>, filtre as ações pelo que importa para você
          (setor, dívida, dólar, juros, dividendos…) e toque na estrela ☆ ao lado das que
          parecerem interessantes. Elas aparecem aqui, lado a lado, com indicadores de longo prazo.</p>
        <p class="nota">A lista fica guardada só neste navegador.</p>
      </div>`;
    return;
  }
  const lp = referencias.longoPrazo || {};
  const linhas = lista.map((a) => {
    const i = a.indicadores;
    const l = a.longoPrazo || {};
    const d = i.divida || {};
    return `
      <tr data-codigo="${a.codigo}">
        <td>${botaoEstrela(a.codigo)} <a href="#/acoes/${a.codigo}"><strong>${a.codigo}</strong></a><br>
          <small>${escapar(a.empresaDados.categoria || a.empresaDados.setor)}</small></td>
        <td>${celulaPreco(i.preco, a.hoje)}</td>
        <td>${textoPrecoLucro(i.precoLucro)}</td>
        <td>${formatarDecimal(i.precoValorPatrimonial)}</td>
        <td>${formatarPercentual(i.dividendYield, 1)}</td>
        <td>${formatarPercentual(l.dividendYieldMedio5anos, 1)}</td>
        <td>${formatarPercentual(i.roe, 1)}</td>
        <td>${percentualComSinal(i.crescimentoLucro)}</td>
        <td>${etiquetaDivida(a)}<br><small>${Number.isFinite(d.dividaLiquidaEbitda) ? `${formatarDecimal(d.dividaLiquidaEbitda)}× EBITDA` : ''}</small></td>
        <td>${textoExposicao(a)}</td>
        <td>${percentualComSinal(l.retorno5anos)}</td>
        <td>${percentualComSinal(l.retorno10anos)}</td>
      </tr>`;
  }).join('');

  elemento.innerHTML = `
    ${cabecalho}
    ${movimentosFortes(lista, referencias.hoje)}
    <div class="tabela-rolavel lista-longa">
      <table class="tabela tabela-ativos tabela-comparacao">
        <thead><tr>
          <th>Ação</th>
          <th>Preço</th>
          <th>P/L ${botaoExplica('preco-lucro')}</th>
          <th>P/VP ${botaoExplica('preco-valor-patrimonial')}</th>
          <th>DY 12m ${botaoExplica('dividend-yield')}</th>
          <th>DY médio 5 anos</th>
          <th>ROE ${botaoExplica('roe')}</th>
          <th>Lucro: cresc. 5 anos ${botaoExplica('crescimento-lucro')}</th>
          <th>Dívida ${botaoExplica('nivel-endividamento')}</th>
          <th>Sensível a ${botaoExplica('sensibilidade-dolar')}</th>
          <th>Retorno 5 anos ${botaoExplica('retorno-anualizado')}</th>
          <th>Retorno 10 anos</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
        <tfoot>
          <tr><td><strong>Ibovespa</strong><br><small>referência (BOVA11)</small></td><td colspan="9"></td>
            <td>${percentualComSinal(lp.ibovespa5anos)}</td><td>${percentualComSinal(lp.ibovespa10anos)}</td></tr>
          <tr><td><strong>CDI</strong><br><small>referência</small></td><td colspan="9"></td>
            <td>${percentualComSinal(lp.cdi5anos)}</td><td>${percentualComSinal(lp.cdi10anos)}</td></tr>
        </tfoot>
      </table>
    </div>
    ${foraDaLista.length ? `<p class="aviso">Saíram da lista do Tfinance (deixaram de estar entre as mais negociadas): ${foraDaLista.map(escapar).join(', ')}.
      ${foraDaLista.map((c) => botaoEstrela(c)).join(' ')} Toque na estrela para removê-las.</p>` : ''}
    ${notaDoDia(referencias.hoje)}
    <p class="nota">Retornos com proventos reinvestidos, em média ao ano. Crescimento do lucro: média
      anual nos últimos 5 anos completos. Toque em uma ação para ver as séries históricas completas.
      Gire o celular para ver mais colunas.</p>`;

  ligarEstrelas(elemento, (codigo, marcada) => {
    // Ao desmarcar, a linha sai desta aba (e o contador da aba diminui).
    if (!marcada) {
      const linha = elemento.querySelector(`tr[data-codigo="${codigo}"]`);
      if (linha) linha.remove();
    }
    elemento.querySelector('.abas').outerHTML = abas('acompanhando', lerAcompanhadas().length);
  });
  elemento.querySelector('tbody').addEventListener('click', (evento) => {
    const linha = evento.target.closest('tr[data-codigo]');
    if (linha && !evento.target.closest('a, button')) location.hash = `#/acoes/${linha.dataset.codigo}`;
  });
}
