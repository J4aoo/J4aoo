// Gera perfil.svg no estilo "terminal neon" sobre chuva Matrix, com dados reais do GitHub.
// Uso: node gen-skin.js <pasta-de-dados> <saida.svg>
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const [dataDir, out] = process.argv.slice(2);
const read = f => fs.readFileSync(path.join(dataDir, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const NAME = 'Lima';
const user = JSON.parse(read('user.json'));
const repos = JSON.parse(read('repos.json')).filter(r => !r.fork);
const HANDLE = user.login;
const BIO = user.bio || '';

// Linguagens somadas de todos os repositórios
const langBytes = {};
for (const r of repos) {
  const f = `lang-${r.name}.json`;
  if (!fs.existsSync(path.join(dataDir, f))) continue;
  for (const [k, v] of Object.entries(JSON.parse(read(f)))) langBytes[k] = (langBytes[k] || 0) + v;
}
const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);
const langs = Object.entries(langBytes).sort((a, b) => b[1] - a[1])
  .map(([name, b]) => ({ name, pct: (b / totalBytes) * 100 }));
const LANG_COLORS = { TypeScript: '#3178c6', JavaScript: '#f1e05a', CSS: '#8f5bd6', HTML: '#e34c26', Python: '#3572a5' };
const pct = p => (p >= 10 ? Math.round(p) : p.toFixed(1)).toString().replace('.', ',') + '%';

// Calendário de contribuições
const html = read('contrib.html');
const cells = {};
for (const m of html.matchAll(/<td[^>]*data-date="([^"]+)"[^>]*id="contribution-day-component-(\d+)-(\d+)"[^>]*data-level="(\d)"/g)) {
  cells[`${m[2]}-${m[3]}`] = { date: m[1], row: +m[2], col: +m[3], level: +m[4], count: 0 };
}
for (const m of html.matchAll(/for="contribution-day-component-(\d+)-(\d+)"[^>]*>(\d+) contributions?/g)) {
  const c = cells[`${m[1]}-${m[2]}`];
  if (c) c.count = +m[3];
}
const days = Object.values(cells);
const totalContrib = days.reduce((a, c) => a + c.count, 0);
const activeDays = days.filter(c => c.level > 0).length;
const weeks = Math.max(...days.map(c => c.col)) + 1;

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataBR = iso => { const d = new Date(iso); return `${d.getUTCDate()} ${meses[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

const W = 1200, H = 1990;
const SANS = '-apple-system,BlinkMacSystemFont,&quot;SF Pro Display&quot;,&quot;Segoe UI&quot;,Helvetica,Arial,sans-serif';
const MONO = '&quot;SF Mono&quot;,Menlo,Consolas,&quot;Liberation Mono&quot;,monospace';
const G = '#39d353', G2 = '#7ee787', DIM = '#8b949e';

function rain() {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789{}<>/=;$#';
  let s = '';
  for (let x = 10; x < W; x += 24) {
    const dur = 16 + rand() * 12;
    for (let k = 0; k < 3; k++) {
      const n = 8 + Math.floor(rand() * 12);
      const delay = -(rand() * dur / 3 + k * dur / 3);
      let t = '';
      for (let i = 0; i < n; i++) {
        const head = i === n - 1;
        const op = head ? 0.9 : (0.08 + 0.45 * (i / n)).toFixed(2);
        t += `<tspan x="${x}" dy="22" fill="${head ? '#d7ffe4' : '#30d158'}" fill-opacity="${op}">${esc(glyphs[Math.floor(rand() * glyphs.length)])}</tspan>`;
      }
      s += `<text class="r" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s">${t}</text>\n`;
    }
  }
  return s;
}

