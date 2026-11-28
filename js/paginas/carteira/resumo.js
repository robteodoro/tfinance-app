// =============================================================================
// Aba "Resumo": quanto a carteira vale, quanto rendeu (comparado ao CDI),
// como está dividida, como evoluiu e a lista de posições e proventos.
// =============================================================================

import { botaoExplica } from '../../componentes/explica.js';
import { cartao, linhaResumo, percentualComSinal, graficoPorDatas } from '../../componentes/blocos.js';
import {
  formatarMoeda, formatarMoedaDetalhada, formatarPercentual, formatarNumero, formatarData,
} from '../../util/formatar.js';
import { escapar } from '../../util/dom.js';
import { descreverTaxa } from '../rendafixa/comum.js';
import { CLASSES, evolucaoSemanal } from './visao.js';

function telaVazia(elemento, pagina) {
  elemento.innerHTML = `
    <div class="cartao-resultado boas-vindas">
      <h2>Sua carteira está vazia</h2>
      <p>Comece registrando seus investimentos: compras de ações, FIIs e ETFs, aplicações de renda
        fixa (CDB, LCI, Tesouro…) e outros bens, como previdência. Depois o Tfinance mostra quanto
        tudo vale hoje, quanto rendeu comparado ao CDI e qual o risco do conjunto.</p>
      <div class="botoes">
        <button type="button" class="botao-principal" data-ir="lancamentos">Registrar meu primeiro investimento</button>
        <button type="button" class="botao-secundario" data-exemplo>Ver uma carteira de exemplo</button>
      </div>
      <p class="nota">Os dados ficam guardados apenas neste navegador. Use a aba Backup para copiá-los
        para outro aparelho.</p>
    </div>`;
  elemento.querySelector('[data-exemplo]').addEventListener('click', pagina.carregarExemplo);
}

function barraClasses(visao) {
  const partes = Object.keys(CLASSES).filter((c) => visao.porClasse[c] > 0);
  return `
    <div class="barra-composicao" role="img" aria-label="${partes.map((c) => `${CLASSES[c].nome}: ${formatarPercentual(visao.porClasse[c] / visao.total, 0)}`).join(', ')}">
      ${partes.map((c) => `<span style="width:${(visao.porClasse[c] / visao.total) * 100}%;background:${CLASSES[c].cor}"></span>`).join('')}
    </div>
    <ul class="legenda-composicao">
      ${partes.map((c) => `
        <li><span class="amostra" style="background:${CLASSES[c].cor}"></span>${CLASSES[c].nome}
          <strong>${formatarMoeda(visao.porClasse[c])} · ${formatarPercentual(visao.porClasse[c] / visao.total, 1)}</strong></li>`).join('')}
    </ul>`;
}

function tabelaPosicoes(visao) {
  const linhas = visao.itens.map((i) => {
    const ganho = i.valor - i.custo;
    const nome = i.link ? `<a href="${i.link}"><strong>${escapar(i.nome)}</strong></a>` : `<strong>${escapar(i.nome)}</strong>`;
    let detalhe = escapar(i.descricao);
    if (i.classe === 'rendaFixa') {
      detalhe = `${descreverTaxa(i.aplicacao.indexador, i.aplicacao.taxa)} · desde ${formatarData(i.aplicacao.data)}`;
    } else if (i.quantidade) {
      detalhe = `${formatarNumero(i.quantidade, 0)} × ${formatarMoeda(i.preco)} · preço médio ${formatarMoeda(i.precoMedio)}`;
      if (i.semCotacao) detalhe = `${formatarNumero(i.quantidade, 0)} · sem cotação (valor pelo custo)`;
    }
    return `
      <tr>
        <td><span class="amostra" style="background:${CLASSES[i.classe].cor}"></span>${nome}<br><small>${detalhe}</small></td>
        <td>${formatarMoeda(i.valor)}</td>
        <td>${i.classe === 'outro' ? '—' : `${percentualComSinal(i.custo ? ganho / i.custo : NaN)}<br><small>${formatarMoeda(ganho)}</small>`}</td>
        <td class="opcional">${formatarPercentual(i.peso, 1)}</td>
      </tr>`;
  }).join('');
  return `
    <div class="tabela-rolavel">
      <table class="tabela tabela-ativos tabela-posicoes">
        <thead><tr><th>Investimento</th><th>Valor hoje</th><th>Ganho ${botaoExplica('preco-medio')}</th><th class="opcional">Peso</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p class="nota">Renda fixa: valor estimado pelas taxas contratadas e pelas taxas do Banco Central
      de cada mês, já descontados IR, IOF e custódia (o que você receberia resgatando hoje). Não considera
      a marcação a mercado ${botaoExplica('marcacao-mercado')}. Ganho de ações e FIIs sem contar os proventos.</p>`;
}

