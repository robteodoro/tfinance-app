// =============================================================================
// Aba "Simular": uma aplicação, com três perguntas possíveis:
//   - Quanto vou ter?               (valor futuro)
//   - Quanto aplicar hoje?          (valor presente)
//   - Quanto aplicar por mês?       (aporte necessário)
// =============================================================================

import { PRODUTOS } from '../../config/produtos.js';
import { taxaBrutaAnual, percentualCDIEquivalente } from '../../calc/taxas.js';
import { simular, valorInicialNecessario, aporteMensalNecessario, DIAS_POR_MES } from '../../calc/rendafixa.js';
import { botaoExplica } from '../../componentes/explica.js';
import { desenharGrafico } from '../../componentes/grafico.js';
import { formatarMoeda, formatarPercentual, formatarPrazo, formatarNumero } from '../../util/formatar.js';
import { aoParar } from '../../util/dom.js';
import {
  campoNumero, campoPrazo, prazoEmDias, opcoesProdutos, opcoesIndexadores,
  ligarProdutoIndexador, lerCampo, descreverTaxa,
} from './comum.js';

const OBJETIVOS = {
  futuro: { titulo: 'Quanto vou ter?', explica: 'valor-futuro' },
  presente: { titulo: 'Quanto aplicar hoje?', explica: 'valor-presente' },
  aporte: { titulo: 'Quanto aplicar por mês?', explica: 'aporte-mensal' },
};

// Quais campos aparecem em cada objetivo.
const CAMPOS_POR_OBJETIVO = {
  futuro: ['valorInicial', 'aporteMensal'],
  presente: ['aporteMensal', 'meta'],
  aporte: ['valorInicial', 'meta'],
};

