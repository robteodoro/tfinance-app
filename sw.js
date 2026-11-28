// =============================================================================
// Service worker: guarda cópias dos arquivos do aplicativo no aparelho, para
// que ele abra rápido e funcione mesmo sem internet.
//
// Estratégia:
//   - Arquivos do app (HTML, CSS, JS, ícones): usa a cópia guardada e, em
//     segundo plano, busca a versão nova para a próxima visita.
//   - Dados (pasta dados/): tenta sempre a versão mais recente; sem internet,
//     usa a última cópia guardada.
//
// Ao publicar mudanças importantes, aumente VERSAO para descartar o cache antigo.
// =============================================================================

const VERSAO = 'tfinance-v12';
const ESSENCIAIS = ['./', 'index.html', 'css/estilo.css', 'js/app.js', 'manifest.webmanifest', 'icones/icone.svg'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== location.origin) return;

  if (pedido.url.includes('/dados/')) {
    evento.respondWith(primeiroRede(pedido));
  } else {
    evento.respondWith(primeiroCache(pedido));
  }
});

async function primeiroRede(pedido) {
  const cache = await caches.open(VERSAO);
  try {
    const resposta = await fetch(pedido);
    if (resposta.ok) cache.put(pedido, resposta.clone());
    return resposta;
  } catch {
    return (await cache.match(pedido)) || Response.error();
  }
}

async function primeiroCache(pedido) {
  const cache = await caches.open(VERSAO);
  const guardada = await cache.match(pedido);
  const atualizacao = fetch(pedido)
    .then((resposta) => {
      if (resposta.ok) cache.put(pedido, resposta.clone());
      return resposta;
    })
    .catch(() => guardada);
  return guardada || atualizacao;
}
