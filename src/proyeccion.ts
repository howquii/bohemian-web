// Geometría que une el mapa con la foto 360.
// Una esfera de dron es una foto equirectangular tomada desde un punto (lat, lng, altura).
// Si sabemos hacia dónde mira el centro de la foto (heading), cualquier punto del suelo
// (un vértice de lote) cae en un ángulo exacto de la esfera:
//   yaw   = rumbo(cámara → punto) − heading          (izquierda/derecha)
//   pitch = −atan(altura sobre el suelo / distancia)  (cuánto mirar hacia abajo)
// Es lo mismo que guarda Nativa en TOUR_SCENE (lng, lat, heading, altitude_*, suelo_alt_m).

const R = 6371008.8; // radio medio de la Tierra (m)
const rad = (g: number) => (g * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface Camara {
  lat: number;
  lng: number;
  heading: number; // grados, hacia dónde mira el centro de la panorámica (0 = norte)
  altura_m: number; // altura de la cámara sobre el suelo del lote
}

/** Distancia (m) y rumbo (grados, 0 = norte, horario) entre dos puntos. */
export function distanciaRumbo(lat1: number, lng1: number, lat2: number, lng2: number) {
  const φ1 = rad(lat1), φ2 = rad(lat2), Δφ = rad(lat2 - lat1), Δλ = rad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const distancia = 2 * R * Math.asin(Math.sqrt(a));
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const rumbo = (deg(Math.atan2(y, x)) + 360) % 360;
  return { distancia, rumbo };
}

/** Punto a cierta distancia y rumbo (inversa de distanciaRumbo). */
export function destino(lat: number, lng: number, rumboGrados: number, distancia: number) {
  const δ = distancia / R, θ = rad(rumboGrados), φ1 = rad(lat), λ1 = rad(lng);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: deg(φ2), lng: deg(λ2) };
}

/** Ángulos (radianes, convención Photo Sphere Viewer) de un punto del suelo visto desde la cámara. */
export function sueloAEsfera(cam: Camara, lat: number, lng: number, alturaPunto_m = 0) {
  const { distancia, rumbo } = distanciaRumbo(cam.lat, cam.lng, lat, lng);
  let yaw = rad(rumbo - cam.heading);
  yaw = ((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // 0..2π
  const pitch = -Math.atan2(cam.altura_m - alturaPunto_m, Math.max(distancia, 0.01));
  return { yaw, pitch, distancia };
}
