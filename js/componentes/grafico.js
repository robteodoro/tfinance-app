// =============================================================================
// Gráfico de linhas simples, desenhado em SVG (sem bibliotecas externas).
//
// Uso:
//   desenharGrafico(elemento, {
//     series: [{ nome: 'Valor líquido', cor: 'var(--cor-1)', pontos: [{x, y}, ...] }],
//     formatarX: (x) => `${x} meses`,
//     formatarY: (y) => formatarMoeda(y),
//   });
//
// Passar o mouse (ou o dedo) sobre o gráfico mostra os valores daquele ponto.
// =============================================================================

const MARGEM = { topo: 16, direita: 24, base: 32, esquerda: 72 };

/** Escolhe ~5 valores "redondos" para as marcações do eixo. */
function marcacoes(minimo, maximo, quantidade = 5) {
  if (minimo === maximo) return [minimo];
  const passoBruto = (maximo - minimo) / quantidade;
  const potencia = Math.pow(10, Math.floor(Math.log10(passoBruto)));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= passoBruto);
  const lista = [];
  for (let i = Math.ceil(minimo / passo); i * passo <= maximo + passo * 1e-9; i++) {
    lista.push(i * passo + 0); // "+ 0" evita exibir "-0"
  }
  return lista;
}

/** Marcações "redondas" (1, 2, 5, 10, 20, 50...) para a escala logarítmica. */
function marcacoesLog(minimo, maximo) {
  const todas = [];
  for (let potencia = Math.floor(Math.log10(minimo)); potencia <= Math.ceil(Math.log10(maximo)); potencia++) {
    for (const base of [1, 2, 5]) {
      const v = base * 10 ** potencia;
      if (v >= minimo && v <= maximo) todas.push(v);
    }
  }
  // Muitas linhas: fica só com as potências de 10 (e o 1-2-5 se sobrar pouco).
  const potenciaDe10 = (v) => Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-9;
  return todas.length > 7 ? todas.filter(potenciaDe10) : todas;
}

/** Formata valores do eixo Y de forma compacta: 1,2 mil; 3,4 mi. */
function compacto(valor) {
  return valor.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
}

