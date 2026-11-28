// =============================================================================
// Aba "Lançamentos": formulários para registrar compras e vendas de ações,
// FIIs e ETFs, aplicações de renda fixa e outros bens; e as listas do que já
// foi registrado, com opção de remover, registrar resgate ou atualizar valor.
// =============================================================================

import { calcularPosicoes } from '../../calc/carteira.js';
import { formatarMoeda, formatarNumero, formatarData, lerNumero } from '../../util/formatar.js';
import { escapar } from '../../util/dom.js';
import { INDEXADORES } from '../../config/produtos.js';
import {
  campoNumero, opcoesProdutos, opcoesIndexadores, ligarProdutoIndexador, descreverTaxa,
} from '../rendafixa/comum.js';
import { novoId } from './estado.js';

// Data de hoje no fuso do aparelho (toISOString usaria o horário de Greenwich).
function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const NOMES_OPERACAO = { compra: 'Compra', venda: 'Venda', ajuste: 'Ajuste de quantidade' };
const NOMES_TIPO = { acao: 'ação', fii: 'FII', etf: 'ETF' };

function campoData(nome, rotulo, valor = hojeIso(), opcional = false) {
  return `
    <label class="campo">
      <span class="rotulo">${rotulo}</span>
      <input type="date" name="${nome}" value="${valor}" max="${nome === 'vencimento' ? '' : hojeIso()}" ${opcional ? '' : 'required'}>
    </label>`;
}

function campoTexto(nome, rotulo, extra = '') {
  return `
    <label class="campo">
      <span class="rotulo">${rotulo}</span>
      <input type="text" name="${nome}" autocomplete="off" ${extra}>
    </label>`;
}

/** Preço de um ativo na semana da data (ou o último, se a data for recente). */
function precoSugerido(cotado, semanas, data) {
  if (!cotado) return NaN;
  let preco = cotado.preco;
  for (let k = 0; k < semanas.length; k++) if (semanas[k] >= data && cotado.semanal[k]) { preco = cotado.semanal[k]; break; }
  return data < semanas[0] ? NaN : preco;
}

