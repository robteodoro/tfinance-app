// =============================================================================
// Pequenos auxiliares para montar a interface.
// =============================================================================

/** Protege texto para ser inserido em HTML. */
export function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Atalho para document.querySelector dentro de um elemento. */
export function $(raiz, seletor) {
  return raiz.querySelector(seletor);
}

/** Executa `funcao` só depois que o usuário parar de digitar por `espera` ms. */
export function aoParar(funcao, espera = 250) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcao(...args), espera);
  };
}
