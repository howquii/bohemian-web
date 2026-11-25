import './sitio.css';
import './sahara.css';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import { iniciarMotion, navAlBajar } from './motion.ts';
import { CONFIG, enviarMensaje, notaCanal, registrarLead } from './config.ts';

/** Recorrido 360 sin GPS: puntos ubicados a mano en píxeles de la foto equirectangular (casa.json). */
interface Punto { t: string; xy: [number, number] }
interface Salto { a: string; xy: [number, number] }
interface Escena { id: string; nombre: string; imagen: string; preview: string; inicio: [number, number]; puntos: Punto[]; saltos: Salto[] }

navAlBajar();
iniciarMotion();
notaCanal();

// Botón de Airbnb
const btnAirbnb = document.querySelector<HTMLAnchorElement>('#btn-airbnb')!;
if (CONFIG.AIRBNB_CASA) btnAirbnb.href = CONFIG.AIRBNB_CASA;
else {
  btnAirbnb.textContent = 'Muy pronto en Airbnb';
  btnAirbnb.removeAttribute('href');
  btnAirbnb.setAttribute('aria-disabled', 'true');
  btnAirbnb.style.opacity = '.5';
  btnAirbnb.style.pointerEvents = 'none';
}

// Fechas mínimas
const hoy = new Date().toISOString().slice(0, 10);
const llegada = document.querySelector<HTMLInputElement>('#f-llegada')!;
const salida = document.querySelector<HTMLInputElement>('#f-salida')!;
llegada.min = hoy; salida.min = hoy;
llegada.addEventListener('change', () => { salida.min = llegada.value; if (salida.value < llegada.value) salida.value = ''; });

const form = document.querySelector<HTMLFormElement>('#form-casa')!;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const f = (v: FormDataEntryValue | null) => new Date(String(v) + 'T12:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
  registrarLead({
    origen: 'web-casa', interes: 'casa', nombre: String(d.get('nombre')), telefono: String(d.get('telefono') ?? ''),
    titulo: `Casa de campo · ${f(d.get('llegada'))} → ${f(d.get('salida'))}`,
    mensaje: `${d.get('personas')} personas · ${d.get('motivo')}`, llegada: String(d.get('llegada')), salida: String(d.get('salida')),
    personas: String(d.get('personas')), sitio_web: String(d.get('sitio_web') ?? ''),
  });
  enviarMensaje([
    `Hola *BOHEMIAN, soy ${d.get('nombre')}. Quiero cotizar la casa de campo.`,
    `Llegada: ${f(d.get('llegada'))} · Salida: ${f(d.get('salida'))}`,
    `Personas: ${d.get('personas')} · Motivo: ${d.get('motivo')}`,
  ].join('\n'));
});

// Visor 360
const { escenas } = (await fetch('/data/casa.json').then((r) => r.json())) as { escenas: Escena[] };
const ANCHO = 2000, ALTO = 1000;
const aEsfera = ([x, y]: [number, number]) => ({ yaw: (x / ANCHO - 0.5) * 2 * Math.PI, pitch: (0.5 - y / ALTO) * Math.PI });
const porId = (id: string) => escenas.find((e) => e.id === id) ?? escenas[0];
let actual = porId('aerea');

const visor = document.querySelector<HTMLElement>('.visor')!;
const viewer = new Viewer({
  container: visor.querySelector<HTMLElement>('.psv')!,
  panorama: actual.imagen,
  caption: actual.nombre,
  fisheye: 1.2,
  defaultZoomLvl: 0,
  defaultYaw: aEsfera(actual.inicio).yaw,
  defaultPitch: aEsfera(actual.inicio).pitch,
  mousewheel: false, // la rueda hace scroll de la página, no zoom
  touchmoveTwoFingers: true, // en celular, un dedo hace scroll; dos dedos mueven el 360
  navbar: ['zoom', 'move', 'caption', 'fullscreen'],
  loadingTxt: 'Cargando 360…',
  plugins: [[MarkersPlugin, {}]],
});
const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;

