// =============================================================================
// Página de uma ação, pensada para quem avalia investimentos de médio e longo
// prazo:
//   - indicadores atuais e um resumo "em destaque" para o longo prazo;
//   - desempenho em 10 anos (com proventos reinvestidos) contra Ibovespa e CDI;
//   - resultados ano a ano (receita, lucro, margem, ROE, dívida, proventos);
//   - endividamento (risco de dificuldade financeira);
//   - sensibilidade ao dólar e aos juros;
//   - desempenho e proventos dos últimos 12 meses, risco, balanço e ficha.
// =============================================================================

import { botaoExplica } from '../../componentes/explica.js';
import {
  cartao, linhaResumo as linha, percentualComSinal, graficoPorDatas, graficoMensal,
} from '../../componentes/blocos.js';
import { ebitda, ZONAS_ALTMAN } from '../../calc/acoes.js';
import { detalheDoDia } from '../../componentes/hoje.js';
import { indiceCDI, JANELA_SENSIBILIDADE } from '../../calc/historico.js';
import { botaoEstrela, ligarEstrelas } from './acompanhamento.js';
import { precoNaData, acumularTaxaAnual } from '../../calc/mercado.js';
import {
  formatarMoeda, formatarMoedaCompacta, formatarMoedaDetalhada, formatarPercentual, formatarNumero,
  formatarDecimal, formatarData, formatarMesCurto,
} from '../../util/formatar.js';
import { escapar } from '../../util/dom.js';
import { textoPrecoLucro, etiquetaDivida, NIVEIS_DIVIDA } from './lista.js';

const NOMES_PROVENTO = { dividendo: 'Dividendo', jcp: 'JCP', rendimento: 'Rendimento' };
const NOMES_TIPO = { ON: 'Ordinária (ON)', PN: 'Preferencial (PN)', Unit: 'Unit' };

/** Barra horizontal proporcional (para tabelas de valores). */
function barra(valor, maior) {
  const largura = maior > 0 ? Math.max(0, (valor / maior) * 100) : 0;
  return `<div class="barra-valor ${valor < 0 ? 'negativa' : ''}"><span style="width:${Math.min(100, Math.abs(largura))}%"></span></div>`;
}

/** Divisão que devolve NaN se faltar dado. */
const razao = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : NaN);

/**
 * Tabela ano a ano: receita, lucro, margem, ROE, dívida líquida/EBITDA,
 * proventos por ação e Dividend Yield. A última linha traz os 12 meses mais
 * recentes quando o último documento é trimestral.
 */
