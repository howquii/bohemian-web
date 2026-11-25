import './demo.css';
import { crearMapa, marcarLote } from './mapa.ts';
import { Tour, type Escena } from './tour.ts';
import { fichaLote, type Lote, type Proyecto } from './cotizador.ts';

const [p, lotes, escenas] = await Promise.all([
  fetch('/data/proyecto.json').then((r) => r.json()) as Promise<Proyecto>,
  fetch('/data/lotes.geojson').then((r) => r.json()) as Promise<GeoJSON.FeatureCollection>,
  fetch('/data/escenas.json').then((r) => r.json()) as Promise<Escena[]>,
]);

const props = lotes.features.map((f) => f.properties as Lote);
const cuenta = (e: Lote['estado']) => props.filter((l) => l.estado === e).length;

document.querySelector('#cab')!.innerHTML = `
  <small>${p.empresa} · ${p.ubicacion}</small>
  <h1>${p.nombre}</h1>
  <p><b>${cuenta('disponible')}</b> de ${props.length} lotes disponibles · en vivo</p>
  <ul class="leyenda">
    <li><i style="background:${p.colores.disponible}"></i>Disponible ${cuenta('disponible')}</li>
    <li><i style="background:${p.colores.separado}"></i>Separado ${cuenta('separado')}</li>
    <li><i style="background:${p.colores.vendido}"></i>Vendido ${cuenta('vendido')}</li>
  </ul>
  <button id="btn360">Recorrido 360 · ${escenas.length} vistas</button>`;

const panel = document.querySelector<HTMLElement>('#panel')!;
const ficha = panel.querySelector<HTMLElement>('.ficha')!;
const tourEl = document.querySelector<HTMLElement>('#tour')!;

const elegirLote = (id: string) => {
  const l = props.find((x) => x.id === id);
  if (!l) return;
  fichaLote(ficha, l, p);
  panel.hidden = false;
  marcarLote(map, id);
  tour.marcarLote(id);
  history.replaceState(null, '', `#lote/${id}`);
};
const cerrarPanel = () => {
  panel.hidden = true;
  marcarLote(map, null);
  tour.marcarLote(null);
  history.replaceState(null, '', location.pathname);
};
const abrirEscena = (id: string) => {
  tour.abrir(id);
  history.replaceState(null, '', `#tour/${id}`);
};

const map = crearMapa(document.querySelector('#mapa')!, p, lotes, escenas, elegirLote, abrirEscena);
const tour = new Tour(tourEl, escenas, lotes, p, elegirLote);

panel.querySelector('.cerrar')!.addEventListener('click', cerrarPanel);
tourEl.querySelector('.cerrar')!.addEventListener('click', () => { tour.cerrar(); history.replaceState(null, '', location.pathname); });
document.querySelector('#btn360')!.addEventListener('click', () => abrirEscena(escenas[0].id));

// Ajuste fino del rumbo (la brújula del dron puede desviarse unos grados)
const ajuste = tourEl.querySelector<HTMLInputElement>('#ajuste')!;
ajuste.addEventListener('input', () => {
  tour.ajusteHeading = Number(ajuste.value);
  tourEl.querySelector('#ajusteVal')!.textContent = `${ajuste.value}°`;
  tour.pintar();
});

// Enlaces compartibles: #lote/A-3  ·  #tour/alta
const [tipo, valor] = location.hash.slice(1).split('/');
map.once('load', () => {
  if (tipo === 'lote' && valor) elegirLote(valor);
  if (tipo === 'tour' && valor) abrirEscena(valor);
});

Object.assign(window, { __demo: { map, tour, p, props } });