function pintar() {
  markers.clearMarkers();
  actual.puntos.forEach((p, i) => markers.addMarker({ id: `p${i}`, position: aEsfera(p.xy), anchor: 'bottom center', html: `<span class="etiqueta">${p.t}</span>` }));
  actual.saltos.forEach((s) => markers.addMarker({
    id: `ir-${s.a}`, position: aEsfera(s.xy), anchor: 'bottom center',
    html: `<span class="salto">Ir a ${porId(s.a).nombre}</span>`, data: { escena: s.a },
  }));
  const tira = visor.querySelector<HTMLElement>('.visor__tira')!;
  tira.innerHTML = escenas.map((x) => `<button data-escena="${x.id}" class="${x.id === actual.id ? 'on' : ''}"><img src="${x.preview}" alt=""><span>${x.nombre}</span></button>`).join('');
  tira.querySelectorAll<HTMLButtonElement>('[data-escena]').forEach((b) => b.addEventListener('click', () => abrir(b.dataset.escena!)));
}
function abrir(id: string) {
  actual = porId(id);
  viewer.setPanorama(actual.imagen, { caption: actual.nombre, position: aEsfera(actual.inicio), transition: { speed: 800 } }).then(pintar);
}
markers.addEventListener('select-marker', ({ marker }) => {
  const d = marker.data as { escena?: string } | undefined;
  if (d?.escena) abrir(d.escena);
});
viewer.addEventListener('ready', () => {
  pintar();
  setTimeout(() => visor.querySelector<HTMLElement>('.visor__ayuda')!.style.opacity = '0', 4500);
}, { once: true });

Object.assign(window, { __casa: { viewer, abrir } });

// Mapa de ubicación: MapLibre con satélite, cargado solo cuando la sección se acerca a la pantalla.
const CASA: [number, number] = [-76.7568, -12.13576];
const lienzo = document.querySelector<HTMLElement>('.mapa-casa__lienzo');
if (lienzo) {
  const io = new IntersectionObserver(async (entradas) => {
    if (!entradas.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const [{ default: maplibregl }] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
    const mapa = new maplibregl.Map({
      container: lienzo,
      center: CASA,
      zoom: 14.5,
      cooperativeGestures: true, // en celular, dos dedos para mover; la página sigue haciendo scroll
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics' },
          ref: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 },
        },
        layers: [{ id: 'sat', type: 'raster', source: 'sat' }, { id: 'ref', type: 'raster', source: 'ref' }],
      },
    });
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const pin = document.createElement('div');
    pin.className = 'pin-casa';
    new maplibregl.Marker({ element: pin }).setLngLat(CASA).addTo(mapa);
  }, { rootMargin: '400px' });
  io.observe(lienzo);
}

// Galería: pestañas Exterior / Interior y visor de fotos ampliadas.
const pestanas = document.querySelectorAll<HTMLButtonElement>('.pestanas [data-grupo]');
const mosaicos = document.querySelectorAll<HTMLElement>('.mosaico[data-grupo]');
pestanas.forEach((b) => b.addEventListener('click', () => {
  pestanas.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  mosaicos.forEach((m) => { m.hidden = m.dataset.grupo !== b.dataset.grupo; });
}));
const dlg = document.querySelector<HTMLDialogElement>('.visor-foto');
if (dlg) {
  const grande = dlg.querySelector('img')!;
  let lista: HTMLImageElement[] = [];
  let i = 0;
  const mostrar = (n: number) => { i = (n + lista.length) % lista.length; grande.src = lista[i].src; grande.alt = lista[i].alt; };
  mosaicos.forEach((m) => m.querySelectorAll('img').forEach((img) => img.closest('figure')!.addEventListener('click', () => {
    lista = [...m.querySelectorAll('img')];
    mostrar(lista.indexOf(img));
    dlg.showModal();
  })));
  dlg.querySelector('.visor-foto__cerrar')!.addEventListener('click', () => dlg.close());
  dlg.querySelector('.visor-foto__ant')!.addEventListener('click', () => mostrar(i - 1));
  dlg.querySelector('.visor-foto__sig')!.addEventListener('click', () => mostrar(i + 1));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') mostrar(i - 1); if (e.key === 'ArrowRight') mostrar(i + 1); });
}
