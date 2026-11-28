// =============================================================================
// Aba "Isento × tributado": converte uma taxa isenta de IR (LCI, LCA...) na
// taxa equivalente de um produto tributado (CDB...) e vice-versa, para cada
// faixa de prazo do Imposto de Renda.
// =============================================================================

import { taxaPercentualCDI, percentualCDIEquivalente } from '../../calc/taxas.js';
import { taxaTributadaEquivalente, taxaIsentaEquivalente } from '../../calc/rendafixa.js';
import { aliquotaIR } from '../../calc/impostos.js';
import { botaoExplica } from '../../componentes/explica.js';
import { formatarNumero, formatarPercentual } from '../../util/formatar.js';
import { aoParar } from '../../util/dom.js';
import { campoNumero, lerCampo } from './comum.js';

// Um prazo representativo de cada faixa do IR.
const PRAZOS = [
  { dias: 180, nome: 'até 6 meses' },
  { dias: 360, nome: '6 meses a 1 ano' },
  { dias: 720, nome: '1 a 2 anos' },
  { dias: 1080, nome: 'mais de 2 anos' },
];

export function montarEquivalencia(elemento, contexto) {
  elemento.innerHTML = `
    <p class="introducao">Investimentos isentos de IR rendem "menos" no papel, mas não pagam imposto.
      Esta tabela mostra quanto cada um precisa render para empatar com o outro
      ${botaoExplica('taxa-equivalente')}.</p>
    <form class="formulario" autocomplete="off" onsubmit="return false">
      <div class="grade-campos">
        <label class="campo">
          <span class="rotulo">Forma da taxa</span>
          <select name="tipo">
            <option value="cdi">% do CDI</option>
            <option value="pre">% ao ano (prefixado)</option>
          </select>
        </label>
        ${campoNumero({ nome: 'taxa', rotulo: 'Taxa', valor: '90' })}
      </div>
    </form>
    <div class="resultado" aria-live="polite"></div>`;

  const formulario = elemento.querySelector('form');
  const resultado = elemento.querySelector('.resultado');
  const recalcular = aoParar(atualizar, 200);
  formulario.addEventListener('input', recalcular);
  formulario.addEventListener('change', (evento) => {
    if (evento.target.name === 'tipo') formulario.taxa.value = evento.target.value === 'cdi' ? '90' : '12';
    recalcular();
  });

  function atualizar() {
    const tipo = formulario.tipo.value;
    const taxaDigitada = lerCampo(formulario, 'taxa') / 100;
    if (!Number.isFinite(taxaDigitada) || taxaDigitada <= 0) {
      resultado.innerHTML = '<p class="aviso">Informe uma taxa válida.</p>';
      return;
    }
    const { cdi } = contexto.cenario;
    // Trabalhamos sempre com taxa anual; no caso do CDI, convertemos ida e volta.
    const paraAnual = (t) => (tipo === 'cdi' ? taxaPercentualCDI(t, cdi) : t);
    const exibir = (anual) => (tipo === 'cdi'
      ? `${formatarNumero(percentualCDIEquivalente(anual, cdi) * 100, 1)}% do CDI`
      : `${formatarPercentual(anual)} a.a.`);
    const original = tipo === 'cdi' ? `${formatarNumero(taxaDigitada * 100, 1)}% do CDI` : `${formatarPercentual(taxaDigitada)} a.a.`;
    const anual = paraAnual(taxaDigitada);

    const linhas = PRAZOS.map((p) => `
      <tr>
        <td>${p.nome}</td>
        <td>${formatarPercentual(aliquotaIR(p.dias), 1)}</td>
        <td><strong>${exibir(taxaTributadaEquivalente(anual, p.dias))}</strong></td>
        <td><strong>${exibir(taxaIsentaEquivalente(anual, p.dias))}</strong></td>
      </tr>`).join('');

    resultado.innerHTML = `
      <div class="tabela-rolavel">
        <table class="tabela">
          <thead><tr>
            <th>Prazo</th>
            <th>IR ${botaoExplica('imposto-renda')}</th>
            <th>Um <em>isento</em> a ${original} equivale a um <em>tributado</em> de</th>
            <th>Um <em>tributado</em> a ${original} equivale a um <em>isento</em> de</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      <p class="nota">Exemplo de leitura: uma LCI que paga ${original} por mais de 2 anos rende o mesmo
        que um CDB de ${exibir(taxaTributadaEquivalente(anual, 1080))}. Cálculo para aplicação única,
        mantida até o fim do prazo${tipo === 'cdi' ? `, com CDI de ${formatarPercentual(cdi)} ao ano` : ''}.</p>`;
  }

  return { atualizar, prazoDias: () => 730 };
}