function secaoResultados(acao) {
  const empresa = acao.empresaDados;
  const indicadores = acao.indicadores;
  const f = empresa.fundamentos;
  if (!f || !f.anual.length) return '<p class="nota">Resultados anuais não disponíveis.</p>';
  const doze = f.dozeMeses || {};
  const proventos = new Map(((acao.longoPrazo && acao.longoPrazo.proventosPorAno) || []).map((p) => [p.ano, p]));
  const financeira = indicadores.financeira;
  const linhas = f.anual.map((a) => ({
    rotulo: a.ano,
    receita: a.receita,
    lucro: a.lucro,
    margem: financeira ? NaN : razao(a.lucro, a.receita),
    roe: a.patrimonioLiquido > 0 ? razao(a.lucro, a.patrimonioLiquido) : NaN,
    dividaEbitda: financeira ? NaN : razao(a.dividaBruta - a.caixa, ebitda(a.ebit, a.depreciacao) > 0 ? ebitda(a.ebit, a.depreciacao) : NaN),
    proventos: proventos.has(a.ano) ? proventos.get(a.ano).proventos : NaN,
    dy: proventos.has(a.ano) ? proventos.get(a.ano).dividendYield : NaN,
  }));
  if (f.documento.tipo === 'ITR' && Number.isFinite(doze.lucro)) {
    linhas.push({
      rotulo: `12m até ${formatarMesCurto(f.documento.data)}`,
      receita: doze.receita,
      lucro: doze.lucro,
      margem: indicadores.margemLiquida,
      roe: indicadores.roe,
      dividaEbitda: indicadores.divida ? indicadores.divida.dividaLiquidaEbitda : NaN,
      proventos: indicadores.proventos12m,
      dy: indicadores.dividendYield,
    });
  }
  const maior = Math.max(...linhas.map((l) => Math.abs(l.lucro || 0)));
  const corpo = linhas.reverse().map((l) => `
    <tr>
      <td>${l.rotulo}</td>
      <td class="opcional">${financeira ? '—' : formatarMoedaCompacta(l.receita)}</td>
      <td>${barra(l.lucro, maior)}<strong class="${l.lucro < 0 ? 'negativo' : ''}">${formatarMoedaCompacta(l.lucro)}</strong></td>
      <td class="opcional">${formatarPercentual(l.margem, 1)}</td>
      <td>${formatarPercentual(l.roe, 1)}</td>
      <td class="opcional">${formatarDecimal(l.dividaEbitda)}</td>
      <td class="opcional">${Number.isFinite(l.proventos) ? formatarMoedaDetalhada(l.proventos) : '—'}</td>
      <td>${formatarPercentual(l.dy, 1)}</td>
    </tr>`).join('');
  const crescimento = Number.isFinite(indicadores.crescimentoLucro)
    ? `<p>Crescimento médio do lucro nos últimos 5 anos: ${percentualComSinal(indicadores.crescimentoLucro)} ao ano
        ${Number.isFinite(indicadores.crescimentoReceita) && !financeira
    ? `(receita: ${percentualComSinal(indicadores.crescimentoReceita)} ao ano)` : ''} ${botaoExplica('crescimento-lucro')}</p>`
    : '';
  return `
    ${crescimento}
    <div class="tabela-rolavel">
      <table class="tabela tabela-resultados tabela-anos">
        <thead><tr>
          <th>Ano</th><th class="opcional">Receita</th><th>Lucro dos acionistas</th>
          <th class="opcional">Margem ${botaoExplica('margem-liquida')}</th><th>ROE ${botaoExplica('roe')}</th>
          <th class="opcional">Dív./EBITDA ${botaoExplica('divida-ebitda')}</th>
          <th class="opcional">Proventos por ação</th><th>DY ${botaoExplica('dividend-yield')}</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>
    <p class="nota">Proventos por ação somados pela data com de cada ano e ajustados por desdobramentos;
      DY do ano = proventos ÷ preço no fim do ano. ${financeira ? 'Em bancos a receita é composta principalmente de juros e não é comparável à de outras empresas.' : ''}
      <span class="so-celular">Gire o celular para ver todas as colunas.</span></p>`;
}

