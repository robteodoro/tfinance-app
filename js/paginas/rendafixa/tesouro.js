// =============================================================================
// Aba "Tesouro Direto hoje": títulos à venda, com taxas e preços do último
// dia disponível. O botão "Simular" leva o título para a aba de simulação.
// =============================================================================

import { botaoExplica } from '../../componentes/explica.js';
import { formatarMoeda, formatarData, formatarPercentual, formatarPrazo } from '../../util/formatar.js';
import { escapar } from '../../util/dom.js';

// Como cada tipo de título é representado no simulador.
// Títulos com juros semestrais são simulados como se não pagassem cupons
// (aproximação: os cupons, na prática, são tributados a cada pagamento).
const TIPOS = {
  'Tesouro Selic': { produto: 'tesouro_selic', indexador: 'selic' },
  'Tesouro Prefixado': { produto: 'tesouro_prefixado', indexador: 'pre' },
  'Tesouro Prefixado com Juros Semestrais': { produto: 'tesouro_prefixado', indexador: 'pre', aproximado: true },
  'Tesouro IPCA+': { produto: 'tesouro_ipca', indexador: 'ipca' },
  'Tesouro IPCA+ com Juros Semestrais': { produto: 'tesouro_ipca', indexador: 'ipca', aproximado: true },
};

// Ordem de exibição: primeiro os títulos mais usados.
const ORDEM = [
  'Tesouro Selic', 'Tesouro Prefixado', 'Tesouro IPCA+',
  'Tesouro Prefixado com Juros Semestrais', 'Tesouro IPCA+ com Juros Semestrais',
  'Tesouro Renda+ Aposentadoria Extra', 'Tesouro Educa+',
];
const posicao = (tipo) => (ORDEM.includes(tipo) ? ORDEM.indexOf(tipo) : ORDEM.length);

function descreverTaxa(tipo, taxa) {
  const pct = formatarPercentual(taxa / 100);
  if (tipo.startsWith('Tesouro Selic')) return `Selic + ${pct}`;
  if (tipo.startsWith('Tesouro Prefixado')) return `${pct} a.a.`;
  if (tipo.includes('IGPM')) return `IGP-M + ${pct}`;
  return `IPCA + ${pct}`;
}

function diasAte(dataIso) {
  return (new Date(`${dataIso}T00:00:00`) - new Date()) / 86400000;
}

export function montarTesouro(elemento, contexto, aoSimular) {
  const dados = contexto.tesouro;
  if (!dados || !dados.titulos.length) {
    elemento.innerHTML = '<p class="aviso">Os dados do Tesouro Direto não estão disponíveis no momento.</p>';
    return { atualizar() {}, prazoDias: () => 730 };
  }

  const grupos = {};
  for (const titulo of dados.titulos) (grupos[titulo.tipo] = grupos[titulo.tipo] || []).push(titulo);

  const tiposOrdenados = Object.keys(grupos).sort((a, b) => posicao(a) - posicao(b));
  const secoes = tiposOrdenados.map((tipo) => {
    const titulos = grupos[tipo];
    const mapa = TIPOS[tipo];
    const linhas = titulos.map((t) => {
      const dias = diasAte(t.vencimento);
      const botao = mapa && dias > 1
        ? `<button type="button" class="botao-pequeno" data-simular='${escapar(JSON.stringify({ ...mapa, taxa: t.taxaCompra / 100, dias }))}'>Simular</button>`
        : '';
      return `
        <tr>
          <td>${formatarData(t.vencimento)}<br><small>${dias > 1 ? formatarPrazo(dias) : 'vencendo'}</small></td>
          <td><strong>${descreverTaxa(tipo, t.taxaCompra)}</strong></td>
          <td>${formatarMoeda(t.precoCompra)}</td>
          <td>${botao}</td>
        </tr>`;
    }).join('');
    // Títulos que o simulador não cobre ficam recolhidos.
    return `
      <details class="grupo-tesouro" ${mapa ? 'open' : ''}>
        <summary><h3>${escapar(tipo)}</h3></summary>
        ${mapa && mapa.aproximado ? '<p class="nota">Simulação aproximada: os juros semestrais são tratados como reinvestidos, sem o IR cobrado a cada pagamento.</p>' : ''}
        ${!mapa ? '<p class="nota">Este título paga renda mensal no futuro (ou é corrigido pelo IGP-M) e ainda não é simulado pelo aplicativo.</p>' : ''}
        <div class="tabela-rolavel">
          <table class="tabela">
            <thead><tr><th>Vencimento</th><th>Taxa de compra</th><th>Preço unitário</th><th></th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </details>`;
  }).join('');

  elemento.innerHTML = `
    <p class="introducao">Títulos públicos à venda e suas taxas em ${formatarData(dados.dataBase)}
      ${botaoExplica('tesouro-direto')}. Fonte: Tesouro Transparente.
      É possível comprar frações a partir de 1% do preço unitário (mínimo de R$ 30).</p>
    ${secoes}`;

  elemento.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-simular]');
    if (botao) aoSimular(JSON.parse(botao.dataset.simular));
  });

  return { atualizar() {}, prazoDias: () => 730 };
}