export function montarLancamentos(elemento, pagina) {
  const { carteira, dados } = pagina;
  const ativos = dados.cotacoes ? dados.cotacoes.ativos : {};
  const semanas = dados.cotacoes ? dados.cotacoes.semanas : [];

  elemento.innerHTML = `
    <fieldset class="objetivos">
      <legend>O que você quer registrar?</legend>
      <label class="opcao-objetivo"><input type="radio" name="tipo-lancamento" value="rv" checked><span>Ação, FII ou ETF</span></label>
      <label class="opcao-objetivo"><input type="radio" name="tipo-lancamento" value="rf"><span>Renda fixa</span></label>
      <label class="opcao-objetivo"><input type="radio" name="tipo-lancamento" value="outro"><span>Outro bem</span></label>
    </fieldset>

    <form class="formulario painel" data-form="rv" autocomplete="off">
      <div class="grade-campos">
        <label class="campo">
          <span class="rotulo">Operação</span>
          <select name="operacao">
            <option value="compra">Compra</option>
            <option value="venda">Venda</option>
            <option value="ajuste">Ajuste de quantidade (desdobramento, bonificação…)</option>
          </select>
        </label>
        ${campoTexto('codigo', 'Código do ativo', 'list="lista-ativos" placeholder="ex.: PETR4, MXRF11, BOVA11" autocapitalize="characters" required')}
        ${campoData('data', 'Data da operação')}
        ${campoNumero({ nome: 'quantidade', rotulo: 'Quantidade' })}
        ${campoNumero({ nome: 'preco', rotulo: 'Preço por unidade', sufixo: 'R$', classe: 'campo-preco' })}
        ${campoNumero({ nome: 'custos', rotulo: 'Taxas e corretagem (opcional)', sufixo: 'R$', classe: 'campo-preco' })}
      </div>
      <p class="nota info-ativo"></p>
      <p class="nota ajuda-ajuste" hidden>Use o ajuste quando a quantidade mudar sem você comprar ou vender:
        num desdobramento de 1 para 2, informe as ações que <em>recebeu</em> (ex.: tinha 100, informe 100).
        Num grupamento, informe com sinal de menos as que deixou de ter (ex.: −90).</p>
      <datalist id="lista-ativos">
        ${Object.entries(ativos).map(([c, a]) => `<option value="${c}">${escapar(a.nome)} (${NOMES_TIPO[a.tipo]})</option>`).join('')}
      </datalist>
      <div class="botoes"><button type="submit" class="botao-principal">Adicionar</button></div>
      <p class="mensagem" aria-live="polite"></p>
    </form>

    <form class="formulario painel" data-form="rf" autocomplete="off" hidden>
      <div class="grade-campos">
        ${campoTexto('nome', 'Nome (para você reconhecer)', 'placeholder="ex.: CDB Banco X 2028" maxlength="80" required')}
        <label class="campo"><span class="rotulo">Produto</span><select name="produto">${opcoesProdutos('cdb')}</select></label>
        <label class="campo"><span class="rotulo">Rentabilidade</span><select name="indexador">${opcoesIndexadores('cdb', 'cdi')}</select></label>
        ${campoNumero({ nome: 'taxa', rotulo: 'Taxa', valor: '100' })}
        ${campoNumero({ nome: 'valor', rotulo: 'Valor aplicado', sufixo: 'R$' })}
        ${campoData('data', 'Data da aplicação')}
        ${campoData('vencimento', 'Vencimento (opcional)', '', true)}
      </div>
      <div class="botoes"><button type="submit" class="botao-principal">Adicionar</button></div>
      <p class="mensagem" aria-live="polite"></p>
    </form>

    <form class="formulario painel" data-form="outro" autocomplete="off" hidden>
      <p class="nota">Para bens que o Tfinance não acompanha (previdência, saldo em conta, imóvel,
        fundos de investimento...). O valor não muda sozinho: atualize-o quando quiser.</p>
      <div class="grade-campos">
        ${campoTexto('nome', 'Nome', 'placeholder="ex.: Previdência privada" maxlength="80" required')}
        ${campoNumero({ nome: 'valor', rotulo: 'Valor atual', sufixo: 'R$' })}
        ${campoData('data', 'Valor de quando')}
      </div>
      <div class="botoes"><button type="submit" class="botao-principal">Adicionar</button></div>
      <p class="mensagem" aria-live="polite"></p>
    </form>

    <div class="listas-lancamentos"></div>`;

  // ------------------------------------------------- Troca de formulário
  const formularios = {};
  elemento.querySelectorAll('[data-form]').forEach((f) => { formularios[f.dataset.form] = f; });
  elemento.querySelector('.objetivos').addEventListener('change', (evento) => {
    for (const [chave, f] of Object.entries(formularios)) f.hidden = chave !== evento.target.value;
  });

  const mensagem = (form, texto, erro = true) => {
    const m = form.querySelector('.mensagem');
    m.textContent = texto;
    m.className = `mensagem ${erro ? 'erro' : 'sucesso'}`;
  };

  // -------------------------------------------------- Ações, FIIs, ETFs
  const rv = formularios.rv;
  const info = rv.querySelector('.info-ativo');
  function atualizarInfo(sugerirPreco) {
    const codigo = rv.codigo.value.trim().toUpperCase();
    const cotado = ativos[codigo];
    const ajuste = rv.operacao.value === 'ajuste';
    rv.querySelectorAll('.campo-preco').forEach((c) => { c.hidden = ajuste; });
    rv.querySelector('.ajuda-ajuste').hidden = !ajuste;
    if (!codigo) { info.textContent = ''; return; }
    if (cotado) {
      info.textContent = `${cotado.nome} (${NOMES_TIPO[cotado.tipo]}) — último preço ${formatarMoeda(cotado.preco)} em ${formatarData(cotado.data)}.`;
      const sugestao = precoSugerido(cotado, semanas, rv.data.value);
      if (sugerirPreco && Number.isFinite(sugestao)) rv.preco.value = formatarNumero(sugestao, 2);
    } else if (codigo.length >= 5) {
      info.textContent = 'Código não encontrado entre os ativos negociados nos últimos meses. Você pode registrar mesmo assim; ele será avaliado pelo custo.';
    }
  }
  rv.codigo.addEventListener('change', () => atualizarInfo(true));
  rv.data.addEventListener('change', () => atualizarInfo(true));
  rv.operacao.addEventListener('change', () => atualizarInfo(false));

  rv.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const tipo = rv.operacao.value;
    const codigo = rv.codigo.value.trim().toUpperCase();
    const quantidade = lerNumero(rv.quantidade.value);
    const preco = tipo === 'ajuste' ? 0 : lerNumero(rv.preco.value);
    const custos = rv.custos.value.trim() ? lerNumero(rv.custos.value) : 0;
    const data = rv.data.value;
    if (!/^[A-Z0-9]{4,12}$/.test(codigo)) return mensagem(rv, 'Informe o código do ativo (ex.: PETR4).');
    if (!data || data > hojeIso()) return mensagem(rv, 'Informe uma data válida, até hoje.');
    if (!Number.isFinite(quantidade) || quantidade === 0 || (tipo !== 'ajuste' && quantidade < 0)) {
      return mensagem(rv, 'Informe a quantidade.');
    }
    if (tipo !== 'ajuste' && !(preco > 0)) return mensagem(rv, 'Informe o preço por unidade.');
    if (!Number.isFinite(custos) || custos < 0) return mensagem(rv, 'Taxas inválidas.');
    if (tipo === 'venda') {
      const tinha = calcularPosicoes(carteira.operacoes.filter((op) => op.codigo === codigo), data)[codigo];
      if (!tinha || tinha.quantidade < quantidade) {
        return mensagem(rv, `Na data da venda você tinha ${formatarNumero(tinha ? tinha.quantidade : 0, 0)} ${codigo}. Registre antes as compras.`);
      }
    }
    pagina.alterar({
      ...carteira,
      exemplo: false,
      operacoes: [...carteira.operacoes, { id: novoId(), tipo, codigo, data, quantidade, preco, custos }],
    });
  });

  // ------------------------------------------------------------ Renda fixa
  const rf = formularios.rf;
  ligarProdutoIndexador(rf, () => {});
  rf.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const indexador = rf.indexador.value;
    const taxa = INDEXADORES[indexador].rotuloTaxa ? lerNumero(rf.taxa.value) / 100 : 0;
    const valor = lerNumero(rf.valor.value);
    const data = rf.data.value;
    const vencimento = rf.vencimento.value || null;
    if (!rf.nome.value.trim()) return mensagem(rf, 'Dê um nome à aplicação.');
    if (!Number.isFinite(taxa) || taxa < 0) return mensagem(rf, 'Informe a taxa.');
    if (!(valor > 0)) return mensagem(rf, 'Informe o valor aplicado.');
    if (!data || data > hojeIso()) return mensagem(rf, 'Informe a data da aplicação, até hoje.');
    if (vencimento && vencimento <= data) return mensagem(rf, 'O vencimento deve ser depois da aplicação.');
    pagina.alterar({
      ...carteira,
      exemplo: false,
      rendaFixa: [...carteira.rendaFixa, {
        id: novoId(), nome: rf.nome.value.trim(), produto: rf.produto.value, indexador, taxa, valor, data, vencimento, resgate: null,
      }],
    });
  });

  // ---------------------------------------------------------------- Outros
  const outro = formularios.outro;
  outro.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const valor = lerNumero(outro.valor.value);
    if (!outro.nome.value.trim()) return mensagem(outro, 'Dê um nome ao bem.');
    if (!(valor >= 0)) return mensagem(outro, 'Informe o valor.');
    pagina.alterar({
      ...carteira,
      exemplo: false,
      outros: [...carteira.outros, { id: novoId(), nome: outro.nome.value.trim(), valor, data: outro.data.value || hojeIso() }],
    });
  });

  montarListas(elemento.querySelector('.listas-lancamentos'), pagina);
}

