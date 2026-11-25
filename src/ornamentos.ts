/** Ornamentos de línea de la marca (sol, órbitas, horizonte, estrella de 8 puntas, dunas y constelaciones).
 *  Se inyectan como SVG decorativos (aria-hidden). Su estado en reposo está dibujado; motion.ts los anima. */

const NS = 'http://www.w3.org/2000/svg';
const T = 'data-trazo pathLength="1"';

/** Estrella de 8 puntas: dos cuadrados girados 45°. */
const estrella = (cx: number, cy: number, r: number) => {
  const p = (ang: number) => Array.from({ length: 4 }, (_, i) => {
    const a = ang + (i * Math.PI) / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<polygon ${T} points="${p(0)}"/><polygon ${T} points="${p(Math.PI / 4)}"/>`;
};

function emblema(): string {
  const rayos = Array.from({ length: 24 }, (_, i) => {
    const a = (i * Math.PI) / 12;
    const r1 = 176, r2 = i % 2 ? 196 : 214;
    return `<line ${T} x1="${(300 + r1 * Math.cos(a)).toFixed(1)}" y1="${(300 + r1 * Math.sin(a)).toFixed(1)}" x2="${(300 + r2 * Math.cos(a)).toFixed(1)}" y2="${(300 + r2 * Math.sin(a)).toFixed(1)}"/>`;
  }).join('');
  return `
    <circle ${T} cx="300" cy="300" r="290" opacity=".45"/>
    <circle ${T} cx="300" cy="300" r="250"/>
    <circle ${T} cx="300" cy="300" r="160" opacity=".8"/>
    <path ${T} d="M 140 300 A 160 160 0 0 1 460 300"/>
    <path ${T} d="M 60 300 A 240 240 0 0 0 540 300" opacity=".5"/>
    <line ${T} x1="-60" y1="300" x2="660" y2="300"/>
    <line ${T} x1="300" y1="10" x2="300" y2="140" opacity=".6"/>
    <line ${T} x1="300" y1="460" x2="300" y2="590" opacity=".6"/>
    <g class="rayos">${rayos}</g>
    <g class="estrella">${estrella(300, 300, 66)}</g>
    <circle class="relleno" cx="300" cy="300" r="3"/>
    <circle class="relleno" cx="300" cy="10" r="3"/>
    <circle class="relleno" cx="550" cy="300" r="3"/>`;
}

function svg(clase: string, viewBox: string, html: string, aspect = 'xMidYMid meet') {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('class', `orn ${clase}`);
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('preserveAspectRatio', aspect);
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = html;
  return el;
}

/** Duna: curva suave a todo el ancho con una estrella al centro. */
function duna() {
  return svg('duna', '0 0 1200 28', `
    <path ${T} d="M0 20 C 160 20 240 6 380 8 S 520 20 560 16"/>
    <path ${T} d="M640 16 C 680 20 760 6 880 8 S 1060 20 1200 20"/>
    ${estrella(600, 14, 11)}
    <circle class="relleno" cx="600" cy="14" r="1.8"/>`, 'none');
}

/** Cielo nocturno: estrellas fijas (sin azar, para que no cambie entre visitas) unidas por líneas finas. */
function cielo() {
  const pts: [number, number][] = [[120, 90], [210, 160], [330, 120], [420, 210], [1010, 80], [1090, 150], [1160, 110], [1060, 260], [880, 60], [760, 140], [60, 300], [1180, 360], [540, 70], [640, 40]];
  const lineas = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [5, 7], [8, 9], [12, 13]].map(([a, b]) =>
    `<line ${T} x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" opacity=".6"/>`).join('');
  const astros = pts.map(([x, y], i) => `<circle class="astro" cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.6}"/>`).join('');
  return svg('orn--cielo', '0 0 1200 600', `
    <circle ${T} cx="1120" cy="40" r="260" opacity=".35"/>
    <circle ${T} cx="1120" cy="40" r="180" opacity=".25"/>
    ${lineas}${astros}`, 'xMidYMid slice');
}

export function ornamentar() {
  const hero = document.querySelector('.hero');
  if (hero && !hero.querySelector('.orn--hero')) hero.append(svg('orn--hero', '0 0 600 600', emblema()));

  const ficha = document.querySelector('.ficha-casa > div:first-child');
  if (ficha && !ficha.querySelector('.orn--ficha')) ficha.prepend(svg('orn--ficha', '0 0 600 600', emblema()));

  const primera = document.querySelector('main > .bloque:not(.bloque--noche)');
  if (primera && document.querySelector('.hero') && !primera.querySelector('.orn--ficha')) primera.prepend(svg('orn--ficha orn--intro', '0 0 600 600', emblema()));

  const pie = document.querySelector('.pie');
  if (pie && !pie.querySelector('.orn--pie')) pie.prepend(svg('orn--pie', '0 0 600 600', emblema()));

  document.querySelectorAll('.bloque--noche').forEach((b) => { if (!b.querySelector('.orn--cielo')) b.prepend(cielo()); });

  // Una duna al inicio de cada sección, salvo la primera después del hero y las que ya la tienen.
  document.querySelectorAll<HTMLElement>('main > .bloque').forEach((b, i) => {
    if (i === 0 || b.querySelector(':scope > .duna')) return;
    b.prepend(duna());
  });

  // Fotos con remate en arco
  document.querySelectorAll('.g2').forEach((el) => el.classList.add('arco'));
  document.querySelectorAll('.destacada__foto, .mapa-casa, .tech__foto').forEach((el) => el.classList.add('arco', 'arco--bajo'));
}
