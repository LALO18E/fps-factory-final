/**
 * modal.js — Ciclo de vida de los modales
 * ─────────────────────────────────────────
 * Controla la apertura y cierre de cualquier modal de la app
 * (modal de producto y modal de autenticación).
 *
 * Al abrir un modal:
 *   · Se bloquea el scroll del body
 *   · El foco del teclado se mueve al interior del modal
 *   · Se activa un "focus trap" para que Tab no salga del modal
 *
 * Al cerrar un modal:
 *   · Se restaura el scroll
 *   · El foco regresa al elemento que lo abrió
 */

let previouslyFocused = null;

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Abre el modal con el ID indicado.
 * Mueve el foco al primer elemento interactivo dentro del modal
 * y activa el focus trap para navegación con teclado.
 */
export function openModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;

  previouslyFocused = document.activeElement;
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    const firstFocusable = overlay.querySelector(FOCUSABLE);
    if (firstFocusable) firstFocusable.focus();
  });

  overlay._focusTrapHandler = (e) => _trapFocus(e, overlay);
  overlay.addEventListener('keydown', overlay._focusTrapHandler);
}

/**
 * Cierra el modal con el ID indicado.
 * Restaura el scroll y devuelve el foco al elemento de origen.
 */
export function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;

  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (overlay._focusTrapHandler) {
    overlay.removeEventListener('keydown', overlay._focusTrapHandler);
    delete overlay._focusTrapHandler;
  }

  if (previouslyFocused?.focus) {
    previouslyFocused.focus();
    previouslyFocused = null;
  }
}

/**
 * Cierra el modal si el click fue directamente en el overlay (fondo oscuro),
 * no en el contenido interior del modal.
 */
export function closeModalOnOverlayClick(e) {
  if (e.target === e.currentTarget) closeModal(e.currentTarget.id);
}

/**
 * Registra los listeners globales de teclado (Escape) y click en overlay.
 * Se llama una sola vez al iniciar la app desde catalog.js.
 */
export function initModalListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay[aria-hidden="false"]').forEach(m => {
      closeModal(m.id);
    });
    const cart = document.getElementById('cart-drawer');
    if (cart?.getAttribute('aria-hidden') === 'false') {
      import('./cart.js').then(({ closeCart }) => closeCart());
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', closeModalOnOverlayClick);
  });
}

/**
 * Mantiene el foco atrapado dentro del modal mientras está abierto.
 * Al llegar al último elemento con Tab, vuelve al primero (y viceversa con Shift+Tab).
 */
function _trapFocus(e, container) {
  if (e.key !== 'Tab') return;

  const focusables = Array.from(container.querySelectorAll(FOCUSABLE));
  if (!focusables.length) return;

  const first = focusables[0];
  const last  = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