export function desenharGrafico(elemento, {
  series, formatarX = String, formatarY = String, formatarEixoY = compacto, comecarDoZero = false,
  marcacoesX = null, formatarEixoX = formatarX, escalaLog = false,
}) {
  // O desenho usa o tamanho real do espaço disponível, para o texto não ficar
  // gigante em telas largas nem minúsculo no celular.
  const LARGURA = Math.max(320, Math.min(1100, (elemento.clientWidth || 640) - 26));
  const ALTURA = Math.round(Math.min(360, Math.max(220, LARGURA * 0.45)));

  const todos = series.flatMap((s) => s.pontos);
  if (todos.length === 0) {
    elemento.innerHTML = '';
    return;
  }
  const xMin = Math.min(...todos.map((p) => p.x));
  const xMax = Math.max(...todos.map((p) => p.x));
  const yMinDados = Math.min(...todos.map((p) => p.y));
  const yMaxDados = Math.max(...todos.map((p) => p.y));
  const folga = (yMaxDados - yMinDados) * 0.08 || Math.abs(yMaxDados) * 0.05 || 1;
  // Por padrão o eixo vertical se ajusta aos dados, para as diferenças
  // ficarem visíveis; com comecarDoZero o eixo parte de zero.
  const yMin = comecarDoZero ? Math.min(0, yMinDados) : yMinDados - folga;
  const yMax = yMaxDados + folga;

  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  const px = (x) => MARGEM.esquerda + ((x - xMin) / (xMax - xMin || 1)) * larguraUtil;
  let py = (y) => MARGEM.topo + (1 - (y - yMin) / (yMax - yMin)) * alturaUtil;
  let linhasDeGrade = marcacoes(yMin, yMax);
  // Escala logarítmica: distâncias iguais na vertical = variações percentuais
  // iguais (de 100 para 200 ocupa o mesmo espaço que de 1.000 para 2.000).
  // Usada quando os valores vão de muito pequenos a muito grandes.
  if (escalaLog && yMinDados > 0) {
    const lMin = Math.log10(yMinDados) - 0.04;
    const lMax = Math.log10(yMaxDados) + 0.04;
    py = (y) => MARGEM.topo + (1 - (Math.log10(y) - lMin) / (lMax - lMin)) * alturaUtil;
    linhasDeGrade = marcacoesLog(10 ** lMin, 10 ** lMax);
  }

  const grade = linhasDeGrade.map((v) => `
    <line class="grade" x1="${MARGEM.esquerda}" x2="${LARGURA - MARGEM.direita}" y1="${py(v)}" y2="${py(v)}"/>
    <text class="eixo" x="${MARGEM.esquerda - 8}" y="${py(v) + 4}" text-anchor="end">${formatarEixoY(v)}</text>`).join('');

  // Rótulos do eixo horizontal. Estimamos a largura de cada texto (cerca de
  // 7 pixels por letra) e descartamos os que encostariam no anterior — assim
  // nada se sobrepõe, mesmo na tela estreita do celular.
  const LARGURA_LETRA = 7;
  const candidatos = (marcacoesX || marcacoes(xMin, xMax, 6)).filter((v) => v >= xMin && v <= xMax);
  const rotulosX = [];
  let fimDoAnterior = -Infinity;
  for (const v of candidatos) {
    const texto = formatarEixoX(v);
    const largura = texto.length * LARGURA_LETRA;
    // Perto das bordas o texto é alinhado pela ponta, para não ser cortado.
    const ancora = px(v) > LARGURA - largura / 2 - 4 ? 'end' : px(v) < MARGEM.esquerda + largura / 2 ? 'start' : 'middle';
    const inicio = ancora === 'end' ? px(v) - largura : ancora === 'start' ? px(v) : px(v) - largura / 2;
    if (inicio < fimDoAnterior + 12) continue;
    fimDoAnterior = inicio + largura;
    rotulosX.push(`<text class="eixo" x="${px(v)}" y="${ALTURA - 10}" text-anchor="${ancora}">${texto}</text>`);
  }
  const eixoX = rotulosX.join('');

  const linhas = series.map((s) => {
    const d = s.pontos.map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join('');
    const tracejado = s.tracejado ? 'stroke-dasharray="6 4"' : '';
    return `<path d="${d}" fill="none" stroke="${s.cor}" stroke-width="2.5" ${tracejado}/>`;
  }).join('');

  const legenda = series.map((s) => `
    <span class="item-legenda"><span class="amostra" style="background:${s.cor}"></span>${s.nome}</span>`).join('');

  elemento.innerHTML = `
    <div class="grafico">
      <div class="legenda">${legenda}</div>
      <div class="area-grafico">
        <svg viewBox="0 0 ${LARGURA} ${ALTURA}" role="img" aria-label="Gráfico de evolução">
          ${grade}${eixoX}${linhas}
          <line class="cursor" y1="${MARGEM.topo}" y2="${ALTURA - MARGEM.base}" visibility="hidden"/>
        </svg>
        <div class="dica" hidden></div>
      </div>
    </div>`;

  // Interação: mostrar valores do ponto mais próximo do cursor.
  const svg = elemento.querySelector('svg');
  const cursor = elemento.querySelector('.cursor');
  const dica = elemento.querySelector('.dica');
  const xs = [...new Set(todos.map((p) => p.x))].sort((a, b) => a - b);

  function mostrar(evento) {
    const caixa = svg.getBoundingClientRect();
    const xSvg = ((evento.clientX - caixa.left) / caixa.width) * LARGURA;
    const xDado = xMin + ((xSvg - MARGEM.esquerda) / larguraUtil) * (xMax - xMin);
    const x = xs.reduce((melhor, v) => (Math.abs(v - xDado) < Math.abs(melhor - xDado) ? v : melhor), xs[0]);
    cursor.setAttribute('x1', px(x));
    cursor.setAttribute('x2', px(x));
    cursor.setAttribute('visibility', 'visible');
    const linhasDica = series.map((s) => {
      const ponto = s.pontos.find((p) => p.x === x);
      return ponto ? `<div><span class="amostra" style="background:${s.cor}"></span>${s.nome}: <strong>${formatarY(ponto.y)}</strong></div>` : '';
    }).join('');
    dica.innerHTML = `<div class="dica-titulo">${formatarX(x)}</div>${linhasDica}`;
    dica.hidden = false;
    const posicao = (px(x) / LARGURA) * caixa.width;
    dica.style.left = posicao > caixa.width / 2 ? '' : `${posicao + 12}px`;
    dica.style.right = posicao > caixa.width / 2 ? `${caixa.width - posicao + 12}px` : '';
  }

  svg.addEventListener('pointermove', mostrar);
  svg.addEventListener('pointerdown', mostrar);
  svg.addEventListener('pointerleave', () => {
    cursor.setAttribute('visibility', 'hidden');
    dica.hidden = true;
  });
}
