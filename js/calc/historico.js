// =============================================================================
// Cálculos com as séries históricas longas (cerca de 10 anos, mês a mês) de
// site/dados/acoes-historico.json:
//   - retorno total (preço + proventos reinvestidos) e retorno anualizado;
//   - proventos e Dividend Yield de cada ano;
//   - sensibilidade da ação ao dólar e aos juros (regressão linear).
//
// Funções puras, testadas em testes/historico.teste.js.
// Séries mensais: um valor por mês, null quando não há dado.
// =============================================================================

/** Retorno de cada mês em relação ao anterior (null quando falta um dos dois). */
export function retornosMensais(serie) {
  return serie.map((valor, k) => {
    const anterior = k > 0 ? serie[k - 1] : null;
    return valor && anterior ? valor / anterior - 1 : null;
  });
}

/**
 * Índice de retorno total, começando em 100 no primeiro mês com preço.
 * Os proventos de cada mês são "reinvestidos" na própria ação:
 *   índice(mês) = índice(mês anterior) × (preço + proventos do mês) ÷ preço anterior
 * Meses sem preço repetem o último valor do índice.
 */
export function indiceRetornoTotal(fechamentos, proventos) {
  let indice = null;
  let precoAnterior = null;
  return fechamentos.map((preco, k) => {
    if (preco && precoAnterior && indice !== null) {
      indice *= (preco + (proventos[k] || 0)) / precoAnterior;
    } else if (preco && indice === null) {
      indice = 100;
    }
    if (preco) precoAnterior = preco;
    return indice;
  });
}

/** Índice do CDI (100 no mês `inicio`), a partir do CDI de cada mês em decimal. */
export function indiceCDI(cdiMensal, inicio) {
  let indice = 100;
  return cdiMensal.map((taxa, k) => {
    if (k < inicio) return null;
    if (k > inicio) indice *= 1 + (taxa || 0);
    return indice;
  });
}

/**
 * Retorno médio anual de um índice nos últimos `meses` meses.
 * NaN se o índice não existir no começo do período.
 */
export function retornoAnualizado(indice, meses) {
  const fim = indice.length - 1;
  const inicio = fim - meses;
  if (inicio < 0 || !indice[inicio] || !indice[fim]) return NaN;
  return Math.pow(indice[fim] / indice[inicio], 12 / meses) - 1;
}

/**
 * Proventos e Dividend Yield de cada ano civil.
 * DY do ano = proventos do ano ÷ preço no fim do ano (último mês com preço).
 * Devolve [{ ano, proventos, dividendYield }], do mais antigo ao mais novo.
 */
export function proventosPorAno(meses, fechamentos, proventos) {
  const anos = new Map();
  meses.forEach((mes, k) => {
    const ano = mes.slice(0, 4);
    const registro = anos.get(ano) || { ano, proventos: 0, preco: null };
    registro.proventos += proventos[k] || 0;
    if (fechamentos[k]) registro.preco = fechamentos[k];
    anos.set(ano, registro);
  });
  return [...anos.values()]
    .filter((r) => r.preco)
    .map((r) => ({ ano: r.ano, proventos: r.proventos, dividendYield: r.proventos / r.preco }));
}

// -----------------------------------------------------------------------------
// Regressão linear (mínimos quadrados)
// -----------------------------------------------------------------------------

/** Resolve o sistema A·x = b por eliminação de Gauss (A quadrada, pequena). */
function resolverSistema(A, b) {
  const n = A.length;
  const m = A.map((linha, i) => [...linha, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivo = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(m[i][c]) > Math.abs(m[pivo][c])) pivo = i;
    [m[c], m[pivo]] = [m[pivo], m[c]];
    if (Math.abs(m[c][c]) < 1e-12) return null; // colunas repetidas: sem solução única
    for (let i = 0; i < n; i++) {
      if (i === c) continue;
      const fator = m[i][c] / m[c][c];
      for (let j = c; j <= n; j++) m[i][j] -= fator * m[c][j];
    }
  }
  return m.map((linha, i) => linha[n] / linha[i]);
}

/** Inversa de uma matriz pequena (resolvendo um sistema por coluna). */
function inversa(A) {
  const n = A.length;
  const colunas = [];
  for (let j = 0; j < n; j++) {
    const coluna = resolverSistema(A, A.map((_, i) => (i === j ? 1 : 0)));
    if (!coluna) return null;
    colunas.push(coluna);
  }
  return A.map((_, i) => colunas.map((coluna) => coluna[i]));
}

