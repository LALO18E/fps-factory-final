/**
 * toast.js — Notificaciones temporales (toasts)
 * ───────────────────────────────────────────────
 * Muestra mensajes emergentes en la esquina de la pantalla que
 * desaparecen solos después de 4 segundos. Se usan para confirmar
 * acciones (producto agregado al carrito) o avisar errores (sin stock).
 *
 * Tipos disponibles: 'success' · 'error' · 'info' · 'warning'
 */

const ICON_MAP = {
  success: 'check-circle',
  error:   'x-circle',
  info:    'info',
  warning: 'alert-triangle',
};

const DURATION_MS = 4000;

/**
 * Crea y muestra un toast en el contenedor #toast-container del HTML.
 * El toast se elimina del DOM al desaparecer (no acumula elementos).
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <span class="toast-icon toast-icon--${type}" aria-hidden="true">
      <i data-lucide="${ICON_MAP[type] || 'info'}" width="16" height="16"></i>
    </span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  if (window.lucide) window.lucide.createIcons({ nodes: [toast] });

  const dismiss = () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400);
  };

  setTimeout(dismiss, DURATION_MS);
  toast.addEventListener('click', dismiss); // También se cierra con un clic
}
