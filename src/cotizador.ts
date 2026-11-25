export interface Proyecto {
  nombre: string;
  empresa: string;
  ubicacion: string;
  moneda: string;
  separacion: number;
  inicial_pct: number;
  cuotas: number[];
  tasa_anual_pct: number;
  colores: Record<string, string>;
  centro: [number, number];
  zoom: number;
}

export interface Lote {
  id: string;
  manzana: string;
  lote: number;
  area_m2: number;
  precio_m2: number;
  precio: number;
  estado: 'disponible' | 'separado' | 'vendido';
}

/** Cuota mensual. Sin interés: (precio − inicial) / n. Con interés: amortización francesa. */
export function cuotaMensual(precio: number, inicial: number, meses: number, tasaAnualPct: number) {
  const capital = Math.max(precio - inicial, 0);
  if (meses <= 0) return capital;
  const i = tasaAnualPct / 100 / 12;
  if (i === 0) return capital / meses;
  return (capital * i) / (1 - (1 + i) ** -meses);
}

export const dinero = (m: string, n: number) =>
  `${m} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ESTADO: Record<Lote['estado'], string> = { disponible: 'Disponible', separado: 'Separado', vendido: 'Vendido' };

/** Pinta la ficha del lote con su cotizador dentro de `cont`. */
export function fichaLote(cont: HTMLElement, lote: Lote, p: Proyecto) {
  const inicial = Math.max(p.separacion, (lote.precio * p.inicial_pct) / 100);
  let meses = p.cuotas[Math.min(2, p.cuotas.length - 1)];
  let modo: 'contado' | 'cuotas' = 'cuotas';

  const render = () => {
    const cuota = cuotaMensual(lote.precio, inicial, meses, p.tasa_anual_pct);
    cont.innerHTML = `
      <header class="ficha-cab">
        <div><small>Manzana ${lote.manzana}</small><h2>Lote ${lote.lote}</h2></div>
        <span class="estado estado-${lote.estado}">${ESTADO[lote.estado]}</span>
      </header>
      <dl class="datos">
        <div><dt>Área</dt><dd>${lote.area_m2} m²</dd></div>
        <div><dt>Precio m²</dt><dd>${dinero(p.moneda, lote.precio_m2)}</dd></div>
        <div class="total"><dt>Precio del lote</dt><dd>${dinero(p.moneda, lote.precio)}</dd></div>
      </dl>
      ${lote.estado !== 'disponible' ? `<p class="aviso">Este lote no está disponible. Elige uno verde en el mapa.</p>` : `
      <div class="seg" role="tablist">
        <button data-modo="contado" class="${modo === 'contado' ? 'on' : ''}">Al contado</button>
        <button data-modo="cuotas" class="${modo === 'cuotas' ? 'on' : ''}">En cuotas</button>
      </div>
      ${modo === 'cuotas' ? `
        <div class="plazos">${p.cuotas.map((m) => `<button data-meses="${m}" class="${m === meses ? 'on' : ''}">${m} m</button>`).join('')}</div>
        <div class="cuota"><small>Cuota mensual</small><strong>${dinero(p.moneda, cuota)}</strong>
          <span>${p.tasa_anual_pct === 0 ? 'Sin intereses · financiamiento directo' : `Tasa ${p.tasa_anual_pct}% anual`}</span></div>
        <ul class="desglose">
          <li><span>Separación (hoy)</span><b>${dinero(p.moneda, p.separacion)}</b></li>
          <li><span>Inicial total (incluye separación)</span><b>${dinero(p.moneda, inicial)}</b></li>
          <li><span>Capital financiado</span><b>${dinero(p.moneda, lote.precio - inicial)}</b></li>
          <li><span>${meses} cuotas de</span><b>${dinero(p.moneda, cuota)}</b></li>
        </ul>` : `
        <ul class="desglose">
          <li><span>Separación (hoy)</span><b>${dinero(p.moneda, p.separacion)}</b></li>
          <li><span>Saldo al firmar</span><b>${dinero(p.moneda, lote.precio - p.separacion)}</b></li>
        </ul>`}
      <button class="cta">Agendar visita al terreno</button>`}
    `;
    cont.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach((b) =>
      b.addEventListener('click', () => { modo = b.dataset.modo as typeof modo; render(); }));
    cont.querySelectorAll<HTMLButtonElement>('[data-meses]').forEach((b) =>
      b.addEventListener('click', () => { meses = Number(b.dataset.meses); render(); }));
  };
  render();
}
