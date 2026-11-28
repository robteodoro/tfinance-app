// =============================================================================
// Aba "Risco": avalia a carteira como um conjunto.
//
// A pergunta de fundo é "e se eu tivesse a carteira de hoje desde 2015?".
// Com os pesos atuais e o que cada investimento de fato rendeu em cada mês
// (dados/carteira-historico.json), montamos a trajetória da carteira e dela
// tiramos as medidas (ver calc/risco.js):
//   - volatilidade, perda em um mês ruim e média dos piores meses;
//   - maior queda e tempo de recuperação; beta;
//   - cenários de crise reais (recessão de 2015-16, Covid, alta de juros...);
//   - reação da carteira ao dólar e aos juros, ativo por ativo;
//   - parte do patrimônio em empresas com dívida arriscada;
//   - concentração e correlação entre os ativos.
// Renda fixa entra rendendo o CDI de cada mês; outros bens, com valor fixo.
// =============================================================================

import { botaoExplica } from '../../componentes/explica.js';
import { cartao, percentualComSinal, graficoMensal } from '../../componentes/blocos.js';
import { concentracao, correlacao } from '../../calc/carteira.js';
import {
  CENARIOS, retornosCarteira, indiceAcumulado, retornosDoIndice, volatilidadeAnual, perdasMensais,
  quedaMaximaDetalhada, retornoNoPeriodo, piorJanela, reacaoAoFator, duracaoModificada,
} from '../../calc/risco.js';
import { sensibilidades, indiceCDI } from '../../calc/historico.js';
import { indicadoresAcao } from '../../calc/acoes.js';
import { carregarDados } from '../../util/dados.js';
import { formatarMoeda, formatarPercentual, formatarDecimal, formatarMesCurto, formatarNumero } from '../../util/formatar.js';
import { escapar } from '../../util/dom.js';
import { PRODUTOS } from '../../config/produtos.js';
import { LIMITE_FGC } from '../../config/tributos.js';
import { CLASSES } from './visao.js';
import { NIVEIS_DIVIDA } from '../acoes/lista.js';

const VARIAVEIS = ['acao', 'fii', 'etf'];
const MAIORES_NA_CORRELACAO = 8;
const MESES_CORRELACAO = 60;     // correlação com os últimos 5 anos
const ALTA_DOLAR = 0.10;         // "se o dólar subir 10%"
const ALTA_JUROS = 1;            // "se a Selic esperada subir 1 ponto percentual"
const T_CONFIAVEL = 2;           // abaixo disso, a relação é fraca (ver calc/historico.js)

const mes = (m) => formatarMesCurto(m);
const periodo = (meses, a, b) => `${mes(meses[a])} a ${mes(meses[b])}`;

/** Valor em reais com cor e sinal, sem quebrar a linha entre o sinal e o "R$". */
function moedaComSinal(valor) {
  if (!Number.isFinite(valor)) return '—';
  return `<span class="${valor < 0 ? 'negativo' : 'positivo'}" style="white-space: nowrap">${valor < 0 ? '−' : '+'}${formatarMoeda(Math.abs(valor))}</span>`;
}

function barras(titulo, pares, explica) {
  const maior = Math.max(...pares.map((p) => p[1]));
  return `
    <h3>${titulo} ${explica ? botaoExplica(explica) : ''}</h3>
    <ul class="lista-barras">
      ${pares.map(([nome, peso]) => `
        <li><span class="nome">${escapar(nome)}</span>
          <span class="barra-valor"><span style="width:${maior > 0 ? (peso / maior) * 100 : 0}%"></span></span>
          <strong>${formatarPercentual(peso, 1)}</strong></li>`).join('')}
    </ul>`;
}

