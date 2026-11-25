import * as maplibregl from 'maplibre-gl';
type MLMap = maplibregl.Map;
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Proyecto } from './cotizador.ts';
import type { Escena } from './tour.ts';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

export function crearMapa(
  cont: HTMLElement,
  p: Proyecto,
  lotes: GeoJSON.FeatureCollection,
  escenas: Escena[],
  alElegirLote: (id: string) => void,
  alAbrirEscena: (id: string) => void,
): MLMap {
  const map = new maplibregl.Map({
    container: cont,
    center: p.centro,
    zoom: p.zoom,
    pitch: 45,
    bearing: -20,
    maxPitch: 75,
    attributionControl: { compact: true },
    style: {
      version: 8,
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources: {
        satelite: { type: 'raster', tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 17, attribution: 'Imágenes © Esri' },
        etiquetas: { type: 'raster', tiles: [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 17 },
      },
      layers: [
        { id: 'satelite', type: 'raster', source: 'satelite' },
        { id: 'etiquetas', type: 'raster', source: 'etiquetas', paint: { 'raster-opacity': 0.7 } },
      ],
    },
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left');
  map.addControl(new maplibregl.FullscreenControl(), 'bottom-left');

  map.on('load', () => {
    // Relieve 3D (igual que Nativa: MapTiler terrain-rgb). Solo si hay clave.
    if (MAPTILER_KEY) {
      map.addSource('relieve', { type: 'raster-dem', url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`, tileSize: 256 });
      map.setTerrain({ source: 'relieve', exaggeration: 1 });
    }
    map.addSource('lotes', { type: 'geojson', data: lotes, promoteId: 'id' });
    const color: maplibregl.ExpressionSpecification = ['match', ['get', 'estado'],
      'disponible', p.colores.disponible, 'separado', p.colores.separado, p.colores.vendido];
    map.addLayer({ id: 'lotes-relleno', type: 'fill', source: 'lotes', paint: {
      'fill-color': color,
      'fill-opacity': ['case', ['boolean', ['feature-state', 'activo'], false], 0.85, 0.55],
    } });
    map.addLayer({ id: 'lotes-borde', type: 'line', source: 'lotes', paint: {
      'line-color': ['case', ['boolean', ['feature-state', 'activo'], false], '#ffffff', 'rgba(255,255,255,0.75)'],
      'line-width': ['case', ['boolean', ['feature-state', 'activo'], false], 3, 1],
    } });
    map.addLayer({ id: 'lotes-num', type: 'symbol', source: 'lotes', minzoom: 17, layout: {
      'text-field': ['concat', ['get', 'manzana'], '-', ['to-string', ['get', 'lote']]],
      'text-font': ['Noto Sans Regular'], 'text-size': 11,
    }, paint: { 'text-color': '#fff', 'text-halo-color': 'rgba(0,0,0,.55)', 'text-halo-width': 1.2 } });

    map.on('click', 'lotes-relleno', (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) alElegirLote(id);
    });
    map.on('mouseenter', 'lotes-relleno', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'lotes-relleno', () => (map.getCanvas().style.cursor = ''));

    // Puntos 360 en la posición GPS real de cada esfera
    for (const e of escenas) {
      const el = document.createElement('button');
      el.className = 'pin360';
      el.title = `${e.nombre} · ${e.altura_m} m`;
      el.innerHTML = `<img src="${e.preview}" alt=""><span>360</span>`;
      el.addEventListener('click', (ev) => { ev.stopPropagation(); alAbrirEscena(e.id); });
      new maplibregl.Marker({ element: el }).setLngLat([e.lng, e.lat]).addTo(map);
    }
  });
  return map;
}

let activo: string | null = null;
export function marcarLote(map: MLMap, id: string | null) {
  if (!map.getSource('lotes')) return;
  if (activo) map.setFeatureState({ source: 'lotes', id: activo }, { activo: false });
  activo = id;
  if (id) map.setFeatureState({ source: 'lotes', id }, { activo: true });
}