/** Endividamento: nível, motivos e os indicadores que o compõem. */
function secaoDivida(acao) {
  const i = acao.indicadores;
  if (i.setorFinanceiro) {
    return `<p class="nota">Empresa do setor financeiro (banco, seguradora, bolsa ou holding): os
      critérios de endividamento não se aplicam — captar e aplicar dinheiro é o próprio negócio.</p>`;
  }
  const d = i.divida;
  if (!d) return '<p class="nota">Balanço indisponível.</p>';
  const nivel = i.nivelDivida;
  const zona = !Number.isFinite(d.zAltman) ? ''
    : d.zAltman < ZONAS_ALTMAN.risco ? 'zona de risco' : d.zAltman < ZONAS_ALTMAN.segura ? 'zona cinzenta' : 'zona segura';
  const resumo = nivel ? `
    <p>Risco ligado à dívida: ${etiquetaDivida(acao)}
      ${nivel.motivos.length ? `— ${nivel.motivos.join('; ')}.` : '— dívida em nível confortável pelos critérios usados.'}</p>` : '';
  return `
    ${resumo}
    <div class="grade-indicadores compacta">
      ${cartao('Dív. líquida / EBITDA', formatarDecimal(d.dividaLiquidaEbitda), `dívida líquida: ${formatarMoedaCompacta(d.dividaLiquida)}`, 'divida-ebitda')}
      ${cartao('Dív. líquida / patrimônio', formatarDecimal(d.dividaLiquidaPatrimonio), 'quanto é financiado por dívida', 'divida-liquida-patrimonio')}
      ${cartao('Cobertura de juros', d.coberturaJuros === Infinity ? 'folgada' : Number.isFinite(d.coberturaJuros) ? `${formatarDecimal(d.coberturaJuros)}×` : '—',
        d.coberturaJuros === Infinity ? 'o caixa rende mais do que a dívida custa' : 'resultado operacional ÷ custo financeiro líquido', 'cobertura-juros')}
      ${cartao('Dívida de curto prazo', formatarPercentual(d.parcelaCurtoPrazo, 0), Number.isFinite(d.caixaSobreCurtoPrazo) ? `caixa cobre ${formatarDecimal(d.caixaSobreCurtoPrazo)}× o que vence em 1 ano` : 'vence em até 1 ano', 'divida-curto-prazo')}
      ${cartao('Liquidez corrente', formatarDecimal(d.liquidezCorrente), 'curto prazo: tem ÷ deve', 'liquidez-corrente')}
      ${cartao('Z de Altman', formatarDecimal(d.zAltman), zona, 'z-altman')}
    </div>
    <p class="nota">Dívida = empréstimos, financiamentos e debêntures (sem arrendamentos). Resultado e
      custo financeiro dos últimos 12 meses; balanço da data do último documento.
      ${i.receitaPrevisivel ? 'Por ter receita contratada e corrigida pela inflação, esta empresa é avaliada com limites de dívida mais folgados (atenção acima de 4× o EBITDA; alto acima de 5×).' : ''}</p>`;
}

/** Texto sobre a sensibilidade da ação ao dólar e aos juros. */
function secaoExposicao(acao) {
  const s = acao.longoPrazo && acao.longoPrazo.sensibilidade;
  if (!s) {
    return '<p class="nota">Histórico curto demais (menos de 3 anos de cotações) para medir a sensibilidade ao dólar e aos juros.</p>';
  }
  const confianca = (fator) => (fator.direcao === 'neutra'
    ? 'A relação é fraca: pode ser só acaso, então a ação é considerada <strong>pouco sensível</strong>.'
    : 'A relação apareceu com consistência no período.');
  const dolar = s.dolar.coeficiente * 0.1;   // efeito de +10% no dólar
  const juros = s.juros.coeficiente;          // efeito de +1 ponto percentual
  const textoDolar = s.dolar.direcao === 'sobe' ? 'Costuma <strong class="positivo">ganhar</strong> com o dólar alto (típico de exportadoras e de quem fatura em dólar).'
    : s.dolar.direcao === 'cai' ? 'Costuma <strong class="negativo">perder</strong> com o dólar alto (típico de importadoras, de quem tem custos ou dívidas em dólar e de empresas voltadas ao consumo interno).'
      : '';
  const textoJuros = s.juros.direcao === 'cai' ? 'Costuma <strong class="negativo">sofrer</strong> com a alta dos juros (típico de empresas endividadas, de varejo, construção e de setores cujo valor depende de lucros distantes).'
    : s.juros.direcao === 'sobe' ? 'Costuma <strong class="positivo">ganhar</strong> com a alta dos juros (típico de bancos, seguradoras e empresas com muito caixa).'
      : '';
  return `
    <div class="cartao-resultado">
      <h3>Dólar ${botaoExplica('sensibilidade-dolar')}</h3>
      <p>Nos meses em que o dólar subiu 10%, a ação variou em média
        <strong>${percentualComSinal(dolar)}</strong> além do que a bolsa explicaria. ${textoDolar} ${confianca(s.dolar)}</p>
      <h3>Juros ${botaoExplica('sensibilidade-juros')}</h3>
      <p>Nos meses em que a Selic esperada pelo mercado para o ano seguinte subiu 1 ponto percentual, a ação variou em média
        <strong>${percentualComSinal(juros)}</strong> além do que a bolsa explicaria. ${textoJuros} ${confianca(s.juros)}</p>
      <h3>Bolsa ${botaoExplica('beta')}</h3>
      <p>Para cada 1% do Ibovespa, a ação variou em média ${formatarDecimal(s.mercado.coeficiente)}% (beta de 5 anos).</p>
    </div>
    <p class="nota">Medido com ${s.n} meses de retornos (até ${JANELA_SENSIBILIDADE / 12} anos), por regressão
      que separa o efeito do dólar, dos juros e da bolsa. É um retrato do passado: mudanças no negócio
      (venda de uma divisão, troca de dívida em dólar por reais) podem mudar o comportamento.</p>`;
}

