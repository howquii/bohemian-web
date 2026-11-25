/**
 * Datos de contacto y enlaces. Lo único que hay que tocar para publicar con datos reales.
 * - WHATSAPP: número oficial de la marca, solo dígitos con código de país (ej. 51987654321).
 *   Si está vacío, los formularios abren el chat de Instagram.
 * - AIRBNB_CASA: enlace del anuncio de la casa en Airbnb. Si está vacío, el botón dice «Muy pronto en Airbnb».
 */
export const CONFIG = {
  WHATSAPP: '',
  INSTAGRAM: 'bohemianproperties.pe',
  AIRBNB_CASA: 'https://www.airbnb.com.pe/rooms/1808088191014270260',
  // API de leads de la plataforma (P10/plataforma). Vacío = no se registra en el CRM, solo se abre el chat.
  CRM_API: import.meta.env.VITE_CRM_API ?? '',
};

/** Abre WhatsApp con el mensaje armado, o Instagram si no hay número configurado. */
export function enviarMensaje(texto: string) {
  if (CONFIG.WHATSAPP) {
    window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  } else {
    navigator.clipboard?.writeText(texto).catch(() => {});
    window.open(`https://ig.me/m/${CONFIG.INSTAGRAM}`, '_blank', 'noopener');
  }
}

export const canalNombre = () => (CONFIG.WHATSAPP ? 'WhatsApp' : 'Instagram');

/** Explica qué pasa al enviar, según el canal configurado. */
export function notaCanal() {
  document.querySelectorAll<HTMLElement>('.canal').forEach((el) => (el.textContent = canalNombre()));
  if (CONFIG.WHATSAPP) return;
  document.querySelectorAll<HTMLElement>('.nota-canal').forEach((el) => {
    el.textContent = 'Tu mensaje se copia solo: pégalo en el chat de Instagram que se abre.';
    el.style.display = '';
  });
}

/** Registra el lead en el CRM sin bloquear el chat. Nunca lanza. */
export function registrarLead(datos: Record<string, string>) {
  if (!CONFIG.CRM_API) return;
  try {
    fetch(CONFIG.CRM_API, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa: 'bohemian', ...datos }),
    }).catch(() => {});
  } catch { /* sin conexión: el chat igual se abre */ }
}
