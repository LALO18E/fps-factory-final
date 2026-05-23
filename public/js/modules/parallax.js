/**
 * parallax.js — Efecto parallax del hero
 * ─────────────────────────────────────────
 * Anima las capas del hero al hacer scroll usando GSAP + ScrollTrigger.
 * Cada capa se mueve a diferente velocidad, creando profundidad visual.
 *
 * Capas (de más lenta a más rápida):
 *   1. .hero-layer-bg             → fondo casi estático  (speed 0.15)
 *   2. .hero-layer-glow           → halo de luz          (speed 0.30)
 *   3. .hero-layer-glow-secondary → halo secundario      (speed 0.40)
 *   4. .hero-featured             → tarjeta del producto (speed 0.55)
 *   5. .hero-content              → texto y CTAs         (speed 0.70)
 *
 * Si el usuario tiene activada la preferencia "reducir movimiento"
 * o GSAP no está disponible, el módulo se omite silenciosamente.
 */

const LAYERS = [
  { selector: '.hero-layer-bg',             speed: 0.15 },
  { selector: '.hero-layer-glow',           speed: 0.30 },
  { selector: '.hero-layer-glow-secondary', speed: 0.40 },
  { selector: '.hero-featured',             speed: 0.55 },
  { selector: '.hero-content',              speed: 0.70 },
];

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Punto de entrada del módulo. Verifica que GSAP esté disponible
 * y elige entre ScrollTrigger (ideal) o scroll manual (fallback).
 * Se llama desde catalog.js una vez que el DOM está listo.
 */
export function initParallax() {
  if (prefersReducedMotion) return;

  if (typeof window.gsap === 'undefined') {
    console.warn('[Parallax] GSAP no está cargado. Parallax desactivado.');
    return;
  }

  const { gsap } = window;

  if (typeof window.ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(window.ScrollTrigger);
    _initWithScrollTrigger(gsap);
  } else {
    _initManualParallax(gsap);
  }
}

/**
 * Versión preferida del parallax usando ScrollTrigger.
 * Sincroniza el movimiento de cada capa con la posición del scroll
 * de forma nativa, sin eventos manuales.
 */
function _initWithScrollTrigger(gsap) {
  const hero = document.getElementById('hero');
  if (!hero) return;

  LAYERS.forEach(({ selector, speed }) => {
    const el = hero.querySelector(selector);
    if (!el) return;

    gsap.to(el, {
      yPercent: speed * 60,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,  // El movimiento sigue el scroll en tiempo real
      },
    });
  });

  _animateHeroEntrance(gsap);
}

/**
 * Versión de respaldo para cuando ScrollTrigger no está disponible.
 * Escucha el evento 'scroll' y calcula la posición de cada capa
 * con requestAnimationFrame para evitar bloquear el hilo principal.
 */
function _initManualParallax(gsap) {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const layerEls   = LAYERS.map(({ selector, speed }) => ({
    el: hero.querySelector(selector), speed,
  })).filter(({ el }) => el !== null);

  const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY || window.pageYOffset;
      if (scrollY <= heroBottom) {
        layerEls.forEach(({ el, speed }) => gsap.set(el, { y: scrollY * speed }));
      }
      ticking = false;
    });
  }

  const opts = window.FPSSupport?.passiveEvents ? { passive: true } : false;
  window.addEventListener('scroll', onScroll, opts);
  window._parallaxCleanup = () => window.removeEventListener('scroll', onScroll, opts);

  _animateHeroEntrance(gsap);
}

/**
 * Animación de entrada del hero al cargar la página.
 * Los elementos del hero aparecen en secuencia con un suave efecto de fade + slide.
 * Al terminar la secuencia, la tarjeta del producto destacado flota de forma continua.
 */
function _animateHeroEntrance(gsap) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.fromTo('.hero-tag',      { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 })
    .fromTo('.hero-title',    { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.4')
    .fromTo('.hero-subtitle', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .fromTo('.hero-cta',      { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
    .fromTo('.hero-stats',    { opacity: 0 },         { opacity: 1, duration: 0.5 },       '-=0.2')
    .fromTo('.hero-featured', { opacity: 0, x: 40, scale: 0.96 },
                               { opacity: 1, x: 0, scale: 1, duration: 0.8 },             '-=0.6');

  // Animación de flotación continua de la tarjeta destacada
  gsap.to('.hero-featured', {
    y: -12, duration: 3, ease: 'sine.inOut',
    yoyo: true, repeat: -1, delay: 1,
  });
}

/**
 * Detiene y limpia el parallax.
 * Útil si el hero se elimina del DOM o en transiciones de página.
 */
export function destroyParallax() {
  if (typeof window.ScrollTrigger !== 'undefined') {
    window.ScrollTrigger.getAll().forEach(st => st.kill());
  }
  if (typeof window._parallaxCleanup === 'function') {
    window._parallaxCleanup();
  }
}
