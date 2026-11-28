// =============================================================================
// Página de um fundo imobiliário: indicadores, gráfico de preço × valor
// patrimonial, rendimentos, composição da carteira, imóveis e vacância, risco
// e ficha cadastral.
// =============================================================================

import { botaoExplica } from '../../componentes/explica.js';
import { cartao, linhaResumo as linha, percentualComSinal, graficoPorDatas } from '../../componentes/blocos.js';
import { precoNaData } from '../../calc/mercado.js';
import { aliquotaIR } from '../../calc/impostos.js';
import {
  formatarMoeda, formatarMoedaCompacta, formatarMoedaDetalhada, formatarPercentual, formatarNumero,
  formatarDecimal, formatarData, formatarMesCurto,
} from '../../util/formatar.js';
import { escapar } from '../../util/dom.js';
import { detalheDoDia } from '../../componentes/hoje.js';

// Partes da carteira, na ordem e nas cores em que aparecem na barra.
const PARTES_CARTEIRA = [
  { chave: 'imoveis', nome: 'Imóveis', cor: 'var(--cor-1)' },
  { chave: 'titulos', nome: 'Títulos imobiliários (CRI, LCI…)', cor: 'var(--cor-2)' },
  { chave: 'fiis', nome: 'Cotas de outros FIIs', cor: 'var(--cor-4)' },
  { chave: 'caixa', nome: 'Caixa e renda fixa', cor: 'var(--cor-5)' },
  { chave: 'outros', nome: 'Outros', cor: 'var(--cor-neutra)' },
];