let cardN = 0;
function card(x, y, w, h, inner) {
  const id = `k${cardN++}`;
  return `<g>
  <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22"/></clipPath>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="#020704" fill-opacity=".9"/>
  <g clip-path="url(#${id})">
    <ellipse class="glow" cx="${x + w * 0.18}" cy="${y}" rx="${w * 0.32}" ry="${Math.min(h, 260) * 0.75}" fill="url(#gGreen)"/>
    <ellipse class="glow g2" cx="${x + w * 0.62}" cy="${y + 40}" rx="${w * 0.22}" ry="${Math.min(h, 260) * 0.5}" fill="url(#gTeal)"/>
    <ellipse class="glow g3" cx="${x + w * 0.55}" cy="${y + h}" rx="${w * 0.25}" ry="90" fill="url(#gOlive)"/>
    <ellipse class="glow g2" cx="${x + w}" cy="${y + h}" rx="${w * 0.14}" ry="110" fill="url(#gViolet)"/>
    ${inner}
  </g>
  <rect x="${x + .5}" y="${y + .5}" width="${w - 1}" height="${h - 1}" rx="22" fill="none" stroke="${G}" stroke-opacity=".55"/>
</g>`;
}
const frame = (x, y, w, h, rx = 18) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="#000" fill-opacity=".35" stroke="${G}" stroke-opacity=".35"/>`;
const label = (x, y, t) => `<text x="${x}" y="${y}" class="mono" font-size="11" font-weight="700" fill="${G2}" letter-spacing="2.5">${t}</text>`;

(async () => {
  const avatar = await Jimp.read(path.join(dataDir, 'avatar.png'));

  // ASCII do avatar
  const cols = 74, rows = 40;
  const small = avatar.clone().resize(cols, rows).greyscale();
  const lum = [];
  small.scan(0, 0, cols, rows, (x, y, i) => lum.push(small.bitmap.data[i]));
  // Equaliza pelo ranking de brilho para usar a escala inteira de caracteres
  const sorted = [...lum].sort((a, b) => a - b);
  const ramp = ' .:-=+*#%@';
  const asciiLines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const v = sorted.indexOf(lum[y * cols + x]) / lum.length;
      line += ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
    }
    asciiLines.push(line);
  }
  const avatarData = await avatar.clone().resize(180, 180).quality(82).getBase64Async(Jimp.MIME_JPEG);

  let c = '';
  const X = 40, CW = W - 80;

  // 1. Cabeçalho
  const hy = 40, hh = 270;
  const ax = X + 120, ay = hy + 118;
  c += card(X, hy, CW, hh, `
    ${frame(X + 30, hy + 30, CW - 60, hh - 60, 26)}
    <clipPath id="av"><circle cx="${ax}" cy="${ay}" r="60"/></clipPath>
    <image href="${avatarData}" x="${ax - 60}" y="${ay - 60}" width="120" height="120" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="${ax}" cy="${ay}" r="62" fill="none" stroke="${G}" stroke-width="4"/>
    <circle class="ring" cx="${ax}" cy="${ay}" r="62" fill="none" stroke="${G}" stroke-width="2"/>
    <text x="${X + 230}" y="${hy + 92}" class="mono" font-size="20" font-weight="700" fill="${G}" letter-spacing="4">@${esc(HANDLE.toLowerCase())}</text>
    <path d="M ${X + 400} ${hy + 76} Q ${X + 520} ${hy + 60} ${X + 650} ${hy + 92}" fill="none" stroke="${G}" stroke-opacity=".5" stroke-width="2" class="draw"/>
    <text x="${X + 226}" y="${hy + 166}" class="sans" font-size="76" font-weight="800" fill="url(#gName)" letter-spacing="-2">${esc(NAME)}<tspan class="blink" fill="${G}">_</tspan></text>
    <text x="${X + 230}" y="${hy + 206}" class="sans" font-size="22" fill="#c9d1d9">${esc(BIO)}</text>
    ${(() => {
      let s = '', px = X + 230;
      for (const l of langs.slice(0, 4)) {
        const w = 40 + l.name.length * 11;
        s += `<rect x="${px}" y="${hy + 216}" width="${w}" height="34" rx="17" fill="#000" fill-opacity=".3" stroke="${G}" stroke-opacity=".7"/>
        <text x="${px + w / 2}" y="${hy + 238}" class="sans" font-size="16" font-weight="700" fill="${G2}" text-anchor="middle">${l.name}</text>`;
        px += w + 14;
      }
      return s;
    })()}
    <circle cx="${X + CW - 160}" cy="${hy + 120}" r="46" fill="none" stroke="${G}" stroke-opacity=".12"/>
    <circle cx="${X + CW - 160}" cy="${hy + 120}" r="26" fill="none" stroke="${G}" stroke-opacity=".18"/>
    <g class="orbit" style="transform-origin:${X + CW - 160}px ${hy + 120}px"><circle cx="${X + CW - 160}" cy="${hy + 74}" r="5" fill="${G}"/></g>
    <circle class="pulse" cx="${X + CW - 160}" cy="${hy + 120}" r="5" fill="${G}"/>`);

  // 2. Terminal profile-scan
  const ty = hy + hh + 30, th = 560;
  const lp = { x: X + 24, y: ty + 64, w: 480, h: th - 88 };
  const rp = { x: lp.x + lp.w + 20, y: lp.y, w: CW - 48 - lp.w - 20, h: lp.h };
  const lineH = (lp.h - 60) / rows;
  const asciiW = lp.w - 40;
  const info = [
    ['Nome', NAME],
    ['Usuário', '@' + HANDLE],
    ['Bio', BIO],
    ['Status', 'Construindo | Aprendendo | Entregando'],
    ['Linguagens', langs.map(l => l.name).join(', ')],
    ['Repositórios', repos.length],
    ['Contribuições', `${totalContrib} no último ano`],
    ['Dias ativos', activeDays],
    ['Contato', `github.com/${HANDLE}`],
  ];
  const rowGap = (rp.h - 80) / info.length;
  c += card(X, ty, CW, th, `
    <rect x="${X}" y="${ty}" width="${CW}" height="44" fill="#000" fill-opacity=".45"/>
    <rect x="${X}" y="${ty + 44}" width="${CW}" height="1" fill="${G}" fill-opacity=".45"/>
    <circle cx="${X + 24}" cy="${ty + 22}" r="6" fill="#ff5f57"/><circle cx="${X + 44}" cy="${ty + 22}" r="6" fill="#febc2e"/><circle cx="${X + 64}" cy="${ty + 22}" r="6" fill="#28c840"/>
    <text x="${X + CW / 2}" y="${ty + 27}" class="mono" font-size="13" fill="#c9d1d9" text-anchor="middle">${esc(NAME.toLowerCase())}@github ~ $ ./profile-scan --live</text>
    <circle class="pulse" cx="${X + CW - 70}" cy="${ty + 22}" r="5" fill="${G}"/>
    <text x="${X + CW - 58}" y="${ty + 27}" class="mono" font-size="12" font-weight="700" fill="${G}" letter-spacing="2">LIVE</text>

    ${frame(lp.x, lp.y, lp.w, lp.h)}
    ${label(lp.x + 18, lp.y + 26, 'VISUAL.MAP')}
    <clipPath id="map"><rect x="${lp.x}" y="${lp.y}" width="${lp.w}" height="${lp.h}" rx="18"/></clipPath>
    <g clip-path="url(#map)">
      ${asciiLines.map((l, i) => `<text x="${lp.x + 20}" y="${(lp.y + 50 + i * lineH).toFixed(1)}" class="mono" font-size="10.5" fill="${G}" textLength="${asciiW}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${esc(l)}</text>`).join('\n')}
      <g class="scan"><rect x="${lp.x}" y="${lp.y}" width="${lp.w}" height="60" fill="url(#gScan)"/><rect x="${lp.x}" y="${lp.y + 58}" width="${lp.w}" height="2" fill="${G2}" fill-opacity=".8"/></g>
    </g>

    ${frame(rp.x, rp.y, rp.w, rp.h)}
    ${label(rp.x + 18, rp.y + 26, 'SYSTEM.INFO')}
    ${info.map(([k, v], i) => {
      const y = rp.y + 70 + i * rowGap;
      return `<g class="row" style="animation-delay:${(0.4 + i * 0.18).toFixed(2)}s">
      <text x="${rp.x + 22}" y="${y}" class="mono" font-size="15" font-weight="700" fill="${G}">${esc(k)}</text>
      <line x1="${rp.x + 160}" y1="${y - 4}" x2="${rp.x + 200}" y2="${y - 4}" stroke="${DIM}" stroke-opacity=".5" stroke-dasharray="2 5"/>
      <text x="${rp.x + 214}" y="${y}" class="mono" font-size="15" fill="${G2}">${esc(v)}</text></g>`;
    }).join('\n')}`);

  // 3. Projetos
  const py = ty + th + 30, ph = 320;
  const pc = { y: py + 104, w: (CW - 48 - 20) / 2, h: 192 };
  const projCard = (r, i) => {
    const x = X + 24 + i * (pc.w + 20), y = pc.y;
    const lb = langBytesOf(r.name);
    const tot = Object.values(lb).reduce((a, b) => a + b, 0);
    const main = r.language;
    const mainPct = main && tot ? (lb[main] / tot) * 100 : 0;
    const circ = 2 * Math.PI * 30;
    return `${frame(x, y, pc.w, pc.h, 16)}
    <rect x="${x}" y="${y + 36}" width="${pc.w}" height="1" fill="${G}" fill-opacity=".3"/>
    <text x="${x + 20}" y="${y + 23}" class="mono" font-size="13" fill="${G2}">• ${esc(r.name)}</text>
    <circle class="pulse" cx="${x + pc.w - 20}" cy="${y + 18}" r="5" fill="${G}" style="animation-delay:${i * 0.5}s"/>
    <text x="${x + 20}" y="${y + 74}" class="mono" font-size="22" font-weight="700" fill="${G2}">${esc(r.name)} <tspan class="blink" fill="${G}">_</tspan></text>
    <text x="${x + 20}" y="${y + 102}" class="mono" font-size="14" fill="#c9d1d9">${esc(r.description || '')}</text>
    ${main ? `<rect x="${x + 20}" y="${y + 124}" width="${main.length * 9 + 28}" height="24" rx="12" fill="#000" fill-opacity=".3" stroke="${G}" stroke-opacity=".7"/>
    <text x="${x + 34}" y="${y + 141}" class="mono" font-size="12" fill="${G2}">${esc(main)}</text>` : ''}
    <text x="${x + 20}" y="${y + 176}" class="mono" font-size="13" fill="${DIM}"><tspan fill="${G}">★</tspan> ${r.stargazers_count}   atualizado ${dataBR(r.pushed_at)}</text>
    ${main ? `<circle cx="${x + pc.w - 70}" cy="${y + 108}" r="30" fill="none" stroke="#21262d" stroke-width="8"/>
    <circle class="donut" cx="${x + pc.w - 70}" cy="${y + 108}" r="30" fill="none" stroke="${LANG_COLORS[main] || G}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${circ.toFixed(1)}" style="--off:${(circ * (1 - mainPct / 100)).toFixed(1)};--circ:${circ.toFixed(1)}" transform="rotate(-90 ${x + pc.w - 70} ${y + 108})"/>
    <text x="${x + pc.w - 70}" y="${y + 113}" class="mono" font-size="13" font-weight="700" fill="${G2}" text-anchor="middle">${Math.round(mainPct)}%</text>` : ''}`;
  };
  function langBytesOf(name) {
    const f = path.join(dataDir, `lang-${name}.json`);
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  }
  const shownRepos = [...repos].sort((a, b) => (b.language ? 1 : 0) - (a.language ? 1 : 0)).slice(0, 2);
  c += card(X, py, CW, ph, `
    <text x="${X + 34}" y="${py + 52}" class="mono" font-size="17" font-weight="700" fill="${G}" letter-spacing="3">PROJETOS</text>
    <text x="${X + 190}" y="${py + 52}" class="mono" font-size="14" fill="#c9d1d9">./projetos.sh --all</text>
    <text x="${X + CW - 34}" y="${py + 52}" class="mono" font-size="14" fill="#c9d1d9" text-anchor="end">${repos.length} projetos</text>
    <rect x="${X + 34}" y="${py + 72}" width="${CW - 68}" height="2" fill="${G}" fill-opacity=".6"/>
    ${shownRepos.map(projCard).join('\n')}`);

  // 4. Linguagens
  const ly = py + ph + 30, lh = 300;
  const barX = X + 440, barW = CW - 440 - 90;
  c += card(X, ly, CW, lh, `
    ${frame(X + 30, ly + 30, CW - 60, lh - 60, 24)}
    <text x="${X + 64}" y="${ly + 92}" class="sans" font-size="36" font-weight="800" fill="url(#gName)">Linguagens</text>
    <text x="${X + 66}" y="${ly + 124}" class="sans" font-size="17" font-weight="600" fill="${G2}" letter-spacing=".5">Proporção de código nos repositórios</text>
    <text x="${X + CW - 90}" y="${ly + 92}" class="mono" font-size="17" font-weight="700" fill="${G}" text-anchor="end">&gt; stack.scan</text>
    ${langs.slice(0, 5).map((l, i) => {
      const y = ly + 168 + i * 40;
      const col = LANG_COLORS[l.name] || G;
      return `<circle cx="${X + 74}" cy="${y - 6}" r="7" fill="${col}"/>
      <text x="${X + 96}" y="${y}" class="sans" font-size="19" font-weight="700" fill="${G2}">${esc(l.name)}</text>
      <text x="${X + 400}" y="${y}" class="mono" font-size="16" font-weight="700" fill="${col}" text-anchor="end">${pct(l.pct)}</text>
      <rect x="${barX}" y="${y - 12}" width="${barW}" height="10" rx="5" fill="#21262d"/>
      <rect class="bar" style="animation-delay:${(0.2 + i * 0.15).toFixed(2)}s" x="${barX}" y="${y - 12}" width="${Math.max(10, barW * l.pct / 100).toFixed(1)}" height="10" rx="5" fill="${col}"/>`;
    }).join('\n')}`);

  // 5. Contribuições
  const cy = ly + lh + 30, ch = H - cy - 40;
  const cell = 15, cg = 4;
  const gx = X + 64, gy = cy + 150;
  const levels = ['#0d1a10', '#0e4429', '#006d32', '#26a641', '#39d353'];
  c += card(X, cy, CW, ch, `
    ${frame(X + 30, cy + 30, CW - 60, ch - 60, 24)}
    <text x="${X + 64}" y="${cy + 92}" class="sans" font-size="36" font-weight="800" fill="url(#gName)">Atividade de contribuições</text>
    <text x="${X + 66}" y="${cy + 124}" class="sans" font-size="17" font-weight="600" fill="${G2}" letter-spacing=".5">${totalContrib} contribuições no último ano</text>
    <text x="${X + CW - 250}" y="${cy + 92}" class="sans" font-size="15" fill="${DIM}" text-anchor="end">Menos</text>
    ${levels.map((col, i) => `<rect x="${X + CW - 240 + i * 22}" y="${cy + 79}" width="16" height="16" rx="3" fill="${col}"/>`).join('')}
    <text x="${X + CW - 124}" y="${cy + 92}" class="sans" font-size="15" fill="${DIM}">Mais</text>
    ${days.map(d => `<rect class="cell${d.level ? ' on' : ''}" style="animation-delay:${(d.col * 0.025).toFixed(2)}s" x="${gx + d.col * (cell + cg)}" y="${gy + d.row * (cell + cg)}" width="${cell}" height="${cell}" rx="3" fill="${levels[d.level]}"/>`).join('')}`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${NAME} (@${HANDLE}) — ${BIO} Linguagens: ${langs.map(l => `${l.name} ${pct(l.pct)}`).join(', ')}. ${totalContrib} contribuições no último ano.`)}">