/** Tabela de correlações (retornos mensais dos últimos 5 anos). */
function tabelaCorrelacao(ativos) {
  if (ativos.length < 2) return '';
  const cor = (c) => {
    if (!Number.isFinite(c)) return '';
    // Verde (andam diferente) → vermelho (andam juntos).
    const intensidade = Math.round(Math.abs(c) * 55);
    return c >= 0 ? `background: color-mix(in srgb, var(--cor-6) ${intensidade}%, transparent)`
      : `background: color-mix(in srgb, var(--cor-1) ${intensidade}%, transparent)`;
  };
  return `
    <h2>Correlação entre seus ativos ${botaoExplica('correlacao')}</h2>
    <p class="nota">Com os retornos mensais dos últimos 5 anos. Perto de 1 (vermelho): sobem e caem
      juntos — diversificam pouco. Perto de 0 ou negativa (verde): oscilam de forma diferente — se compensam.</p>
    <div class="tabela-rolavel">
      <table class="tabela tabela-correlacao">
        <thead><tr><th></th>${ativos.map((a) => `<th>${escapar(a.codigo)}</th>`).join('')}</tr></thead>
        <tbody>${ativos.map((a) => `
          <tr><th>${escapar(a.codigo)}</th>${ativos.map((b) => {
            const c = a === b ? 1 : correlacao(a.retornos, b.retornos);
            return `<td style="${cor(c)}">${a === b ? '—' : formatarDecimal(c)}</td>`;
          }).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/** Seta da reação de um ativo a um fator (só quando a relação é confiável). */
function seta(fator) {
  if (!fator || fator.direcao === 'neutra') return '<small>pouco sensível</small>';
  return fator.direcao === 'sobe' ? '<span class="positivo">ganha ▲</span>' : '<span class="negativo">perde ▼</span>';
}

/** Texto do cartão "se o dólar subir 10%" (ou dos juros). */
function cartaoReacao(titulo, reacao, reacaoIbov, choque, total, explica) {
  if (!reacao) return cartao(titulo, '—', 'histórico insuficiente', explica);
  const efeito = reacao.coeficiente * choque;
  const fraca = !(Math.abs(reacao.t) >= T_CONFIAVEL);
  const detalhe = [
    `${efeito < 0 ? 'cerca de −' : 'cerca de +'}${formatarMoeda(Math.abs(efeito * total))}`,
    reacaoIbov ? `Ibovespa: ${formatarPercentual(reacaoIbov.coeficiente * choque, 1)}` : '',
    fraca ? 'relação fraca, pouco confiável' : '',
  ].filter(Boolean).join(' · ');
  return cartao(titulo, percentualComSinal(efeito), detalhe, explica);
}

/** Nível de risco da dívida de cada ação da carteira (só as da seção Ações). */
function dividaDosAtivos(itens, dados) {
  const lista = [];
  const base = dados.acoes;
  for (const i of itens.filter((x) => x.classe === 'acao')) {
    const acao = base && base.acoes.find((a) => a.codigo === i.id);
    if (!acao) { lista.push({ item: i, grupo: 'semDados' }); continue; }
    const ind = indicadoresAcao(acao, base.empresas[acao.empresa], base.datas, base.referencia.fechamentos);
    if (ind.setorFinanceiro) lista.push({ item: i, grupo: 'financeira' });
    else if (!ind.nivelDivida) lista.push({ item: i, grupo: 'semDados' });
    else lista.push({ item: i, grupo: ind.nivelDivida.nivel, motivos: ind.nivelDivida.motivos });
  }
  return lista;
}

export function montarRisco(elemento, pagina) {
  const { visao } = pagina;
  if (!visao.itens.length) {
    elemento.innerHTML = '<p class="aviso">Registre seus investimentos na aba <a href="#" data-ir="lancamentos">Lançamentos</a> para ver a avaliação de risco.</p>';
    return;
  }
  // O histórico longo (~200 KB) só é baixado quando a aba Risco é aberta.
  elemento.innerHTML = '<p class="carregando-risco nota">Carregando o histórico dos seus ativos…</p>';
  carregarDados('carteira-historico').then((historico) => {
    // A pessoa pode ter trocado de aba enquanto o arquivo carregava.
    if (!elemento.querySelector('.carregando-risco')) return;
    desenhar(elemento, pagina, historico);
  });
}

function desenhar(elemento, pagina, historico) {
  const { visao, dados } = pagina;
  const total = visao.total;
  const hoje = dados.cotacoes ? dados.cotacoes.dataCotacao : new Date().toISOString().slice(0, 10);
  const variaveis = visao.itens.filter((i) => VARIAVEIS.includes(i.classe));
  const pesoVariavel = variaveis.reduce((s, i) => s + i.peso, 0);

  // ------------------------------------------------ Simulação histórica
  let sim = null;
  if (historico) {
    const { meses, fatores } = historico;
    const componentes = visao.itens.map((i) => {
      if (VARIAVEIS.includes(i.classe)) return { peso: i.peso, tipo: 'variavel', indice: historico.ativos[i.id] || null };
      return { peso: i.peso, tipo: i.classe === 'rendaFixa' ? 'cdi' : 'fixo' };
    });
    const { retornos, substituido } = retornosCarteira(componentes, fatores);
    const ibovespa = retornosDoIndice(fatores.ibovespa);
    const indice = indiceAcumulado(retornos);
    sim = {
      meses, fatores, retornos, indice, ibovespa,
      volatilidade: volatilidadeAnual(retornos),
      volatilidadeIbov: volatilidadeAnual(ibovespa),
      perdas: perdasMensais(retornos),
      perdasIbov: perdasMensais(ibovespa),
      queda: quedaMaximaDetalhada(indice),
      beta: reacaoAoFator(retornos, ibovespa),
      dolar: reacaoAoFator(retornos, retornosDoIndice(fatores.dolar)),
      dolarIbov: reacaoAoFator(ibovespa, retornosDoIndice(fatores.dolar)),
      juros: reacaoAoFator(retornos, fatores.juros),
      jurosIbov: reacaoAoFator(ibovespa, fatores.juros),
      piorAno: piorJanela(retornos, 12),
      // Parte da carteira que, em média, precisou do Ibovespa no lugar.
      substituidoMedio: substituido.slice(1).reduce((s, v) => s + v, 0) / (substituido.length - 1),
      cenarios: CENARIOS.map((c) => {
        const a = meses.indexOf(c.inicio) - 1;
        const b = meses.indexOf(c.fim);
        const variacao = (serie) => (a >= 0 && b > a && serie[a] && serie[b] ? serie[b] / serie[a] - 1 : NaN);
        return {
          ...c,
          carteira: retornoNoPeriodo(retornos, meses, c.inicio, c.fim),
          ibovespa: variacao(fatores.ibovespa),
          dolar: variacao(fatores.dolar),
        };
      }),
    };
    // Ativos com histórico curto (começam depois do primeiro mês).
    sim.historicoCurto = variaveis
      .map((i) => {
        const serie = historico.ativos[i.id];
        const inicio = serie ? serie.findIndex((v) => v) : -1;
        return { item: i, inicio };
      })
      .filter((x) => x.inicio !== 0);
  }

  // Sensibilidade de cada ativo (dólar e juros, descontada a bolsa).
  const exposicoes = sim ? variaveis.map((i) => {
    const serie = historico.ativos[i.id];
    const s = serie ? sensibilidades(serie, serie.map(() => 0), sim.fatores) : null;
    return { item: i, sensibilidade: s };
  }) : [];

  // Renda fixa prefixada e IPCA+: perda de valor de mercado se os juros subirem 1 ponto.
  const rendaFixaMarcada = visao.itens
    .filter((i) => i.classe === 'rendaFixa')
    .map((i) => ({ item: i, duracao: duracaoModificada(i.aplicacao, hoje) }))
    .filter((x) => x.duracao > 0);
  const perdaRendaFixa = rendaFixaMarcada.reduce((s, x) => s + x.item.valor * x.duracao * 0.01, 0);

  // Risco da dívida das empresas.
  const dividas = dividaDosAtivos(visao.itens, dados);
  const pesoDivida = (grupo) => dividas.filter((d) => d.grupo === grupo).reduce((s, d) => s + d.item.peso, 0);

  // ------------------------------------------------------- Concentração
  const conc = concentracao(visao.itens.map((i) => i.peso));
  const porGrupo = {};
  for (const i of visao.itens) porGrupo[i.grupo] = (porGrupo[i.grupo] || 0) + i.peso;
  const grupos = Object.entries(porGrupo).sort((a, b) => b[1] - a[1]);

  // Retornos mensais recentes de cada ativo, para a correlação.
  const ativosCorrelacao = sim ? variaveis
    .filter((i) => historico.ativos[i.id])
    .slice(0, MAIORES_NA_CORRELACAO)
    .map((i) => ({ codigo: i.id, retornos: retornosDoIndice(historico.ativos[i.id]).slice(-MESES_CORRELACAO) })) : [];

  // ---------------------------------------------- Observações em texto
  const observacoes = [];
  const maior = variaveis[0]; // itens já vêm do maior para o menor
  if (maior && maior.peso > 0.2) {
    observacoes.push(`<strong>${escapar(maior.nome)}</strong> representa ${formatarPercentual(maior.peso, 0)} do patrimônio. Mais de 20% em um único ativo de renda variável deixa a carteira muito dependente dele.`);
  }
  for (const [grupo, peso] of grupos) {
    if (peso > 0.35 && !['Renda fixa', 'Outros bens'].includes(grupo)) {
      observacoes.push(`O grupo <strong>${escapar(grupo)}</strong> soma ${formatarPercentual(peso, 0)} do patrimônio: um problema nesse setor afetaria boa parte da carteira.`);
    }
  }
  if (sim) {
    const piorCrise = sim.cenarios.filter((c) => Number.isFinite(c.carteira)).sort((a, b) => a.carteira - b.carteira)[0];
    if (piorCrise && piorCrise.carteira < -0.2) {
      observacoes.push(`Na crise "${escapar(piorCrise.nome)}" (${mes(piorCrise.inicio)} a ${mes(piorCrise.fim)}), a carteira de hoje teria caído ${formatarPercentual(-piorCrise.carteira, 0)} — cerca de ${formatarMoeda(-piorCrise.carteira * total)}. Vale se perguntar se você aguentaria isso sem vender.`);
    }
    const pares = [];
    for (let a = 0; a < ativosCorrelacao.length; a++) {
      for (let b = a + 1; b < ativosCorrelacao.length; b++) {
        if (correlacao(ativosCorrelacao[a].retornos, ativosCorrelacao[b].retornos) > 0.8) {
          pares.push(`${ativosCorrelacao[a].codigo} e ${ativosCorrelacao[b].codigo}`);
        }
      }
    }
    if (pares.length) {
      observacoes.push(`Alguns ativos andaram quase juntos nos últimos 5 anos (${pares.slice(0, 3).join('; ')}): ter os dois diversifica pouco.`);
    }
  }
  const pesoDividaAlta = pesoDivida('alto');
  if (pesoDividaAlta > 0.1) {
    const nomes = dividas.filter((d) => d.grupo === 'alto').map((d) => d.item.id).join(', ');
    observacoes.push(`${formatarPercentual(pesoDividaAlta, 0)} do patrimônio está em empresas com <strong>risco de dívida alto</strong> (${escapar(nomes)}). Com juros altos, essas empresas são as mais expostas a dificuldades financeiras ${botaoExplica('nivel-endividamento')}.`);
  }
  if (perdaRendaFixa > 0.03 * total) {
    observacoes.push(`Seus títulos prefixados e IPCA+ perderiam cerca de ${formatarMoeda(perdaRendaFixa)} de valor de mercado se os juros subissem 1 ponto. A perda só acontece se precisar vender antes do vencimento ${botaoExplica('duracao')}.`);
  }
  for (const i of visao.itens) {
    if (i.classe === 'rendaFixa' && PRODUTOS[i.aplicacao.produto].fgc && i.valor > LIMITE_FGC) {
      observacoes.push(`<strong>${escapar(i.nome)}</strong> passa de ${formatarMoeda(LIMITE_FGC)}, o limite de garantia do FGC por instituição ${botaoExplica('fgc')}.`);
    }
  }
  if (pesoVariavel === 0) {
    observacoes.push('A carteira não tem ações, FIIs ou ETFs: oscila pouco, mas o potencial de ganho no longo prazo também é menor.');
  } else if (pesoVariavel > 0.8) {
    observacoes.push(`Renda variável é ${formatarPercentual(pesoVariavel, 0)} do patrimônio: a carteira pode oscilar bastante. Uma reserva em renda fixa ajuda a não precisar vender em momentos de queda.`);
  }
  if (conc.numeroEfetivo < 3 && visao.itens.length >= 3) {
    observacoes.push(`Apesar de ter ${visao.itens.length} investimentos, a distribuição equivale a apenas ${formatarDecimal(conc.numeroEfetivo)} investimentos de mesmo tamanho ${botaoExplica('concentracao')}.`);
  }
  if (!observacoes.length) observacoes.push('Nenhum ponto de atenção pelos critérios simples usados aqui.');

  // ------------------------------------------------------------ Página
  const p = sim && sim.perdas;
  const q = sim && sim.queda;
  elemento.innerHTML = `
    ${sim ? `
      <p class="nota">Medidas da <strong>carteira de hoje</strong> (mesmos pesos) como se você a tivesse desde
        ${mes(sim.meses[0])}, mês a mês — um período com recessão, pandemia e alta forte de juros.</p>
      <div class="grade-indicadores compacta">
        ${cartao('Volatilidade', `${formatarPercentual(sim.volatilidade, 1)} a.a.`, `Ibovespa: ${formatarPercentual(sim.volatilidadeIbov, 1)}`, 'volatilidade')}
        ${cartao('Perda em um mês ruim', p ? formatarMoeda(p.perdaMesRuim * total) : '—', p ? `${formatarPercentual(p.perdaMesRuim, 1)}; superada em 1 de cada 20 meses` : '', 'perda-mes-ruim')}
        ${cartao('Média dos meses muito ruins', p ? formatarMoeda(p.mediaPiores * total) : '—', p ? `${formatarPercentual(p.mediaPiores, 1)}; média dos ${p.quantidade} piores meses` : '', 'media-piores-meses')}
        ${cartao('Pior mês', p ? percentualComSinal(p.pior.retorno) : '—', p ? `${mes(sim.meses[p.pior.k])}` : '', 'perda-mes-ruim')}
        ${cartao('Maior queda', percentualComSinal(q.queda), q.queda < 0 ? `${periodo(sim.meses, q.pico, q.fundo)}; ${q.recuperacao === null ? 'ainda não recuperou' : `recuperou em ${q.recuperacao - q.fundo} meses`}` : '', 'drawdown')}
        ${cartao('Pior período de 12 meses', sim.piorAno ? percentualComSinal(sim.piorAno.retorno) : '—', sim.piorAno ? periodo(sim.meses, sim.piorAno.inicio, sim.piorAno.fim) : '', 'drawdown')}
        ${cartao('Beta', sim.beta ? formatarDecimal(sim.beta.coeficiente) : '—', 'em relação ao Ibovespa', 'beta')}
        ${cartao('Número efetivo de investimentos', formatarDecimal(conc.numeroEfetivo), `de ${visao.itens.length} registrados`, 'concentracao')}
      </div>` : `
      <p class="aviso">Não foi possível carregar o histórico dos ativos. As medidas de oscilação não estão disponíveis.</p>`}

    <h2>Pontos de atenção</h2>
    <ul class="observacoes">${observacoes.map((o) => `<li>${o}</li>`).join('')}</ul>

    ${sim ? `
      <h2>Sua carteira de hoje desde ${sim.meses[0].slice(0, 4)}</h2>
      <p class="nota">Como teria evoluído R$ 100 aplicados na carteira atual (mesmos pesos, com proventos),
        comparado ao Ibovespa e ao CDI.</p>
      <div class="espaco-grafico"></div>

      <h2>Cenários de crise ${botaoExplica('cenarios-crise')}</h2>
      <p class="nota">Quanto a carteira de hoje teria variado em crises reais do período.</p>
      <div class="tabela-rolavel">
        <table class="tabela">
          <thead><tr><th>Crise</th><th>Sua carteira</th><th>Em reais</th><th>Ibovespa</th><th>Dólar</th></tr></thead>
          <tbody>${sim.cenarios.map((c) => `
            <tr><td><strong>${escapar(c.nome)}</strong> <small>(${mes(c.inicio)} a ${mes(c.fim)})</small><br>
                <small>${escapar(c.descricao)}</small></td>
              <td><strong>${percentualComSinal(c.carteira)}</strong></td>
              <td>${moedaComSinal(c.carteira * total)}</td>
              <td>${percentualComSinal(c.ibovespa)}</td>
              <td>${percentualComSinal(c.dolar)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="nota">Na renda fixa foi usado o CDI de cada período. Títulos prefixados e IPCA+ podem ter perdido
        valor de mercado nas crises com alta de juros (ver abaixo).</p>

      <h2>Dólar e juros</h2>
      <p class="nota">Quanto a carteira de hoje costumou variar no mesmo mês em que o dólar ou a Selic esperada
        pelo mercado subiram (desde ${mes(sim.meses[0])}). Inclui o efeito que vem pela bolsa toda.</p>
      <div class="grade-indicadores compacta">
        ${cartaoReacao('Se o dólar subir 10%', sim.dolar, sim.dolarIbov, ALTA_DOLAR, total, 'exposicao-carteira')}
        ${cartaoReacao('Se a Selic esperada subir 1 ponto', sim.juros, sim.jurosIbov, ALTA_JUROS, total, 'exposicao-carteira')}
        ${rendaFixaMarcada.length ? cartao('Renda fixa prefixada e IPCA+', formatarMoeda(-perdaRendaFixa), 'se os juros de mercado subirem 1 ponto e você vender antes do vencimento', 'duracao') : ''}
      </div>
      ${exposicoes.length ? `
        <h3>Cada ativo, descontado o movimento da bolsa ${botaoExplica('sensibilidade-dolar')}</h3>
        <div class="tabela-rolavel">
          <table class="tabela">
            <thead><tr><th>Ativo</th><th>Peso</th><th>Com dólar alto</th><th>Com juros em alta</th></tr></thead>
            <tbody>${exposicoes.map((x) => `
              <tr><td>${escapar(x.item.id)}</td><td>${formatarPercentual(x.item.peso, 1)}</td>
                ${x.sensibilidade ? `<td>${seta(x.sensibilidade.dolar)}</td><td>${seta(x.sensibilidade.juros)}</td>`
                  : '<td colspan="2"><small>menos de 3 anos de histórico</small></td>'}</tr>`).join('')}
            </tbody>
          </table>
        </div>
        <p class="nota">Regressão com os últimos 5 anos: mostra "ganha" ou "perde" só quando a relação foi
          consistente. Para ver a reação de cada ação em detalhe, abra a página dela.</p>` : ''}
      ${rendaFixaMarcada.length ? `
        <h3>Renda fixa sensível aos juros ${botaoExplica('duracao')}</h3>
        <ul class="observacoes">${rendaFixaMarcada.map((x) => `
          <li><strong>${escapar(x.item.nome)}</strong>: cerca de ${formatarPercentual(x.duracao * 0.01, 1)}
            (${formatarMoeda(x.item.valor * x.duracao * 0.01)}) a menos a cada 1 ponto de alta nos juros,
            se vendido antes do vencimento.</li>`).join('')}</ul>` : ''}
    ` : ''}

    ${dividas.length ? `
      <h2>Dívida das empresas ${botaoExplica('nivel-endividamento')}</h2>
      ${barras('Parte do patrimônio, pelo risco da dívida', [
        ['Risco alto', pesoDivida('alto')], ['Atenção', pesoDivida('atencao')], ['Risco baixo', pesoDivida('baixo')],
        ['Bancos e seguradoras', pesoDivida('financeira')], ['Sem avaliação', pesoDivida('semDados')],
      ].filter((par) => par[1] > 0))}
      <ul class="observacoes">${dividas.filter((d) => ['alto', 'atencao'].includes(d.grupo)).map((d) => `
        <li><span class="etiqueta ${NIVEIS_DIVIDA[d.grupo].classe}">${NIVEIS_DIVIDA[d.grupo].nome}</span>
          <a href="#/acoes/${encodeURIComponent(d.item.id)}">${escapar(d.item.id)}</a>: ${d.motivos.map(escapar).join('; ')}.</li>`).join('')}</ul>
      ${pesoDivida('semDados') > 0 ? '<p class="nota">"Sem avaliação": ações fora das mais negociadas da seção Ações, cujos balanços o Tfinance não acompanha.</p>' : ''}` : ''}

    <h2>Concentração ${botaoExplica('concentracao')}</h2>
    ${barras('Por investimento', visao.itens.slice(0, 10).map((i) => [i.nome, i.peso]))}
    ${barras('Por setor ou tipo', grupos)}
    ${barras('Por classe', Object.entries(visao.porClasse).sort((a, b) => b[1] - a[1]).map(([c, v]) => [CLASSES[c].nome, v / total]))}

    ${tabelaCorrelacao(ativosCorrelacao)}

    <h2>Como estas medidas são calculadas ${botaoExplica('simulacao-historica')}</h2>
    <ul class="observacoes">
      <li>Os pesos de hoje são aplicados ao que cada investimento rendeu em cada mês desde
        ${sim ? mes(sim.meses[0]) : '2015'}. As perdas são as que de fato aconteceram, sem supor uma curva
        "normal" — por isso as crises aparecem com o tamanho real.</li>
      <li>Ações da seção Ações e FIIs incluem proventos; as demais ações e os ETFs, só a variação do preço.</li>
      <li>Renda fixa rende o CDI de cada mês (sem marcação a mercado); outros bens ficam com valor fixo.</li>
      ${sim && sim.historicoCurto.length ? `<li>Ativos com histórico mais curto — nos meses anteriores ao início,
        foi usado o Ibovespa no lugar: ${sim.historicoCurto.map((x) => `${escapar(x.item.id)} (${x.inicio < 0 ? 'sem histórico' : `desde ${mes(sim.meses[x.inicio])}`})`).join(', ')}.
        ${sim.substituidoMedio > 0.2 ? `<strong>Isso vale, em média, para ${formatarPercentual(sim.substituidoMedio, 0)} da carteira: as medidas ficam menos precisas.</strong>` : ''}</li>` : ''}
      <li>O passado não garante o futuro: uma crise nova pode ser diferente das que aconteceram.</li>
    </ul>`;

  const espaco = elemento.querySelector('.espaco-grafico');
  if (espaco && sim) {
    const { meses, fatores } = sim;
    const ibov = fatores.ibovespa;
    const baseIbov = ibov.find((v) => v);
    const series = [
      { nome: 'Sua carteira atual', cor: 'var(--cor-1)', valores: sim.indice },
      { nome: 'Ibovespa (BOVA11)', cor: 'var(--cor-2)', valores: ibov.map((v) => (v ? (100 * v) / baseIbov : null)) },
      { nome: 'CDI', cor: 'var(--cor-4)', tracejado: true, valores: indiceCDI(fatores.cdi, 0) },
    ];
    graficoMensal(espaco, meses, series, {
      formatarY: (v) => formatarNumero(v, 1), formatarEixoY: (v) => formatarNumero(v, 0),
    });
  }
}