/** Listas do que já foi registrado, com botões de remover/resgatar/atualizar. */
function montarListas(lugar, pagina) {
  const { carteira } = pagina;
  const operacoes = carteira.operacoes.slice().sort((a, b) => (a.data < b.data ? 1 : -1));
  const botaoRemover = (tipo, id) => `<button type="button" class="botao-remover" data-remover="${tipo}" data-id="${id}" aria-label="Remover" title="Remover">×</button>`;

  lugar.innerHTML = `
    ${operacoes.length ? `
      <h2>Ações, FIIs e ETFs</h2>
      <div class="tabela-rolavel">
        <table class="tabela">
          <thead><tr><th>Data</th><th>Operação</th><th>Quantidade × preço</th><th class="opcional">Total</th><th></th></tr></thead>
          <tbody>${operacoes.map((op) => `
            <tr>
              <td>${formatarData(op.data)}</td>
              <td>${NOMES_OPERACAO[op.tipo]}<br><strong>${escapar(op.codigo)}</strong></td>
              <td>${formatarNumero(op.quantidade, 0)}${op.tipo === 'ajuste' ? '' : ` × ${formatarMoeda(op.preco)}`}</td>
              <td class="opcional">${op.tipo === 'ajuste' ? '—' : formatarMoeda(op.quantidade * op.preco + (op.tipo === 'compra' ? 1 : -1) * (op.custos || 0))}</td>
              <td>${botaoRemover('operacoes', op.id)}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>` : ''}

    ${carteira.rendaFixa.length ? `
      <h2>Renda fixa</h2>
      ${carteira.rendaFixa.map((a) => `
        <div class="item-lancamento">
          <div>
            <strong>${escapar(a.nome)}</strong> ${botaoRemover('rendaFixa', a.id)}<br>
            <small>${descreverTaxa(a.indexador, a.taxa)} · ${formatarMoeda(a.valor)} em ${formatarData(a.data)}
              ${a.vencimento ? ` · vence em ${formatarData(a.vencimento)}` : ''}</small>
            ${a.resgate ? `<br><small>Resgatado em ${formatarData(a.resgate.data)}: ${formatarMoeda(a.resgate.valor)}</small>` : ''}
          </div>
          ${a.resgate ? '' : `
          <details class="acao-item">
            <summary>Registrar resgate</summary>
            <form class="mini-formulario" data-resgate="${a.id}">
              <label>Data <input type="date" name="data" value="${hojeIso()}" max="${hojeIso()}" min="${a.data}" required></label>
              <label>Valor recebido (líquido) <input type="text" inputmode="decimal" name="valor" required></label>
              <button type="submit" class="botao-pequeno">Salvar</button>
            </form>
          </details>`}
        </div>`).join('')}` : ''}

    ${carteira.outros.length ? `
      <h2>Outros bens</h2>
      ${carteira.outros.map((o) => `
        <div class="item-lancamento">
          <div>
            <strong>${escapar(o.nome)}</strong> ${botaoRemover('outros', o.id)}<br>
            <small>${formatarMoeda(o.valor)} em ${formatarData(o.data)}</small>
          </div>
          <details class="acao-item">
            <summary>Atualizar valor</summary>
            <form class="mini-formulario" data-atualizar="${o.id}">
              <label>Valor atual <input type="text" inputmode="decimal" name="valor" required></label>
              <button type="submit" class="botao-pequeno">Salvar</button>
            </form>
          </details>
        </div>`).join('')}` : ''}`;

  lugar.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-remover]');
    if (!botao) return;
    const lista = botao.dataset.remover;
    if (!window.confirm('Remover este lançamento?')) return;
    pagina.alterar({ ...carteira, [lista]: carteira[lista].filter((x) => x.id !== botao.dataset.id) });
  });

  lugar.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const form = evento.target;
    const valor = lerNumero(form.valor.value);
    if (!(valor >= 0)) { form.valor.focus(); return; }
    if (form.dataset.resgate) {
      pagina.alterar({
        ...carteira,
        rendaFixa: carteira.rendaFixa.map((a) => (a.id === form.dataset.resgate ? { ...a, resgate: { data: form.data.value, valor } } : a)),
      });
    } else if (form.dataset.atualizar) {
      pagina.alterar({
        ...carteira,
        outros: carteira.outros.map((o) => (o.id === form.dataset.atualizar ? { ...o, valor, data: hojeIso() } : o)),
      });
    }
  });
}

