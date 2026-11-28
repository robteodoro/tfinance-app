// =============================================================================
// Guarda e lê a carteira pessoal. Tudo fica SÓ neste navegador
// (localStorage); nada é enviado para a internet. Para levar a carteira a
// outro aparelho, use "Exportar" e "Importar" (aba Backup).
// =============================================================================

import { lerSalvo, salvar } from '../../util/armazenamento.js';
import { PRODUTOS, INDEXADORES } from '../../config/produtos.js';

const CHAVE = 'carteira';
const VERSAO = 1;

export function carteiraVazia() {
  return { versao: VERSAO, operacoes: [], rendaFixa: [], outros: [] };
}

export function lerCarteira() {
  try {
    return validarCarteira(lerSalvo(CHAVE, null) || carteiraVazia());
  } catch {
    return carteiraVazia();
  }
}

export function salvarCarteira(carteira) {
  salvar(CHAVE, carteira);
}

/** Identificador único para cada lançamento (para poder removê-lo depois). */
export function novoId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const numeroValido = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Confere um arquivo de carteira (importado ou salvo) e devolve uma cópia
 * limpa. Lança erro com mensagem compreensível se algo estiver errado.
 */
export function validarCarteira(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('O arquivo não contém uma carteira do Tfinance.');
  const limpa = carteiraVazia();
  for (const op of dados.operacoes || []) {
    if (!['compra', 'venda', 'ajuste'].includes(op.tipo) || typeof op.codigo !== 'string'
      || !DATA.test(op.data) || !numeroValido(op.quantidade) || !numeroValido(op.preco)) {
      throw new Error(`Operação inválida: ${JSON.stringify(op).slice(0, 120)}`);
    }
    limpa.operacoes.push({
      id: String(op.id || novoId()), tipo: op.tipo, codigo: op.codigo.toUpperCase().trim(), data: op.data,
      quantidade: op.quantidade, preco: op.preco, custos: numeroValido(op.custos) ? op.custos : 0,
    });
  }
  for (const a of dados.rendaFixa || []) {
    if (!PRODUTOS[a.produto] || !INDEXADORES[a.indexador] || !DATA.test(a.data)
      || !numeroValido(a.valor) || !numeroValido(a.taxa)) {
      throw new Error(`Aplicação de renda fixa inválida: ${JSON.stringify(a).slice(0, 120)}`);
    }
    limpa.rendaFixa.push({
      id: String(a.id || novoId()), nome: String(a.nome || PRODUTOS[a.produto].nome).slice(0, 80),
      produto: a.produto, indexador: a.indexador, taxa: a.taxa, data: a.data, valor: a.valor,
      vencimento: DATA.test(a.vencimento || '') ? a.vencimento : null,
      resgate: a.resgate && DATA.test(a.resgate.data) && numeroValido(a.resgate.valor)
        ? { data: a.resgate.data, valor: a.resgate.valor } : null,
    });
  }
  for (const o of dados.outros || []) {
    if (!numeroValido(o.valor) || !DATA.test(o.data)) throw new Error(`Bem inválido: ${JSON.stringify(o).slice(0, 120)}`);
    limpa.outros.push({ id: String(o.id || novoId()), nome: String(o.nome || 'Outro').slice(0, 80), valor: o.valor, data: o.data });
  }
  limpa.exemplo = Boolean(dados.exemplo);
  return limpa;
}

/** Carteira fictícia para conhecer a página antes de cadastrar a sua. */
export function carteiraExemplo() {
  const op = (tipo, codigo, data, quantidade, preco) => ({ id: novoId(), tipo, codigo, data, quantidade, preco, custos: 0 });
  return validarCarteira({
    exemplo: true,
    operacoes: [
      op('compra', 'BOVA11', '2025-12-01', 30, 155),
      op('compra', 'ITUB4', '2025-12-01', 100, 36),
      op('compra', 'PETR4', '2026-01-15', 100, 33),
      op('compra', 'WEGE3', '2026-02-10', 50, 52),
      op('compra', 'MXRF11', '2025-12-01', 600, 9.6),
      op('compra', 'HGLG11', '2026-03-02', 30, 155),
      op('venda', 'PETR4', '2026-08-03', 40, 45),
    ],
    rendaFixa: [
      { nome: 'CDB Banco Exemplo', produto: 'cdb', indexador: 'cdi', taxa: 1.1, data: '2025-12-01', valor: 15000 },
      { nome: 'Tesouro IPCA+ 2035', produto: 'tesouro_ipca', indexador: 'ipca', taxa: 0.07, data: '2026-01-15', valor: 8000, vencimento: '2035-05-15' },
      { nome: 'LCI 95% CDI', produto: 'lci_lca', indexador: 'cdi', taxa: 0.95, data: '2026-04-01', valor: 5000, vencimento: '2028-04-01' },
    ],
    outros: [{ nome: 'Previdência privada', valor: 20000, data: '2026-11-01' }],
  });
}