/** Lista "em destaque" para o longo prazo, em linguagem direta. */
function destaques(acao, referencias) {
  const i = acao.indicadores;
  const l = acao.longoPrazo || {};
  const lp = referencias.longoPrazo || {};
  const itens = [];
  if (Number.isFinite(l.retorno5anos)) {
    const vsCdi = l.retorno5anos - lp.cdi5anos;
    itens.push(`Em 5 anos rendeu ${percentualComSinal(l.retorno5anos)} ao ano com proventos reinvestidos —
      ${vsCdi >= 0 ? `<span class="positivo">acima</span>` : `<span class="negativo">abaixo</span>`} do CDI
      (${percentualComSinal(lp.cdi5anos)}) e ${l.retorno5anos >= lp.ibovespa5anos ? 'acima' : 'abaixo'} do Ibovespa (${percentualComSinal(lp.ibovespa5anos)}).`);
  }
  if (Number.isFinite(i.crescimentoLucro)) {
    itens.push(i.crescimentoLucro >= 0
      ? `Lucro cresceu em média <span class="positivo">${formatarPercentual(i.crescimentoLucro, 1)}</span> ao ano nos últimos 5 anos.`
      : `Lucro caiu em média <span class="negativo">${formatarPercentual(-i.crescimentoLucro, 1)}</span> ao ano nos últimos 5 anos.`);
  }
  if (Number.isFinite(l.dividendYieldMedio5anos)) {
    itens.push(`Dividend Yield médio de ${formatarPercentual(l.dividendYieldMedio5anos, 1)} ao ano nos últimos 5 anos completos (hoje: ${formatarPercentual(i.dividendYield, 1)}).`);
  }
  if (i.nivelDivida) {
    itens.push(`Risco ligado à dívida: ${etiquetaDivida(acao)}${i.nivelDivida.motivos.length ? ` (${i.nivelDivida.motivos[0]})` : ''}.`);
  }
  const s = l.sensibilidade;
  if (s) {
    const partes = [];
    if (s.dolar.direcao !== 'neutra') partes.push(s.dolar.direcao === 'sobe' ? 'ganha com dólar alto' : 'perde com dólar alto');
    if (s.juros.direcao !== 'neutra') partes.push(s.juros.direcao === 'cai' ? 'sofre com juros altos' : 'ganha com juros altos');
    itens.push(partes.length ? `Costuma: ${partes.join('; ')}.` : 'Pouco sensível ao dólar e aos juros (além do movimento da bolsa).');
  }
  if (!itens.length) return '';
  return `
    <div class="cartao-resultado destaques">
      <h2>Em destaque para o longo prazo</h2>
      <ul class="observacoes">${itens.map((t) => `<li>${t}</li>`).join('')}</ul>
    </div>`;
}

