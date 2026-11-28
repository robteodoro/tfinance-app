// =============================================================================
// Aba "Comparar": várias aplicações lado a lado, com o mesmo valor e prazo.
// As opções escolhidas ficam salvas no navegador.
// =============================================================================

import { PRODUTOS } from '../../config/produtos.js';
import { taxaBrutaAnual, percentualCDIEquivalente } from '../../calc/taxas.js';
import { simular } from '../../calc/rendafixa.js';
import { botaoExplica } from '../../componentes/explica.js';
import { desenharGrafico } from '../../componentes/grafico.js';
import { formatarMoeda, formatarPercentual, formatarNumero, formatarPrazo } from '../../util/formatar.js';
import { aoParar, escapar } from '../../util/dom.js';
import { lerSalvo, salvar } from '../../util/armazenamento.js';
import {
  campoNumero, campoPrazo, prazoEmDias, opcoesProdutos, opcoesIndexadores,
  ligarProdutoIndexador, lerCampo, descreverTaxa,
} from './comum.js';

const MAXIMO_OPCOES = 6;
const CORES = ['var(--cor-1)', 'var(--cor-2)', 'var(--cor-3)', 'var(--cor-4)', 'var(--cor-5)', 'var(--cor-6)'];

// Exemplo inicial, mostrando o efeito da isenção e da custódia.
const OPCOES_INICIAIS = [
  { produto: 'cdb', indexador: 'cdi', taxa: 1.10 },
  { produto: 'lci_lca', indexador: 'cdi', taxa: 0.92 },
  { produto: 'tesouro_selic', indexador: 'selic', taxa: 0.0005 },
  { produto: 'tesouro_ipca', indexador: 'ipca', taxa: 0.075 },
  { produto: 'poupanca', indexador: 'poupanca', taxa: 0 },
];

function linhaOpcao(opcao, indice) {
  return `
    <div class="linha-opcao" data-indice="${indice}">
      <span class="amostra grande" style="background:${CORES[indice]}"></span>
      <label class="campo">
        <span class="rotulo">Produto</span>
        <select name="produto">${opcoesProdutos(opcao.produto)}</select>
      </label>
      <label class="campo">
        <span class="rotulo">Rentabilidade</span>
        <select name="indexador">${opcoesIndexadores(opcao.produto, opcao.indexador)}</select>
      </label>
      ${campoNumero({ nome: 'taxa', rotulo: 'Taxa', valor: formatarNumero(opcao.taxa * 100, 2) })}
      <button type="button" class="botao-remover" data-remover aria-label="Remover opção">✕</button>
    </div>`;
}

