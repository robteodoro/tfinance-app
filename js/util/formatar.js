// =============================================================================
// Formatação de números e datas no padrão brasileiro, e leitura de números
// digitados pelo usuário (aceita "1.234,56", "1234,56" ou "1234.56").
// =============================================================================

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 1234.5 -> "R$ 1.234,50" */
export function formatarMoeda(valor) {
  return Number.isFinite(valor) ? moeda.format(valor) : '—';
}

const moedaDetalhada = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4,
});

/** 0.095 -> "R$ 0,095"  (valores pequenos, como rendimento por cota, sem arredondar) */
export function formatarMoedaDetalhada(valor) {
  return Number.isFinite(valor) ? moedaDetalhada.format(valor) : '—';
}

const moedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1,
});

/** 24057362 -> "R$ 24,1 mi"  (valores grandes, em pouco espaço) */
export function formatarMoedaCompacta(valor) {
  return Number.isFinite(valor) ? moedaCompacta.format(valor) : '—';
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-11-23" ou "2026-11" -> "nov/26" */
export function formatarMesCurto(iso) {
  const [ano, mes] = iso.split('-');
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
}

/** 0.1365 -> "13,65%"  (recebe decimal) */
export function formatarPercentual(decimal, casas = 2) {
  if (!Number.isFinite(decimal)) return '—';
  return (decimal * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: casas, maximumFractionDigits: casas,
  }) + '%';
}

/** 1234.5 -> "1.234,5" */
export function formatarNumero(valor, casas = 2) {
  if (!Number.isFinite(valor)) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** 1 -> "1,00"  (sempre com o mesmo número de casas, ex.: P/VP) */
export function formatarDecimal(valor, casas = 2) {
  if (!Number.isFinite(valor)) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** "2026-11-19" -> "19/11/2026" */
export function formatarData(iso) {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return dia ? `${dia}/${mes}/${ano}` : `${mes}/${ano}`;
}

/** Prazo em dias -> texto amigável: "2 anos e 3 meses", "45 dias". */
export function formatarPrazo(dias) {
  if (dias < 60) return `${Math.round(dias)} dias`;
  const mesesTotais = Math.round(dias / (365 / 12));
  const anos = Math.floor(mesesTotais / 12);
  const meses = mesesTotais % 12;
  const partes = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}

/**
 * Converte texto digitado em número. Retorna NaN se não for um número.
 *   "1.234,56" -> 1234.56     "1234.56" -> 1234.56     "1.000" -> 1000
 */
export function lerNumero(texto) {
  let t = String(texto).replace(/[R$%\s]/g, '');
  if (t === '') return NaN;
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ''); // "1.000" é mil, não um
  }
  return Number(t);
}
