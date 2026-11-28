// =============================================================================
// Carregamento dos arquivos de dados gerados pela atualização automática
// (pasta site/dados). Cada arquivo é baixado uma única vez por visita, exceto
// as cotações do pregão, que mudam a cada meia hora: essas são baixadas de
// novo quando a cópia guardada tem mais de alguns minutos.
// =============================================================================

const cache = new Map();
const VALIDADE = { intradiario: 5 * 60 * 1000 }; // milissegundos

/** Carrega site/dados/<nome>.json. Retorna null se não estiver disponível. */
export function carregarDados(nome) {
  const guardado = cache.get(nome);
  const vencido = guardado && VALIDADE[nome] && Date.now() - guardado.quando > VALIDADE[nome];
  if (!guardado || vencido) {
    // "no-cache": pergunta ao servidor se há versão nova (o navegador pode guardar).
    const opcoes = VALIDADE[nome] ? { cache: 'no-cache' } : undefined;
    const promessa = fetch(`dados/${nome}.json`, opcoes)
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .catch(() => null);
    cache.set(nome, { promessa, quando: Date.now() });
  }
  return cache.get(nome).promessa;
}