function secaoProventos(acao, datas) {
  const ultimos = acao.proventos.slice().reverse();
  if (!ultimos.length) return '<p class="nota">Nenhum provento com data com nos últimos 12 meses.</p>';
  const maior = Math.max(...ultimos.map((p) => p[2]));
  const linhas = ultimos.map(([dataCom, pagamento, valor, tipo]) => `
    <tr>
      <td>${formatarData(dataCom)}</td>
      <td class="opcional">${pagamento ? formatarData(pagamento) : 'a definir'}</td>
      <td>${NOMES_PROVENTO[tipo] || tipo}</td>
      <td>${barra(valor, maior)}<strong>${formatarMoedaDetalhada(valor)}</strong></td>
      <td>${formatarPercentual(valor / precoNaData(acao.fechamentos, datas, dataCom), 2)}</td>
    </tr>`).join('');
  return `
    <div class="tabela-rolavel">
      <table class="tabela tabela-rendimentos">
        <thead><tr>
          <th>Data com ${botaoExplica('data-com')}</th>
          <th class="opcional">Pagamento</th>
          <th>Tipo ${botaoExplica('jcp')}</th>
          <th>Valor por ação</th>
          <th>% do preço</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p class="nota">Valores brutos: sobre o JCP há 15% de IR retido na fonte.
      <span class="so-celular">Gire o celular ou use o computador para ver as datas de pagamento.</span></p>`;
}