function listaProventos(visao) {
  if (!visao.proventos.length) return '';
  const linhas = visao.proventos.slice(0, 24).map((p) => `
    <tr>
      <td>${p.codigo}</td>
      <td>${formatarData(p.dataCom)}</td>
      <td class="opcional">${p.pagamento ? formatarData(p.pagamento) : 'a definir'}</td>
      <td class="opcional">${formatarNumero(p.quantidade, 0)} × ${formatarMoedaDetalhada(p.valor)}</td>
      <td><strong>${formatarMoeda(p.total)}</strong></td>
    </tr>`).join('');
  return `
    <h2>Proventos recebidos ${botaoExplica('jcp')}</h2>
    <p>Nos últimos 12 meses: <strong>${formatarMoeda(visao.proventos12m)}</strong>
      (média de ${formatarMoeda(visao.proventos12m / 12)} por mês).</p>
    <div class="tabela-rolavel">
      <table class="tabela tabela-rendimentos">
        <thead><tr><th>Ativo</th><th>Data com</th><th class="opcional">Pagamento</th><th class="opcional">Cálculo</th><th>Total</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p class="nota">Calculados pela quantidade que você tinha em cada data com. Só para ações e FIIs
      acompanhados nas seções do Tfinance (os mais negociados); valores brutos.</p>`;
}

export function montarResumo(elemento, pagina) {
  const { carteira, visao, dados } = pagina;
  if (!visao.itens.length && !carteira.operacoes.length && !carteira.rendaFixa.length) {
    telaVazia(elemento, pagina);
    return;
  }

  const diferencaCDI = visao.totalInvestimentos - visao.seFosseCDI;
  elemento.innerHTML = `
    <div class="grade-indicadores compacta">
      ${cartao('Patrimônio total', formatarMoeda(visao.total), visao.doDia ? `preços de hoje às ${visao.doDia.horario}` : `preços de ${formatarData(visao.hoje)}`)}
      ${visao.doDia ? cartao('Hoje', `<span class="${visao.doDia.variacao < 0 ? 'negativo' : 'positivo'}">${visao.doDia.variacao < 0 ? '−' : '+'}${formatarMoeda(Math.abs(visao.doDia.variacao))}</span>`,
        `variação no pregão até ${visao.doDia.horario} (${visao.doDia.ativos} ${visao.doDia.ativos === 1 ? 'ativo' : 'ativos'} com cotação do dia)`, 'cotacao-intradiaria') : ''}
      ${cartao('Ganho dos investimentos', `<span class="${visao.ganhoTotal < 0 ? 'negativo' : 'positivo'}">${formatarMoeda(visao.ganhoTotal)}</span>`,
        'valor hoje + vendas + proventos − aplicado', 'rentabilidade-carteira')}
      ${cartao('Se fosse no CDI', formatarMoeda(visao.seFosseCDI), `mesmas datas e valores, 100% do CDI bruto`, 'rentabilidade-carteira')}
      ${cartao('Proventos em 12 meses', formatarMoeda(visao.proventos12m), `${formatarMoeda(visao.proventos12m / 12)} por mês em média`, 'jcp')}
    </div>
    <p class="frase-comparacao">Seus investimentos valem <strong>${formatarMoeda(visao.totalInvestimentos)}</strong>.
      Se o mesmo dinheiro, nas mesmas datas, tivesse ficado em 100% do CDI, valeria
      <strong>${formatarMoeda(visao.seFosseCDI)}</strong> — ${diferencaCDI >= 0
    ? `<span class="positivo">${formatarMoeda(diferencaCDI)} a favor da sua carteira</span>`
    : `<span class="negativo">${formatarMoeda(-diferencaCDI)} a menos na sua carteira</span>`}.
      <small>(Comparação aproximada: o CDI aparece antes de IR e os proventos não entram.)</small></p>

    <h2>Como está dividida</h2>
    ${barraClasses(visao)}

    ${dados.cotacoes ? `
      <h2>Evolução no último ano</h2>
      <p class="nota">Valor dos seus investimentos em cada semana (sem os "outros bens"), comparado ao
        dinheiro aplicado e ao que teria rendido no CDI.</p>
      <div class="espaco-grafico"></div>` : ''}

    <h2>Posições</h2>
    ${tabelaPosicoes(visao)}

    <div class="cartao-resultado">
      ${linhaResumo('Resultado de vendas e resgates já feitos', `<span class="${visao.lucroRealizado < 0 ? 'negativo' : 'positivo'}">${formatarMoeda(visao.lucroRealizado)}</span>`)}
      ${linhaResumo('Dinheiro aplicado (entradas − saídas)', formatarMoeda(visao.aplicadoLiquido))}
    </div>

    ${listaProventos(visao)}`;

  const espaco = elemento.querySelector('.espaco-grafico');
  if (espaco) {
    const evolucao = evolucaoSemanal(carteira, visao, dados);
    const inicio = evolucao.findIndex((e) => e.valor > 0 || e.aplicado > 0);
    const visivel = (lista) => lista.map((v, k) => (k >= inicio ? v : null));
    graficoPorDatas(espaco, dados.cotacoes.semanas, [
      { nome: 'Seus investimentos', cor: 'var(--cor-1)', valores: visivel(evolucao.map((e) => e.valor)) },
      { nome: 'Dinheiro aplicado', cor: 'var(--cor-neutra)', valores: visivel(evolucao.map((e) => e.aplicado)), tracejado: true },
      { nome: 'Se fosse no CDI', cor: 'var(--cor-2)', valores: visivel(evolucao.map((e) => e.cdi)), tracejado: true },
    ], { formatarY: formatarMoeda, formatarEixoY: (v) => v.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }) });
  }
}
