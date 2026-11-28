// =============================================================================
// Ferramenta numérica para "resolver ao contrário" um cálculo.
//
// Exemplo: sabemos calcular quanto teremos aplicando X reais, mas queremos
// descobrir qual X leva a um valor desejado. O método da bisseção testa um
// valor no meio de um intervalo, descarta a metade em que a resposta não
// está, e repete até chegar perto o suficiente.
// =============================================================================

/**
 * Encontra x entre `minimo` e `maximo` tal que funcao(x) ≈ 0.
 * Requer que funcao(minimo) e funcao(maximo) tenham sinais opostos.
 * Retorna null se não houver solução no intervalo.
 */
export function bissecao(funcao, minimo, maximo, iteracoes = 80) {
  let fMin = funcao(minimo);
  const fMax = funcao(maximo);
  if (fMin === 0) return minimo;
  if (fMax === 0) return maximo;
  if (Math.sign(fMin) === Math.sign(fMax)) return null;

  for (let i = 0; i < iteracoes; i++) {
    const meio = (minimo + maximo) / 2;
    const fMeio = funcao(meio);
    if (fMeio === 0) return meio;
    if (Math.sign(fMeio) === Math.sign(fMin)) {
      minimo = meio;
      fMin = fMeio;
    } else {
      maximo = meio;
    }
  }
  return (minimo + maximo) / 2;
}

/**
 * Encontra o menor valor não negativo x tal que funcao(x) >= 0, sabendo que
 * funcao cresce com x (ex.: quanto mais se aplica, mais se resgata).
 * Dobra o limite superior até ultrapassar o alvo e então usa a bisseção.
 */
export function menorValorQueAtinge(funcao, palpiteInicial = 1000) {
  if (funcao(0) >= 0) return 0;
  let maximo = Math.max(palpiteInicial, 1);
  for (let i = 0; i < 60 && funcao(maximo) < 0; i++) maximo *= 2;
  if (funcao(maximo) < 0) return null; // inalcançável
  return bissecao(funcao, 0, maximo);
}
