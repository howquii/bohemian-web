import './sitio.css';
import './sahara.css';
import { iniciarMotion, navAlBajar } from './motion.ts';
import { enviarMensaje, notaCanal, registrarLead } from './config.ts';

navAlBajar();
iniciarMotion();

notaCanal();

const form = document.querySelector<HTMLFormElement>('#form-contacto')!;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const v = (k: string) => String(d.get(k) ?? '');
  const INTERES: Record<string, string> = {
    'poner mi propiedad en Airbnb': 'propietario', 'comercializar un proyecto de lotes': 'agencia',
    'fotos, video o dron': 'estudio', 'el mapa de lotes y CRM': 'agencia', 'alquilar la casa de campo': 'casa',
  };
  registrarLead({ origen: 'web-inicio', interes: INTERES[v('tipo')] ?? 'otro', nombre: v('nombre'), telefono: v('telefono'),
    zona: v('zona'), mensaje: [v('tipo'), v('mensaje')].filter(Boolean).join(' · '), sitio_web: v('sitio_web') });
  const partes = [
    `Hola *BOHEMIAN, soy ${d.get('nombre')}.`,
    `Me interesa ${d.get('tipo')}.`,
    d.get('zona') ? `Zona: ${d.get('zona')}.` : '',
    d.get('mensaje') ? String(d.get('mensaje')) : '',
  ];
  enviarMensaje(partes.filter(Boolean).join('\n'));
});