export function montarDetalhe(elemento, acao, todas, dados, macro, referencias, historico) {
  const precoHoje = detalheDoDia(acao.hoje, referencias.hoje, acao.indicadores.preco, dados.dataCotacao);
  const i = acao.indicadores;
  const empresa = acao.empresaDados;
  const f = empresa.fundamentos || {};
  const doze = f.dozeMeses || {};
  const bal = f.balanco || {};
  const outrasClasses = todas.filter((a) => a.empresa === acao.empresa && a.codigo !== acao.codigo);
  const setor = [empresa.setor, empresa.subsetor, empresa.segmento].filter(Boolean)
    .filter((v, k, lista) => lista.indexOf(v) === k).map(escapar).join(' › ');

  const avisos = [];
  if (!i.historicoCompleto) {
    avisos.push('Esta ação foi negociada em poucos pregões no último ano; os números de 12 meses ficam incompletos.');
  }
  if (!empresa.fundamentos) avisos.push('Não foi possível obter os balanços desta empresa na CVM.');
  // Lucro de 12 meses muito diferente da média recente costuma indicar um
  // efeito pontual (baixa contábil, venda de ativo); o P/L fica distorcido.
  const anuais = (f.anual || []).slice(-3).map((a) => a.lucro);
  const mediaRecente = anuais.length === 3 ? anuais.reduce((s, v) => s + v, 0) / 3 : NaN;
  if (mediaRecente > 0 && Number.isFinite(doze.lucro) && (doze.lucro < mediaRecente * 0.4 || doze.lucro > mediaRecente * 2.5)) {
    avisos.push(`O lucro dos últimos 12 meses (${formatarMoedaCompacta(doze.lucro)}) está muito diferente da média dos
      três últimos anos (${formatarMoedaCompacta(mediaRecente)}). Pode haver um efeito pontual nos balanços; P/L,
      ROE e payout podem estar distorcidos — veja os lucros ao longo dos anos.`);
  }
  if (i.payout > 1) {
    avisos.push('Os proventos dos últimos 12 meses superaram o lucro do período (payout acima de 100%), o que não costuma se sustentar.');
  }
  if (i.financeira) {
    avisos.push('Instituição financeira: margem líquida e dívida/EBITDA não se aplicam (a dívida faz parte do negócio de um banco). Para bancos, P/VP e ROE são os indicadores mais usados.');
  }
  const l = acao.longoPrazo || {};
  const lp = referencias.longoPrazo || {};

  elemento.innerHTML = `
    <p><a href="#/acoes">← Todas as ações</a></p>
    <h1>${acao.codigo} <span class="etiqueta">${NOMES_TIPO[acao.tipo] || acao.tipo}</span> ${botaoExplica('acao-on-pn')}
      ${botaoEstrela(acao.codigo, true)}</h1>
    <p class="introducao">${escapar(empresa.nome)} · ${setor}
      ${empresa.categoria && empresa.categoria.startsWith('Energia') ? `<br>Categoria: <strong>${escapar(empresa.categoria)}</strong> ${botaoExplica('categorias-energia')}` : ''}
      ${outrasClasses.length ? `<br>Também na lista: ${outrasClasses.map((a) => `<a href="#/acoes/${a.codigo}">${a.codigo}</a>`).join(', ')}` : ''}</p>
    ${avisos.map((a) => `<p class="aviso">${a}</p>`).join('')}

    <div class="grade-indicadores compacta">
      ${cartao('Preço', precoHoje.valor, precoHoje.detalhe, acao.hoje ? 'cotacao-intradiaria' : '')}
      ${cartao('P/L', textoPrecoLucro(i.precoLucro), Number.isFinite(doze.lucro) ? `lucro 12m: ${formatarMoedaCompacta(doze.lucro)}` : '', 'preco-lucro')}
      ${cartao('P/VP', formatarDecimal(i.precoValorPatrimonial), Number.isFinite(bal.patrimonioLiquido) ? `patrimônio: ${formatarMoedaCompacta(bal.patrimonioLiquido)}` : '', 'preco-valor-patrimonial')}
      ${cartao('Dividend Yield 12m', formatarPercentual(i.dividendYield, 2), `${formatarMoedaDetalhada(i.proventos12m)} por ação`, 'dividend-yield')}
      ${cartao('ROE', formatarPercentual(i.roe, 1), 'lucro ÷ patrimônio', 'roe')}
      ${i.financeira ? '' : cartao('Margem líquida', formatarPercentual(i.margemLiquida, 1), 'lucro ÷ receita', 'margem-liquida')}
      ${i.financeira ? '' : cartao('Dív. líquida / EBITDA', formatarDecimal(i.dividaLiquidaEbitda), Number.isFinite(i.ebitda) ? `EBITDA 12m: ${formatarMoedaCompacta(i.ebitda)}` : '', 'divida-ebitda')}
      ${cartao('Valor de mercado', formatarMoedaCompacta(i.valorMercado), 'todas as ações da empresa', 'valor-mercado')}
      ${cartao('Payout', formatarPercentual(i.payout, 0), 'do lucro distribuído', 'payout')}
      ${cartao('Liquidez diária', formatarMoedaCompacta(acao.liquidezMedia), 'média dos últimos 3 meses', 'liquidez-diaria')}
      ${cartao('Retorno em 5 anos', `${percentualComSinal(l.retorno5anos)} a.a.`, Number.isFinite(lp.cdi5anos) ? `CDI: ${formatarPercentual(lp.cdi5anos, 1)} a.a.` : '', 'retorno-anualizado')}
      ${i.nivelDivida ? cartao('Risco da dívida', NIVEIS_DIVIDA[i.nivelDivida.nivel].nome, 'veja Endividamento', 'nivel-endividamento') : ''}
    </div>

    ${destaques(acao, referencias)}

    ${historico && l.indice ? `
    <h2>Desempenho de longo prazo</h2>
    <p class="nota">Quanto teriam virado R$ 100 aplicados no início do período, com os proventos
      reinvestidos na própria ação ${botaoExplica('retorno-anualizado')}. Comparação com o Ibovespa
      (BOVA11) e o CDI.</p>
    <div class="espaco-grafico grafico-longo"></div>
    <div class="tabela-rolavel">
      <table class="tabela">
        <thead><tr><th>Média ao ano ${botaoExplica('retorno-anualizado')}</th><th>5 anos</th><th>10 anos</th></tr></thead>
        <tbody>
          <tr><td><strong>${acao.codigo}</strong> (com proventos)</td><td>${percentualComSinal(l.retorno5anos)}</td><td>${percentualComSinal(l.retorno10anos)}</td></tr>
          <tr><td>Ibovespa (BOVA11) ${botaoExplica('ibovespa')}</td><td>${percentualComSinal(lp.ibovespa5anos)}</td><td>${percentualComSinal(lp.ibovespa10anos)}</td></tr>
          <tr><td>CDI ${botaoExplica('cdi')}</td><td>${percentualComSinal(lp.cdi5anos)}</td><td>${percentualComSinal(lp.cdi10anos)}</td></tr>
        </tbody>
      </table>
    </div>` : ''}

    <h2>Resultados ao longo dos anos</h2>
    ${secaoResultados(acao)}

    <h2>Endividamento ${botaoExplica('nivel-endividamento')}</h2>
    ${secaoDivida(acao)}

    <h2>Dólar e juros</h2>
    ${secaoExposicao(acao)}

    <h2>Últimos 12 meses</h2>
    <p class="nota">Quanto teriam virado R$ 100 aplicados há um ano, com os proventos da ação somados
      (sem reinvestir) ${botaoExplica('retorno-total')}.</p>
    <div class="espaco-grafico"></div>
    <div class="cartao-resultado">
      ${linha(acao.codigo + ' (preço + proventos)', percentualComSinal(i.retornoTotal), 'retorno-total')}
      ${linha('Ibovespa (BOVA11)', percentualComSinal(referencias.ibovespa), 'ibovespa')}
      ${linha('CDI', percentualComSinal(referencias.cdi), 'cdi')}
    </div>

    <h2>Proventos ${botaoExplica('jcp')}</h2>
    ${secaoProventos(acao, dados.datas)}

    <h2>Risco</h2>
    <div class="cartao-resultado">
      ${linha('Volatilidade', `${formatarPercentual(i.volatilidade, 1)} a.a.`, 'volatilidade')}
      ${linha('Maior queda no período', percentualComSinal(i.quedaMaxima), 'drawdown')}
      ${linha('Beta (em relação ao Ibovespa)', formatarDecimal(i.beta), 'beta')}
      ${linha('Variação só do preço', percentualComSinal(i.variacaoPreco))}
    </div>

    ${empresa.fundamentos ? `
    <h2>Balanço ${botaoExplica('balancos-cvm')}</h2>
    <div class="cartao-resultado ficha">
      ${linha('Receita em 12 meses', i.financeira ? '—' : formatarMoedaCompacta(doze.receita))}
      ${linha('Lucro dos acionistas em 12 meses', formatarMoedaCompacta(doze.lucro))}
      ${linha('Patrimônio líquido', formatarMoedaCompacta(bal.patrimonioLiquido))}
      ${i.financeira ? '' : linha('Dívida bruta (empréstimos e financiamentos)', formatarMoedaCompacta(bal.dividaBruta))}
      ${i.financeira ? '' : linha('Caixa e aplicações', formatarMoedaCompacta(bal.caixa))}
      ${linha('Ações (fora da tesouraria)', formatarNumero((f.acoes.ordinarias || 0) + (f.acoes.preferenciais || 0), 0))}
      ${linha('Documento base', `${f.documento.tipo === 'DFP' ? 'Anual' : 'Trimestral'} de ${formatarData(f.documento.data)}${f.documento.consolidado ? ', consolidado' : ''}`)}
    </div>` : ''}

    <h2>Ficha da empresa</h2>
    <div class="cartao-resultado ficha">
      ${linha('Razão social', escapar(empresa.razaoSocial || empresa.nome))}
      ${empresa.cnpj ? linha('CNPJ', empresa.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')) : ''}
      ${linha('Setor', setor)}
      ${empresa.segmentoListagem ? linha('Segmento de listagem na B3', escapar(empresa.segmentoListagem)) : ''}
      ${empresa.site ? linha('Site', escapar(empresa.site)) : ''}
    </div>

    <p class="nota">Fontes: B3 (cotações e proventos) e CVM (demonstrações financeiras). Informação para
      estudo, não é recomendação de investimento. Rentabilidade passada não garante rentabilidade futura.</p>`;

  desenharDesempenho(elemento.querySelector('.espaco-grafico:not(.grafico-longo)'), acao, dados, macro);
  const espacoLongo = elemento.querySelector('.grafico-longo');
  if (espacoLongo) desenharLongoPrazo(espacoLongo, acao, historico);
  ligarEstrelas(elemento);
}