export function montarSimular(elemento, contexto) {
  elemento.innerHTML = `
    <form class="formulario" autocomplete="off" onsubmit="return false">
      <fieldset class="objetivos">
        <legend>O que você quer saber?</legend>
        ${Object.entries(OBJETIVOS).map(([chave, o], i) => `
          <label class="opcao-objetivo">
            <input type="radio" name="objetivo" value="${chave}" ${i === 0 ? 'checked' : ''}>
            <span>${o.titulo}</span>
          </label>`).join('')}
      </fieldset>

      <div class="grade-campos">
        <label class="campo">
          <span class="rotulo">Produto ${botaoExplica('renda-fixa')}</span>
          <select name="produto">${opcoesProdutos('cdb')}</select>
        </label>
        <label class="campo">
          <span class="rotulo">Rentabilidade</span>
          <select name="indexador">${opcoesIndexadores('cdb', 'cdi')}</select>
        </label>
        ${campoNumero({ nome: 'taxa', rotulo: 'Percentual do CDI (%)', valor: '100' })}
        ${campoPrazo({ valor: 2, unidade: 'anos' })}
        ${campoNumero({ nome: 'valorInicial', rotulo: 'Aplicação inicial', valor: '10.000', sufixo: 'R$' })}
        ${campoNumero({ nome: 'aporteMensal', rotulo: 'Aporte mensal', valor: '0', sufixo: 'R$', explica: 'aporte-mensal' })}
        ${campoNumero({ nome: 'meta', rotulo: 'Valor desejado (líquido)', valor: '100.000', sufixo: 'R$' })}
        <label class="campo campo-caixa" data-campo="meta-real">
          <input type="checkbox" name="metaReal">
          <span>Valor desejado em reais de hoje (corrigir pela inflação) ${botaoExplica('valor-real')}</span>
        </label>
      </div>
    </form>
    <div class="resultado" aria-live="polite"></div>`;

  const formulario = elemento.querySelector('form');
  const resultado = elemento.querySelector('.resultado');
  const recalcular = aoParar(atualizar, 200);

  formulario.addEventListener('input', recalcular);
  formulario.addEventListener('change', recalcular);
  ligarProdutoIndexador(formulario, recalcular);

  function lerFormulario() {
    const objetivo = formulario.objetivo.value;
    const produtoChave = formulario.produto.value;
    const indexador = formulario.indexador.value;
    const taxa = indexador === 'poupanca' ? 0 : lerCampo(formulario, 'taxa') / 100;
    const prazo = lerCampo(formulario, 'prazo');
    const unidade = formulario['prazo-unidade'].value;
    const visiveis = CAMPOS_POR_OBJETIVO[objetivo];
    const ler = (nome) => (visiveis.includes(nome) ? lerCampo(formulario, nome) : 0);
    return {
      objetivo, produtoChave, indexador, taxa,
      dias: Math.round(prazoEmDias(prazo, unidade) * 1000) / 1000,
      valorInicial: ler('valorInicial'),
      aporteMensal: ler('aporteMensal'),
      meta: ler('meta'),
      metaReal: formulario.metaReal.checked,
    };
  }

  function mostrarCamposDoObjetivo(objetivo) {
    for (const nome of ['valorInicial', 'aporteMensal', 'meta']) {
      formulario.querySelector(`[data-campo="${nome}"]`).hidden = !CAMPOS_POR_OBJETIVO[objetivo].includes(nome);
    }
    formulario.querySelector('[data-campo="meta-real"]').hidden = objetivo === 'futuro';
  }

  function atualizar() {
    const f = lerFormulario();
    mostrarCamposDoObjetivo(f.objetivo);

    // A taxa pode ser negativa (ex.: Tesouro Selic com deságio); os demais valores não.
    const valoresValidos = [f.dias, f.valorInicial, f.aporteMensal, f.meta].every((v) => Number.isFinite(v) && v >= 0);
    if (!valoresValidos || !Number.isFinite(f.taxa) || f.taxa <= -1 || f.dias < 1) {
      resultado.innerHTML = '<p class="aviso">Preencha os campos com números válidos (prazo de pelo menos 1 dia).</p>';
      return;
    }
    const semValor = f.objetivo === 'futuro' ? f.valorInicial + f.aporteMensal === 0 : f.meta === 0;
    if (semValor) {
      resultado.innerHTML = `<p class="aviso">Informe ${f.objetivo === 'futuro' ? 'a aplicação inicial ou o aporte mensal' : 'o valor desejado'}.</p>`;
      return;
    }

    const { cenario } = contexto;
    const produto = PRODUTOS[f.produtoChave];
    const taxaAnual = taxaBrutaAnual(f.indexador, f.taxa, cenario);
    const base = { produto, taxaAnual, dias: f.dias, inflacaoAnual: cenario.ipca };
    const fatorInflacao = Math.pow(1 + cenario.ipca, f.dias / 365);
    const metaNominal = f.metaReal ? f.meta * fatorInflacao : f.meta;

    let parametros;
    let destaque;
    if (f.objetivo === 'futuro') {
      parametros = { ...base, valorInicial: f.valorInicial, aporteMensal: f.aporteMensal };
    } else if (f.objetivo === 'presente') {
      const valor = valorInicialNecessario(metaNominal, { ...base, aporteMensal: f.aporteMensal });
      parametros = { ...base, valorInicial: valor, aporteMensal: f.aporteMensal };
      destaque = { rotulo: 'Aplique hoje', valor };
    } else {
      const valor = aporteMensalNecessario(metaNominal, { ...base, valorInicial: f.valorInicial });
      parametros = { ...base, valorInicial: f.valorInicial, aporteMensal: valor };
      destaque = { rotulo: 'Aplique por mês', valor };
    }

    if (destaque && destaque.valor === null) {
      resultado.innerHTML = '<p class="aviso">Não foi possível atingir o valor desejado com esses parâmetros.</p>';
      return;
    }

    const simulacao = simular(parametros);
    resultado.innerHTML = montarResultado(f, produto, taxaAnual, simulacao, destaque, metaNominal);
    desenharGrafico(resultado.querySelector('.espaco-grafico'), {
      series: [
        { nome: 'Total investido', cor: 'var(--cor-neutra)', tracejado: true, pontos: simulacao.serie.map((p) => ({ x: p.mes, y: p.investido })) },
        { nome: 'Valor bruto', cor: 'var(--cor-2)', pontos: simulacao.serie.map((p) => ({ x: p.mes, y: p.bruto })) },
        { nome: 'Valor líquido (se resgatar)', cor: 'var(--cor-1)', pontos: simulacao.serie.map((p) => ({ x: p.mes, y: p.liquido })) },
      ],
      formatarX: (mes) => (f.dias < 90 ? `dia ${Math.round(mes * DIAS_POR_MES)}` : `mês ${formatarNumero(mes, 0)}`),
      formatarY: formatarMoeda,
    });
  }

  function montarResultado(f, produto, taxaAnual, { resumo }, destaque, metaNominal) {
    const cdi = contexto.cenario.cdi;
    const percentualCDILiquido = percentualCDIEquivalente(resumo.taxaLiquidaAnual, cdi);
    const linha = (rotulo, valor, explica = '', classe = '') => `
      <div class="linha-resumo ${classe}"><span>${rotulo} ${explica ? botaoExplica(explica) : ''}</span><strong>${valor}</strong></div>`;

    const frase = destaque
      ? `<p class="destaque"><span>${destaque.rotulo}</span><strong>${formatarMoeda(destaque.valor)}</strong></p>
         <p class="frase">para ter ${formatarMoeda(metaNominal)} líquidos em ${formatarPrazo(f.dias)}${f.metaReal ? ` (equivalentes a ${formatarMoeda(f.meta)} de hoje)` : ''}.</p>`
      : `<p class="destaque"><span>Você terá</span><strong>${formatarMoeda(resumo.valorLiquido)}</strong></p>
         <p class="frase">líquidos em ${formatarPrazo(f.dias)}, o que equivale a ${formatarMoeda(resumo.valorLiquidoReal)} em poder de compra de hoje.</p>`;

    return `
      <div class="cartao-resultado">
        ${frase}
        <div class="resumo-colunas">
          <div>
            ${linha('Total investido', formatarMoeda(resumo.totalInvestido))}
            ${linha('Rendimento bruto', formatarMoeda(resumo.rendimentoBruto))}
            ${resumo.custodia > 0 ? linha('Taxa de custódia (já descontada)', '− ' + formatarMoeda(resumo.custodia), 'custodia') : ''}
            ${resumo.iof > 0 ? linha('IOF', '− ' + formatarMoeda(resumo.iof), 'iof') : ''}
            ${linha('Imposto de Renda', produto.isentoIR ? 'isento' : '− ' + formatarMoeda(resumo.ir), produto.isentoIR ? 'isencao' : 'imposto-renda')}
            ${linha('Valor líquido', formatarMoeda(resumo.valorLiquido), '', 'total')}
          </div>
          <div>
            ${linha('Rentabilidade bruta', `${formatarPercentual(taxaAnual)} a.a.`)}
            ${linha('Rentabilidade líquida', `${formatarPercentual(resumo.taxaLiquidaAnual)} a.a.`, 'rentabilidade-liquida')}
            ${linha('Líquida em % do CDI', `${formatarNumero(percentualCDILiquido * 100, 1)}%`, 'cdi')}
            ${linha('Valor em reais de hoje', formatarMoeda(resumo.valorLiquidoReal), 'valor-real')}
            ${linha('Ganho real (acima da inflação)', `${formatarPercentual((1 + resumo.taxaLiquidaAnual) / (1 + contexto.cenario.ipca) - 1)} a.a.`, 'juros-reais')}
          </div>
        </div>
        <p class="nota">${descreverTaxa(f.indexador, f.taxa)} · ${produto.nome} · ${formatarPrazo(f.dias)}
          ${f.aporteMensal > 0 || f.objetivo === 'aporte' ? ' · aportes no início de cada mês' : ''}</p>
      </div>
      <div class="espaco-grafico"></div>
      ${observacoes(f, produto)}`;
  }

  // Avisos importantes conforme o produto e o prazo.
  function observacoes(f, produto) {
    const itens = [];
    if (f.produtoChave.startsWith('tesouro')) {
      itens.push(`Garantido pelo Tesouro Nacional. Considera a taxa de custódia da B3 ${botaoExplica('custodia')}.`);
    } else if (produto.fgc) {
      itens.push(`Coberto pelo FGC até R$ 250 mil por CPF e por instituição ${botaoExplica('fgc')}.`);
    } else {
      itens.push(`<strong>Sem garantia do FGC</strong>: se o emissor não pagar, pode haver perda ${botaoExplica('fgc')}.`);
    }
    if (['tesouro_prefixado', 'tesouro_ipca'].includes(f.produtoChave) || ['pre', 'ipca'].includes(f.indexador)) {
      itens.push(`Resultado válido para resgate <strong>no vencimento</strong>. Vendas antes do prazo sofrem marcação a mercado ${botaoExplica('marcacao-mercado')}.`);
    }
    if (f.produtoChave === 'lci_lca') itens.push('LCIs e LCAs costumam ter carência: verifique o prazo mínimo antes de aplicar.');
    if (f.produtoChave === 'poupanca') itens.push('Na poupança, o rendimento só é creditado no aniversário mensal do depósito.');
    if (f.dias < 30) itens.push(`Resgates antes de 30 dias pagam IOF ${botaoExplica('iof')}.`);
    itens.push('Simulação com taxas constantes no período, conforme o cenário acima. Resultados reais podem variar.');
    return `<ul class="observacoes">${itens.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  }

  // Interface pública da aba.
  return {
    atualizar,
    prazoDias: () => lerFormulario().dias,
    /** Preenche o formulário (usado pela aba Tesouro Direto). */
    preencher({ produto, indexador, taxa, dias }) {
      formulario.produto.value = produto;
      formulario.produto.dispatchEvent(new Event('change'));
      formulario.indexador.value = indexador;
      formulario.indexador.dispatchEvent(new Event('change'));
      formulario.taxa.value = formatarNumero(taxa * 100, 2);
      formulario.prazo.value = String(Math.round(dias));
      formulario['prazo-unidade'].value = 'dias';
      formulario.objetivo.value = 'futuro';
      atualizar();
    },
  };
}