function secaoRendimentos(fundo, datas) {
  const { regularidade } = fundo.indicadores;
  const ultimos = fundo.rendimentos.slice(-12).reverse();
  if (!ultimos.length) return '<p class="nota">Nenhum rendimento informado nos últimos 12 meses.</p>';
  const maior = Math.max(...ultimos.map((r) => r[2]));
  const linhas = ultimos.map(([dataCom, pagamento, valor]) => {
    const preco = precoNaData(fundo.fechamentos, datas, dataCom);
    return `
      <tr>
        <td>${formatarData(dataCom)}</td>
        <td>${pagamento ? formatarData(pagamento) : '—'}</td>
        <td>
          <div class="barra-valor"><span style="width:${(valor / maior) * 100}%"></span></div>
          <strong>${formatarMoedaDetalhada(valor)}</strong>
        </td>
        <td>${formatarPercentual(valor / preco, 2)}</td>
      </tr>`;
  }).join('');
  const resumoRegularidade = regularidade.meses
    ? `Pagou em ${regularidade.meses} dos últimos 12 meses; por mês, entre ${formatarMoedaDetalhada(regularidade.minimo)}
       e ${formatarMoedaDetalhada(regularidade.maximo)} por cota (média de ${formatarMoedaDetalhada(regularidade.media)}).
       ${regularidade.variacao < 0.1 ? 'Pagamentos bastante estáveis.' : regularidade.variacao < 0.25 ? 'Pagamentos com alguma variação.' : 'Pagamentos com variação grande.'}`
    : '';
  return `
    <p>${resumoRegularidade} ${botaoExplica('regularidade-rendimentos')}</p>
    <div class="tabela-rolavel">
      <table class="tabela tabela-rendimentos">
        <thead><tr>
          <th>Data com ${botaoExplica('data-com')}</th>
          <th>Pagamento</th>
          <th>Valor por cota</th>
          <th>% do preço</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function secaoComposicao(composicao) {
  if (!composicao) return '<p class="nota">Composição da carteira não informada.</p>';
  const partes = PARTES_CARTEIRA.filter((p) => composicao[p.chave] >= 0.005);
  return `
    <div class="barra-composicao" role="img" aria-label="${partes.map((p) => `${p.nome}: ${formatarPercentual(composicao[p.chave], 0)}`).join(', ')}">
      ${partes.map((p) => `<span style="width:${composicao[p.chave] * 100}%;background:${p.cor}"></span>`).join('')}
    </div>
    <ul class="legenda-composicao">
      ${partes.map((p) => `
        <li><span class="amostra" style="background:${p.cor}"></span>${p.nome}
          <strong>${formatarPercentual(composicao[p.chave], 1)}</strong></li>`).join('')}
    </ul>`;
}

/** Texto curto da vacância para o cartão de indicadores. */
function cartaoVacancia(vacancia) {
  if (!vacancia) return '';
  const trimestre = formatarMesCurto(vacancia.trimestre);
  if (vacancia.suspeita) return cartao('Vacância física', '—', `informe de ${trimestre} inconsistente`, 'vacancia');
  return cartao('Vacância física', formatarPercentual(vacancia.fisica, 1), `área vazia, informe de ${trimestre}`, 'vacancia');
}

/** Seção com a vacância ao longo dos trimestres e os maiores imóveis. */
function secaoImoveis(vacancia) {
  if (!vacancia) return '';
  const trimestre = formatarMesCurto(vacancia.trimestre);
  let resumo;
  if (vacancia.suspeita) {
    resumo = `<p class="aviso">No informe de ${trimestre}, os números de vacância deste fundo parecem
      ser a <strong>ocupação</strong> (área alugada) e não a vacância — por isso a vacância física não é
      mostrada. Confira o número no relatório gerencial do fundo.</p>`;
  } else {
    const nivel = vacancia.fisica <= 0.05 ? 'baixa' : vacancia.fisica <= 0.15 ? 'moderada' : 'alta';
    resumo = `<p>Em ${trimestre}, <strong>${formatarPercentual(vacancia.fisica, 1)}</strong> da área dos
      ${formatarNumero(vacancia.quantidade, 0)} imóveis prontos para aluguel estava vazia — vacância ${nivel}.</p>`;
  }
  const historico = vacancia.historico.length > 1 ? `
    <p class="nota">Nos trimestres anteriores:
      ${vacancia.historico.map(([data, valor]) => `${formatarMesCurto(data)} <strong>${formatarPercentual(valor, 1)}</strong>`).join(' · ')}</p>` : '';
  const linhas = vacancia.imoveis.map(([nome, area, vazio]) => `
    <tr>
      <td>${escapar(nome)}</td>
      <td class="opcional">${area ? `${formatarNumero(area, 0)} m²` : '—'}</td>
      <td>${Number.isFinite(vazio) && !vacancia.suspeita ? `
        <div class="barra-valor negativa"><span style="width:${vazio * 100}%"></span></div>
        <strong>${formatarPercentual(vazio, 0)}</strong>` : (Number.isFinite(vazio) ? formatarPercentual(vazio, 0) : '—')}</td>
    </tr>`).join('');
  const restantes = vacancia.quantidade - vacancia.imoveis.length;
  return `
    <h2>Imóveis e vacância ${botaoExplica('vacancia')}</h2>
    ${resumo}
    ${historico}
    <div class="tabela-rolavel">
      <table class="tabela tabela-imoveis">
        <thead><tr><th>Imóvel</th><th class="opcional">Área</th><th>${vacancia.suspeita ? 'Valor informado' : 'Vacância'}</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p class="nota">${restantes > 0 ? `Os ${vacancia.imoveis.length} maiores imóveis, por área (há mais ${restantes}). ` : ''}Dados
      informados pelo fundo à CVM no informe trimestral (área bruta locável). Os relatórios do próprio
      fundo podem trazer números mais recentes ou a vacância financeira.</p>`;
}

export function montarDetalhe(elemento, fundo, dados, macro, doDia) {
  const precoHoje = detalheDoDia(fundo.hoje, doDia, fundo.indicadores.preco, dados.dataCotacao);
  const i = fundo.indicadores;
  const { informe } = fundo;
  const ultimoRendimento = fundo.rendimentos[fundo.rendimentos.length - 1];
  const taxaAdmAnual = Number.isFinite(informe.taxaAdministracaoMes) ? informe.taxaAdministracaoMes * 12 : NaN;

  // Referência para o Dividend Yield: o CDI depois do IR de aplicações longas.
  // (Os rendimentos de FII são isentos para pessoa física.)
  const irLongo = aliquotaIR(721);
  const comparacaoCDI = macro && Number.isFinite(i.dividendYield) ? `
    <p class="nota">Para comparar: o CDI está em ${formatarNumero(macro.cdi.valor)}% ao ano ${botaoExplica('cdi')};
      descontado o IR de ${formatarPercentual(irLongo, 0)}, fica em cerca de
      ${formatarNumero(macro.cdi.valor * (1 - irLongo))}%. O Dividend Yield olha só a renda paga
      no passado — o preço da cota também varia (veja o retorno total abaixo).</p>` : '';

  const avisoHistorico = i.historicoCompleto ? '' : `
    <p class="aviso">Este fundo foi negociado em poucos pregões no último ano (listagem recente ou
      pouca negociação). Os indicadores de 12 meses ficam incompletos.</p>`;

  elemento.innerHTML = `
    <p><a href="#/fiis">← Todos os FIIs</a></p>
    <h1>${fundo.codigo} <span class="etiqueta">${escapar(fundo.tipo)}</span></h1>
    <p class="introducao">${escapar(fundo.nome)}</p>
    ${avisoHistorico}

    <div class="grade-indicadores compacta">
      ${cartao('Preço da cota', precoHoje.valor, precoHoje.detalhe, fundo.hoje ? 'cotacao-intradiaria' : '')}
      ${cartao('Dividend Yield 12m', formatarPercentual(i.dividendYield, 2), `${formatarMoedaDetalhada(i.rendimentos12m)} por cota em 12 meses`, 'dividend-yield')}
      ${cartao('P/VP', formatarDecimal(i.pvp), `valor patrimonial: ${formatarMoeda(informe.valorPatrimonialCota)}`, 'preco-valor-patrimonial')}
      ${ultimoRendimento ? cartao('Último rendimento', formatarMoedaDetalhada(ultimoRendimento[2]),
        `data com ${formatarData(ultimoRendimento[0])}${ultimoRendimento[1] ? `, pago em ${formatarData(ultimoRendimento[1])}` : ''}`, 'rendimento-fii') : ''}
      ${cartaoVacancia(fundo.vacancia)}
      ${cartao('Liquidez diária', formatarMoedaCompacta(fundo.liquidezMedia), 'média dos últimos 3 meses', 'liquidez-diaria')}
      ${cartao('Patrimônio líquido', formatarMoedaCompacta(informe.patrimonioLiquido), `${formatarNumero(informe.cotasEmitidas, 0)} cotas`, 'valor-patrimonial-cota')}
      ${cartao('Cotistas', formatarNumero(informe.cotistas, 0), informe.mes ? `em ${formatarMesCurto(informe.mes)}` : '', 'cotistas')}
      ${cartao('Taxa de administração', Number.isFinite(taxaAdmAnual) ? `~${formatarPercentual(taxaAdmAnual, 2)} a.a.` : '—', 'do patrimônio, estimada pelo mês', 'taxa-administracao')}
    </div>
    ${comparacaoCDI}

    <h2>Preço × valor patrimonial</h2>
    <p class="nota">Quando a linha do preço fica abaixo da linha do valor patrimonial, a cota é
      negociada com desconto (P/VP menor que 1). Preços ajustados por desdobramentos e grupamentos.</p>
    <div class="espaco-grafico"></div>

    <h2>Rendimentos ${botaoExplica('rendimento-fii')}</h2>
    ${secaoRendimentos(fundo, dados.datas)}

    <h2>Onde o fundo investe ${botaoExplica('composicao-fii')}</h2>
    <p class="nota">Tipo pela carteira: <strong>${escapar(fundo.tipo)}</strong> ${botaoExplica('tipo-fii')}.
      Segmento declarado pelo fundo: ${escapar(fundo.segmento)}.</p>
    ${secaoComposicao(fundo.composicao)}

    ${secaoImoveis(fundo.vacancia)}

    <h2>Risco e retorno em 12 meses</h2>
    <div class="cartao-resultado">
      ${linha('Variação do preço da cota', percentualComSinal(i.variacaoPreco))}
      ${linha('Retorno total (preço + rendimentos)', percentualComSinal(i.retornoTotal), 'retorno-total')}
      ${linha('Volatilidade', formatarPercentual(i.volatilidade, 1) + ' a.a.', 'volatilidade')}
      ${linha('Maior queda no período', percentualComSinal(i.quedaMaxima), 'drawdown')}
    </div>

    <h2>Ficha do fundo</h2>
    <div class="cartao-resultado ficha">
      ${linha('CNPJ', escapar(fundo.cnpj))}
      ${linha('Administrador', escapar(fundo.administrador))}
      ${fundo.gestao ? linha('Gestão', escapar(fundo.gestao)) : ''}
      ${fundo.inicio ? linha('Em funcionamento desde', formatarData(fundo.inicio)) : ''}
      ${linha('Último informe à CVM', informe.mes ? formatarMesCurto(informe.mes) : '—')}
    </div>

    <p class="nota">Fontes: B3 (cotações e rendimentos) e CVM (informes mensais e trimestrais). Informação para
      estudo, não é recomendação de investimento. Rentabilidade passada não garante rentabilidade futura.</p>`;

  desenharGraficoPrecos(elemento.querySelector('.espaco-grafico'), fundo, dados.datas);
}

function desenharGraficoPrecos(espaco, fundo, datas) {
  // O valor patrimonial é mensal; cada dia usa o do mês correspondente
  // (ou o mais recente já informado), formando uma linha em "degraus".
  const vpPorMes = Object.fromEntries(fundo.historicoVP);
  let vpAtual = null;
  const vps = datas.map((data) => {
    if (vpPorMes[data.slice(0, 7)]) vpAtual = vpPorMes[data.slice(0, 7)];
    return vpAtual;
  });
  graficoPorDatas(espaco, datas, [
    { nome: 'Preço da cota', cor: 'var(--cor-1)', valores: fundo.fechamentos },
    { nome: 'Valor patrimonial por cota', cor: 'var(--cor-3)', valores: vps, tracejado: true },
  ], { formatarY: formatarMoeda });
}
