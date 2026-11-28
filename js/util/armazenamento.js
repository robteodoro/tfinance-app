// =============================================================================
// Guarda preferências e dados pessoais NO PRÓPRIO NAVEGADOR (localStorage).
// Nada é enviado para servidores: cada pessoa vê apenas os próprios dados.
// =============================================================================

const PREFIXO = 'tfinance:';

export function lerSalvo(chave, padrao) {
  try {
    const texto = localStorage.getItem(PREFIXO + chave);
    return texto === null ? padrao : JSON.parse(texto);
  } catch {
    return padrao;
  }
}

export function salvar(chave, valor) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // Armazenamento indisponível (ex.: navegação privada): apenas ignora.
  }
}