/**
 * Regressão linear com intercepto: y = a + b1·x1 + b2·x2 + ...
 *   y        - lista de valores observados
 *   colunas  - lista de variáveis explicativas (cada uma, lista do tamanho de y)
 * Devolve { coeficientes: [a, b1, b2...], estatisticaT: [...], r2, n } ou null.
 *
 * A estatística t mede a confiança em cada coeficiente: em módulo acima de
 * ~2, é pouco provável que a relação observada seja só acaso.
 */
export function regressao(y, colunas) {
  const n = y.length;
  const k = colunas.length + 1;
  if (n <= k + 2) return null;
  const linhaX = (i) => [1, ...colunas.map((c) => c[i])];
  // Equações normais: (X'X)·b = X'y
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const x = linhaX(i);
    for (let a = 0; a < k; a++) {
      Xty[a] += x[a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += x[a] * x[b];
    }
  }
  const coeficientes = resolverSistema(XtX, Xty);
  const inv = inversa(XtX);
  if (!coeficientes || !inv) return null;
  const media = y.reduce((s, v) => s + v, 0) / n;
  let residuos = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const previsto = linhaX(i).reduce((s, v, j) => s + v * coeficientes[j], 0);
    residuos += (y[i] - previsto) ** 2;
    total += (y[i] - media) ** 2;
  }
  const variancia = residuos / (n - k);
  return {
    coeficientes,
    estatisticaT: coeficientes.map((c, j) => c / Math.sqrt(variancia * inv[j][j])),
    r2: total > 0 ? 1 - residuos / total : NaN,
    n,
  };
}

// -----------------------------------------------------------------------------
// Sensibilidade ao dólar e aos juros
// -----------------------------------------------------------------------------

export const JANELA_SENSIBILIDADE = 60; // meses (5 anos)
const MINIMO_DE_MESES = 36;
const T_SIGNIFICATIVO = 2;

/**
 * Quanto a ação costuma reagir ao dólar e aos juros, descontado o movimento
 * geral da bolsa. Regressão dos retornos mensais da ação (com proventos) em:
 *   - retorno do Ibovespa no mês (BOVA11);
 *   - variação do dólar no mês;
 *   - variação no mês da Selic esperada pelo mercado para o ano seguinte
 *     (Boletim Focus), em pontos percentuais. As ações reagem às mudanças nas
 *     expectativas, que antecipam as decisões do Banco Central.
 * Como o dólar e os juros também mexem com a bolsa toda, incluir o Ibovespa
 * separa o efeito próprio da empresa: um coeficiente de dólar positivo
 * significa que a ação vai MELHOR que a bolsa quando o dólar sobe.
 *
 * Devolve { n, mercado, dolar, juros, r2 } (cada fator: { coeficiente, t,
 * direcao }) ou null com menos de 3 anos de dados.
 *   dolar.coeficiente: variação da ação para cada 1 (=100%) de alta do dólar;
 *   juros.coeficiente: variação da ação para cada 1 ponto percentual de alta
 *                      na Selic esperada.
 */
export function sensibilidades(fechamentos, proventos, fatores, janela = JANELA_SENSIBILIDADE) {
  const indice = indiceRetornoTotal(fechamentos, proventos);
  // Retorno só quando houve preço nos dois meses (o índice repete o valor em
  // meses sem negócio, o que criaria retornos zero falsos).
  const acao = fechamentos.map((p, k) => (p && k > 0 && fechamentos[k - 1] ? indice[k] / indice[k - 1] - 1 : null));
  const mercado = retornosMensais(fatores.ibovespa);
  const dolar = retornosMensais(fatores.dolar);
  const juros = fatores.juros; // já é a variação de cada mês
  const y = [];
  const x = [[], [], []];
  for (let k = Math.max(1, fechamentos.length - janela); k < fechamentos.length; k++) {
    if ([acao[k], mercado[k], dolar[k], juros[k]].some((v) => v === null || !Number.isFinite(v))) continue;
    y.push(acao[k]);
    x[0].push(mercado[k]);
    x[1].push(dolar[k]);
    x[2].push(juros[k]);
  }
  if (y.length < MINIMO_DE_MESES) return null;
  const r = regressao(y, x);
  if (!r) return null;
  const fator = (j) => ({
    coeficiente: r.coeficientes[j],
    t: r.estatisticaT[j],
    direcao: direcao(r.coeficientes[j], r.estatisticaT[j]),
  });
  return { n: r.n, mercado: fator(1), dolar: fator(2), juros: fator(3), r2: r.r2 };
}

/** 'sobe', 'cai' ou 'neutra', conforme o sinal, se a relação for confiável. */
export function direcao(coeficiente, t) {
  if (!(Math.abs(t) >= T_SIGNIFICATIVO)) return 'neutra';
  return coeficiente > 0 ? 'sobe' : 'cai';
}