<style>
.sans{font-family:${SANS}}
.mono{font-family:${MONO}}
.r{animation:fall linear infinite;font-family:${MONO};font-size:17px}
@keyframes fall{from{transform:translateY(-480px)}to{transform:translateY(${H + 40}px)}}
.blink{animation:blink 1.05s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.pulse{animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{50%{opacity:.25}}
.ring{transform-box:fill-box;transform-origin:center;animation:ring 2.4s ease-out infinite}
@keyframes ring{from{transform:scale(1);opacity:.8}to{transform:scale(1.25);opacity:0}}
.orbit{animation:orbit 7s linear infinite}
@keyframes orbit{to{transform:rotate(360deg)}}
.glow{animation:glow 6s ease-in-out infinite alternate}.g2{animation-duration:8s}.g3{animation-duration:10s}
@keyframes glow{from{opacity:.65}to{opacity:1}}
.draw{stroke-dasharray:300;stroke-dashoffset:300;animation:draw 1.6s .4s ease-out forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.scan{animation:scan 4.5s linear infinite}
@keyframes scan{from{transform:translateY(-60px)}to{transform:translateY(${th - 88}px)}}
.row{opacity:0;animation:row .5s ease-out forwards}
@keyframes row{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.donut{stroke-dashoffset:var(--circ);animation:donut 1.4s .6s ease-out forwards}
@keyframes donut{to{stroke-dashoffset:var(--off)}}
.bar{transform-box:fill-box;transform-origin:left;transform:scaleX(0);animation:bar 1.2s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes bar{to{transform:scaleX(1)}}
.cell{opacity:0;animation:cell .4s ease-out forwards}
@keyframes cell{to{opacity:1}}
.on{animation:cell .4s ease-out forwards,pulse 2.4s 2s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){
  .r,.scan,.orbit,.ring,.glow,.blink,.pulse{animation:none}
  .row,.cell,.on{animation:none;opacity:1}
  .draw{animation:none;stroke-dashoffset:0}
  .donut{animation:none;stroke-dashoffset:var(--off)}
  .bar{animation:none;transform:none}
}
</style>
<defs>
  <clipPath id="outer"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  <radialGradient id="gGreen"><stop offset="0" stop-color="#1ea83c" stop-opacity=".55"/><stop offset="1" stop-color="#1ea83c" stop-opacity="0"/></radialGradient>
  <radialGradient id="gTeal"><stop offset="0" stop-color="#0c7a5a" stop-opacity=".35"/><stop offset="1" stop-color="#0c7a5a" stop-opacity="0"/></radialGradient>
  <radialGradient id="gOlive"><stop offset="0" stop-color="#7a7a0c" stop-opacity=".4"/><stop offset="1" stop-color="#7a7a0c" stop-opacity="0"/></radialGradient>
  <radialGradient id="gViolet"><stop offset="0" stop-color="#3a1fa8" stop-opacity=".45"/><stop offset="1" stop-color="#3a1fa8" stop-opacity="0"/></radialGradient>
  <linearGradient id="gName" x1="0" x2="1"><stop offset="0" stop-color="#2ea043"/><stop offset="1" stop-color="#7ee787"/></linearGradient>
  <linearGradient id="gScan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${G}" stop-opacity="0"/><stop offset="1" stop-color="${G}" stop-opacity=".18"/></linearGradient>
</defs>
<g clip-path="url(#outer)">
  <rect width="${W}" height="${H}" fill="#000"/>
  <g opacity=".7">${rain()}</g>
  ${c}
</g>
</svg>
`;
  fs.writeFileSync(out, svg);
  console.log('bytes', Buffer.byteLength(svg), '| contrib', totalContrib, '| dias', activeDays, '| semanas', weeks, '| langs', langs.map(l => l.name + ' ' + pct(l.pct)).join(', '));
})();