/** R$ 100 no início do histórico da ação: ação (com proventos), Ibovespa e CDI. */
function desenharLongoPrazo(espaco, acao, historico) {
  const { meses, fatores } = historico;
  const indice = acao.longoPrazo.indice;
  const inicio = indice.findIndex((v) => v !== null);
  const base = (serie) => {
    const primeiro = serie.slice(inicio).find((v) => v);
    return serie.map((v, k) => (k >= inicio && v ? (100 * v) / primeiro : null));
  };
  const series = [
    { nome: `${acao.codigo} (com proventos)`, cor: 'var(--cor-1)', valores: base(indice) },
    { nome: 'Ibovespa (BOVA11)', cor: 'var(--cor-2)', valores: base(fatores.ibovespa) },
    { nome: 'CDI', cor: 'var(--cor-neutra)', tracejado: true, valores: indiceCDI(fatores.cdi, inicio) },
  ];
  // Quando a ação multiplicou (ou perdeu) muito de valor, a escala comum
  // achataria as outras linhas: usamos a escala logarítmica e avisamos.
  const valores = series.flatMap((s) => s.valores).filter((v) => v > 0);
  const escalaLog = Math.max(...valores) / Math.min(...valores) > 8;
  if (escalaLog) {
    espaco.insertAdjacentHTML('beforebegin', `<p class="nota">Escala logarítmica: a mesma distância na
      vertical representa a mesma variação percentual (de 100 para 200 ocupa o mesmo espaço que de
      1.000 para 2.000). Usada porque os valores variaram muito no período.</p>`);
  }
  graficoMensal(espaco, meses, series, {
    formatarY: (v) => formatarMoeda(v), formatarEixoY: (v) => formatarNumero(v, 0), escalaLog,
  });
}

