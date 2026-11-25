import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { ornamentar } from './ornamentos.ts';

gsap.registerPlugin(ScrollTrigger, SplitText);
const EASE = 'expo.out';

/** Scroll suave + titulares que suben línea por línea + fotos que se revelan. El estado en reposo es visible. */
export function iniciarMotion() {
  ornamentar();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return null;

  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const destino = a.getAttribute('href')!;
      if (destino.length < 2) return;
      e.preventDefault();
      lenis.scrollTo(destino, { offset: -70, duration: 1.2 });
    }));

  document.fonts.ready.then(() => {
    // Intro del hero
    const h1 = document.querySelector('.hero h1');
    const tl = gsap.timeline({ defaults: { ease: EASE } });
    if (document.querySelector('.hero__media')) {
      tl.from('.hero__media', { clipPath: 'inset(12% 8% 12% 8%)', duration: 1.6 })
        .from('.hero__media img', { scale: 1.18, duration: 1.8 }, '<');
    }
    if (h1) {
      const s = SplitText.create(h1, { type: 'lines', mask: 'lines' });
      tl.from(s.lines, { yPercent: 110, stagger: 0.08, duration: 1.1 }, '-=1.3');
    }
    const trazosHero = document.querySelectorAll('.orn--hero [data-trazo]');
    if (trazosHero.length) {
      tl.from(trazosHero, { strokeDashoffset: 1, duration: 2.2, ease: 'power3.inOut', stagger: { each: 0.025, from: 'center' } }, 0.15)
        .from('.orn--hero .relleno', { scale: 0, transformOrigin: 'center', duration: 0.6, stagger: 0.1 }, 1.4)
        .from('.orn--hero', { rotate: -24, duration: 2.6, ease: 'power3.out' }, 0);
      gsap.to('.orn--hero', { yPercent: -18, rotate: 30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__media img', { yPercent: 10, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
    tl.from(['.hero [data-fade]', '.nav'].flatMap((q) => [...document.querySelectorAll(q)]), { opacity: 0, y: 14, duration: 0.8, stagger: 0.06 }, '-=0.7');

    // Dunas, emblemas y constelaciones: la línea se dibuja mientras la sección entra
    document.querySelectorAll<SVGElement>('.duna, .orn--ficha, .orn--pie, .orn--cielo').forEach((orn) => {
      gsap.from(orn.querySelectorAll('[data-trazo]'), {
        strokeDashoffset: 1, ease: 'none', stagger: 0.02,
        scrollTrigger: { trigger: orn.parentElement, start: 'top 92%', end: orn.classList.contains('duna') ? 'top 45%' : 'top 10%', scrub: 0.8 },
      });
    });
    gsap.utils.toArray<SVGElement>('.orn--ficha, .orn--pie').forEach((orn) =>
      gsap.to(orn, { rotate: 40, ease: 'none', scrollTrigger: { trigger: orn.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

    // Estrella de las etiquetas: gira al entrar
    document.querySelectorAll<HTMLElement>('.label').forEach((el) =>
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => el.classList.add('girar') }));

    // Titulares de sección
    document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 110, duration: 1.1, ease: EASE, stagger: 0.07,
          scrollTrigger: { trigger: el, start: 'top 88%' },
        }),
      });
    });

    // Fotos que se abren al entrar
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      // Los arcos suben desde abajo, como el sol; el resto se abre desde el centro.
      gsap.from(el, {
        clipPath: el.classList.contains('arco') ? 'inset(100% 0% 0% 0%)' : 'inset(18% 0 18% 0)', duration: el.classList.contains('arco') ? 1.6 : 1.3, ease: EASE,
        clearProps: 'clipPath',
        scrollTrigger: { trigger: el, start: 'top 90%' },
      });
      const img = el.querySelector('img');
      if (img) gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, {
        yPercent: 6, scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Bloques de texto
    document.querySelectorAll<HTMLElement>('[data-up]').forEach((el) =>
      gsap.from(el, { opacity: 0, y: 24, duration: 0.9, ease: EASE, scrollTrigger: { trigger: el, start: 'top 90%' } }));
  });
  return lenis;
}

/** Barra de navegación que se oscurece al bajar */
export function navAlBajar() {
  const nav = document.querySelector<HTMLElement>('.nav');
  if (!nav) return;
  const f = () => nav.classList.toggle('nav--solida', scrollY > 40);
  addEventListener('scroll', f, { passive: true });
  f();
}
