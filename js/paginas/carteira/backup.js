// =============================================================================
// Aba "Backup": exportar a carteira para um arquivo, importar de um arquivo
// (para outro aparelho ou navegador) e apagar tudo.
// =============================================================================

import { carteiraVazia, validarCarteira } from './estado.js';
import { lerSalvo, salvar } from '../../util/armazenamento.js';

// A lista de ações acompanhadas (seção Ações) vai junto no arquivo.
const CHAVE_ACOMPANHADAS = 'acoes-acompanhadas';

export function montarBackup(elemento, pagina) {
  const { carteira } = pagina;
  const quantidade = carteira.operacoes.length + carteira.rendaFixa.length + carteira.outros.length;
  const acompanhadas = lerSalvo(CHAVE_ACOMPANHADAS, []).length;

  elemento.innerHTML = `
    <div class="cartao-resultado">
      <h3>Exportar</h3>
      <p>Salva um arquivo com todos os seus lançamentos (${quantidade}) e a lista de ações que você
        acompanha (${acompanhadas}). Guarde-o como cópia de segurança
        ou use-o para abrir a carteira em outro aparelho. O arquivo contém seus dados financeiros:
        guarde-o com cuidado.</p>
      <button type="button" class="botao-principal" data-exportar ${quantidade || acompanhadas ? '' : 'disabled'}>Exportar carteira</button>
    </div>

    <div class="cartao-resultado">
      <h3>Importar</h3>
      <p>Carrega um arquivo exportado pelo Tfinance. <strong>Substitui</strong> a carteira atual deste aparelho.</p>
      <label class="botao-secundario botao-arquivo">Escolher arquivo…
        <input type="file" accept=".json,application/json" data-importar hidden>
      </label>
      <p class="mensagem" aria-live="polite"></p>
    </div>

    <div class="cartao-resultado">
      <h3>Apagar</h3>
      <p>Remove todos os lançamentos deste aparelho. Não pode ser desfeito (a não ser que você tenha um arquivo exportado).</p>
      <button type="button" class="botao-perigo" data-apagar ${quantidade ? '' : 'disabled'}>Apagar a carteira</button>
    </div>`;

  const mensagem = elemento.querySelector('.mensagem');

  elemento.querySelector('[data-exportar]').addEventListener('click', () => {
    const texto = JSON.stringify({
      aplicativo: 'Tfinance', exportadoEm: new Date().toISOString(), ...carteira,
      acoesAcompanhadas: lerSalvo(CHAVE_ACOMPANHADAS, []),
    }, null, 1);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    link.download = `tfinance-carteira-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  elemento.querySelector('[data-importar]').addEventListener('change', async (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    try {
      const conteudo = JSON.parse(await arquivo.text());
      const nova = validarCarteira(conteudo);
      const total = nova.operacoes.length + nova.rendaFixa.length + nova.outros.length;
      if (quantidade && !window.confirm(`Substituir a carteira atual (${quantidade} lançamentos) pela do arquivo (${total})?`)) return;
      if (Array.isArray(conteudo.acoesAcompanhadas)) {
        salvar(CHAVE_ACOMPANHADAS, conteudo.acoesAcompanhadas.filter((c) => typeof c === 'string' && /^[A-Z0-9]{4,6}$/.test(c)));
      }
      pagina.alterar(nova);
      pagina.irPara('resumo');
    } catch (erro) {
      mensagem.className = 'mensagem erro';
      mensagem.textContent = `Não foi possível importar: ${erro.message}`;
    }
  });

  elemento.querySelector('[data-apagar]').addEventListener('click', () => {
    if (window.confirm('Apagar todos os lançamentos da carteira deste aparelho?')) {
      pagina.alterar(carteiraVazia());
      pagina.irPara('resumo');
    }
  });
}