export function montarComparar(elemento, contexto) {
  let opcoes = lerSalvo('comparar-opcoes', OPCOES_INICIAIS);

  elemento.innerHTML = `
    <form class="formulario" autocomplete="off" onsubmit="return false">
      <div class="grade-campos">
        ${campoNumero({ nome: 'valorInicial', rotulo: 'Aplicação inicial', valor: '10.000', sufixo: 'R$' })}
        ${campoNumero({ nome: 'aporteMensal', rotulo: 'Aporte mensal', valor: '0', sufixo: 'R$', explica: 'aporte-mensal' })}
        ${campoPrazo({ valor: 3, unidade: 'anos' })}
      </div>
      <h3>Opções a comparar</h3>
      <div class="lista-opcoes"></div>
      <button type="button" class="botao-secundario" data-adicionar>+ Adicionar opção</button>
    </form>
    <div class="resultado" aria-live="polite"></div>`;

  const formulario = elemento.querySelector('form');
  const lista = elemento.querySelector('.lista-opcoes');
  const resultado = elemento.querySelector('.resultado');
  const botaoAdicionar = elemento.querySelector('[data-adicionar]');
  const recalcular = aoParar(atualizar, 200);

  function desenharLista() {
    lista.innerHTML = opcoes.map(linhaOpcao).join('');
    lista.querySelectorAll('.linha-opcao').forEach((linha) => ligarProdutoIndexador(linha, recalcular));
    botaoAdicionar.hidden = opcoes.length >= MAXIMO_OPCOES;
  }

  /** Lê as opções da tela (o que o usuário digitou) e salva no navegador. */
  function lerOpcoes() {
    opcoes = [...lista.querySelectorAll('.linha-opcao')].map((linha) => ({
      produto: linha.querySelector('[name="produto"]').value,
      indexador: linha.querySelector('[name="indexador"]').value,
      taxa: lerCampo(linha, 'taxa') / 100 || 0,
    }));
    salvar('comparar-opcoes', opcoes);
    return opcoes;
  }

  formulario.addEventListener('input', recalcular);
  formulario.addEventListener('change', recalcular);
  formulario.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-remover]') && opcoes.length > 1) {
      const indice = Number(evento.target.closest('.linha-opcao').dataset.indice);
      lerOpcoes();
      opcoes.splice(indice, 1);
      salvar('comparar-opcoes', opcoes);
      desenharLista();
      atualizar();
    }
    if (evento.target.closest('[data-adicionar]')) {
      lerOpcoes();
      opcoes.push({ produto: 'cdb', indexador: 'cdi', taxa: 1 });
      desenharLista();
      atualizar();
    }
  });

  function atualizar() {
    const valorInicial = lerCampo(formulario, 'valorInicial');
    const aporteMensal = lerCampo(formulario, 'aporteMensal');
    const dias = prazoEmDias(lerCampo(formulario, 'prazo'), formulario['prazo-unidade'].value);
    const valido = [valorInicial, aporteMensal, dias].every((v) => Number.isFinite(v) && v >= 0);
    if (!valido || dias < 1 || valorInicial + aporteMensal === 0) {
      resultado.innerHTML = '<p class="aviso">Informe valores válidos para aplicação, aporte e prazo.</p>';
      return;
    }

    const { cenario } = contexto;
    const resultados = lerOpcoes().map((opcao, indice) => {
      const produto = PRODUTOS[opcao.produto];
      const taxaAnual = taxaBrutaAnual(opcao.indexador, opcao.taxa, cenario);
      const simulacao = simular({ produto, taxaAnual, dias, valorInicial, aporteMensal, inflacaoAnual: cenario.ipca });
      return {
        indice, produto, taxaAnual, simulacao,
        nome: `${produto.nome} — ${descreverTaxa(opcao.indexador, opcao.taxa)}`,
      };
    });

    const ordenados = [...resultados].sort((a, b) => b.simulacao.resumo.valorLiquido - a.simulacao.resumo.valorLiquido);
    const melhor = ordenados[0].simulacao.resumo.valorLiquido;

    const linhas = ordenados.map((r, posicao) => {
      const s = r.simulacao.resumo;
      const descontos = s.ir + s.iof + s.custodia;
      return `
        <tr class="${posicao === 0 ? 'melhor' : ''}">
          <td><span class="amostra" style="background:${CORES[r.indice]}"></span>${escapar(r.nome)}</td>
          <td>${formatarPercentual(r.taxaAnual)}</td>
          <td>${descontos > 0 ? '− ' + formatarMoeda(descontos) : 'isento'}</td>
          <td><strong>${formatarMoeda(s.valorLiquido)}</strong></td>
          <td>${formatarPercentual(s.taxaLiquidaAnual)}</td>
          <td>${formatarNumero(percentualCDIEquivalente(s.taxaLiquidaAnual, cenario.cdi) * 100, 1)}%</td>
          <td>${formatarMoeda(s.valorLiquidoReal)}</td>
          <td>${posicao === 0 ? 'melhor opção' : '− ' + formatarMoeda(melhor - s.valorLiquido)}</td>
        </tr>`;
    }).join('');

    resultado.innerHTML = `
      <p class="frase">Resultado em ${formatarPrazo(dias)}, total investido de
        ${formatarMoeda(resultados[0].simulacao.resumo.totalInvestido)}:</p>
      <div class="tabela-rolavel">
        <table class="tabela">
          <thead><tr>
            <th>Opção</th>
            <th>Bruta a.a.</th>
            <th>IR, IOF e custódia ${botaoExplica('imposto-renda')}</th>
            <th>Valor líquido</th>
            <th>Líquida a.a. ${botaoExplica('rentabilidade-liquida')}</th>
            <th>Líquida em % do CDI</th>
            <th>Em reais de hoje ${botaoExplica('valor-real')}</th>
            <th>Diferença</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      <div class="espaco-grafico"></div>
      <p class="nota">Valores líquidos considerando resgate ao final do prazo. Prefixados e IPCA+
        vendidos antes do vencimento sofrem marcação a mercado ${botaoExplica('marcacao-mercado')}.</p>`;

    desenharGrafico(resultado.querySelector('.espaco-grafico'), {
      series: resultados.map((r) => ({
        nome: r.nome,
        cor: CORES[r.indice],
        pontos: r.simulacao.serie.map((p) => ({ x: p.mes, y: p.liquido })),
      })),
      formatarX: (mes) => `mês ${formatarNumero(mes, 0)}`,
      formatarY: formatarMoeda,
    });
  }

  desenharLista();
  return {
    atualizar,
    prazoDias: () => prazoEmDias(lerCampo(formulario, 'prazo'), formulario['prazo-unidade'].value),
  };
}