/** Linhas "R$ 100 viraram..." da ação, do Ibovespa e do CDI. */
function desenharDesempenho(espaco, acao, dados, macro) {
  const { datas } = dados;
  const inicio = acao.fechamentos.findIndex((p) => p);
  const precoInicial = acao.fechamentos[inicio];
  let recebidos = 0;
  const valoresAcao = datas.map((data, k) => {
    // Proventos cuja data com já passou contam como dinheiro recebido.
    recebidos = acao.proventos.filter((p) => p[0] >= datas[inicio] && p[0] <= data).reduce((s, p) => s + p[2], 0);
    const preco = acao.fechamentos[k];
    return k >= inicio && preco ? (100 * (preco + recebidos)) / precoInicial : null;
  });
  const mercado = dados.referencia.fechamentos;
  const baseMercado = mercado[inicio] || mercado.find((p) => p);
  const series = [
    { nome: acao.codigo, cor: 'var(--cor-1)', valores: valoresAcao },
    { nome: 'Ibovespa (BOVA11)', cor: 'var(--cor-2)', valores: mercado.map((p, k) => (k >= inicio && p ? (100 * p) / baseMercado : null)) },
  ];
  if (macro) {
    series.push({
      nome: 'CDI',
      cor: 'var(--cor-neutra)',
      tracejado: true,
      valores: datas.map((d, k) => (k >= inicio ? 100 * (1 + acumularTaxaAnual(macro.cdi.historico, datas[inicio], d)) : null)),
    });
  }
  graficoPorDatas(espaco, datas, series, {
    formatarY: (v) => formatarMoeda(v),
    formatarEixoY: (v) => formatarNumero(v, 0),
  });
}
