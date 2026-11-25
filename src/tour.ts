import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import { sueloAEsfera, type Camara } from './proyeccion.ts';
import type { Proyecto } from './cotizador.ts';

export interface Escena {
  id: string;
  nombre: string;
  imagen: string;
  preview: string;
  lat: number;
  lng: number;
  heading: number;
  altura_m: number;
  fuente: string;
}

/**
 * Visor 360 tipo «ojo de pez» (Photo Sphere Viewer, opción fisheye) con los lotes del mapa
 * proyectados encima de la foto esférica a partir del GPS, rumbo y altura del dron.
 */
export class Tour {
  private viewer: Viewer | null = null;
  private markers: MarkersPlugin | null = null;
  private escenaActual: Escena | null = null;
  ajusteHeading = 0; // corrección fina en grados (lo que en Nativa es heading vs heading_original)

  constructor(
    private cont: HTMLElement,
    private escenas: Escena[],
    private lotes: GeoJSON.FeatureCollection,
    private p: Proyecto,
    private alElegirLote: (id: string) => void,
  ) {}

  abrir(id: string) {
    const e = this.escenas.find((x) => x.id === id) ?? this.escenas[0];
    this.escenaActual = e;
    this.cont.hidden = false;
    // Mirar hacia el centro de la lotización al entrar
    const centro = this.centroLotes();
    const inicio = sueloAEsfera(this.camara(e), centro[1], centro[0]);

    if (!this.viewer) {
      this.viewer = new Viewer({
        container: this.cont.querySelector<HTMLElement>('.psv')!,
        panorama: e.imagen,
        caption: e.nombre,
        fisheye: 1.2,
        defaultZoomLvl: 0,
        defaultYaw: inicio.yaw,
        defaultPitch: inicio.pitch * 0.6,
        navbar: ['zoom', 'move', 'caption', 'fullscreen'],
        loadingTxt: 'Cargando 360…',
        plugins: [[MarkersPlugin, {}]],
      });
      this.markers = this.viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
      this.markers.addEventListener('select-marker', ({ marker }) => {
        const d = marker.data as { lote?: string; escena?: string } | undefined;
        if (d?.lote) this.alElegirLote(d.lote);
        if (d?.escena) this.abrir(d.escena);
      });
      this.viewer.addEventListener('ready', () => this.pintar(), { once: true });
    } else {
      this.viewer
        .setPanorama(e.imagen, { caption: e.nombre, position: { yaw: inicio.yaw, pitch: inicio.pitch * 0.6 }, transition: { speed: 800 } })
        .then(() => this.pintar());
    }
    this.pintarTira();
  }

  cerrar() {
    this.cont.hidden = true;
  }

  marcarLote(id: string | null) {
    if (!this.markers) return;
    for (const m of this.markers.getMarkers()) {
      const lote = (m.config.data as { lote?: string } | undefined)?.lote;
      if (lote) this.markers.updateMarker({ id: m.id, svgStyle: this.estilo(lote, lote === id) });
    }
  }

  private camara(e: Escena): Camara {
    return { lat: e.lat, lng: e.lng, heading: e.heading + this.ajusteHeading, altura_m: e.altura_m };
  }

  private centroLotes(): [number, number] {
    let x = 0, y = 0, n = 0;
    for (const f of this.lotes.features) {
      for (const [lng, lat] of (f.geometry as GeoJSON.Polygon).coordinates[0]) { x += lng; y += lat; n++; }
    }
    return [x / n, y / n];
  }

  private estilo(id: string, activo = false) {
    const f = this.lotes.features.find((x) => x.properties?.id === id);
    const c = this.p.colores[f?.properties?.estado ?? 'vendido'];
    return { fill: c, fillOpacity: activo ? '0.8' : '0.45', stroke: '#ffffff', strokeWidth: activo ? '3px' : '1px' };
  }

  pintar() {
    const e = this.escenaActual;
    if (!e || !this.markers) return;
    this.markers.clearMarkers();
    const cam = this.camara(e);

    // 1) Cada lote: sus vértices GPS → (yaw, pitch) en la esfera
    for (const f of this.lotes.features) {
      const id = f.properties!.id as string;
      const anillo = (f.geometry as GeoJSON.Polygon).coordinates[0];
      const puntos = anillo.slice(0, -1).map(([lng, lat]) => {
        const s = sueloAEsfera(cam, lat, lng);
        return [s.yaw, s.pitch] as [number, number];
      });
      this.markers.addMarker({
        id: `lote-${id}`,
        polygon: puntos,
        svgStyle: this.estilo(id),
        tooltip: { content: `Lote ${id} · ${f.properties!.area_m2} m² · ${f.properties!.estado}`, position: 'top center' },
        data: { lote: id },
      });
    }

    // 2) Saltos a las otras escenas, en el punto del suelo bajo el otro dron
    for (const otra of this.escenas.filter((x) => x.id !== e.id)) {
      const s = sueloAEsfera(cam, otra.lat, otra.lng);
      this.markers.addMarker({
        id: `ir-${otra.id}`,
        position: { yaw: s.yaw, pitch: s.pitch },
        html: `<span class="salto">${otra.nombre} · ${Math.round(s.distancia)} m</span>`,
        anchor: 'bottom center',
        data: { escena: otra.id },
      });
    }
  }

  private pintarTira() {
    const tira = this.cont.querySelector<HTMLElement>('.tira')!;
    tira.innerHTML = this.escenas.map((x) => `
      <button data-escena="${x.id}" class="${x.id === this.escenaActual?.id ? 'on' : ''}">
        <img src="${x.preview}" alt=""><span>${x.nombre}<small>${x.altura_m} m</small></span>
      </button>`).join('');
    tira.querySelectorAll<HTMLButtonElement>('[data-escena]').forEach((b) =>
      b.addEventListener('click', () => this.abrir(b.dataset.escena!)));
  }
}
