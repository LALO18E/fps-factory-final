/**
 * eventBus.js — Sistema de comunicación entre módulos (pub/sub)
 * ──────────────────────────────────────────────────────────────
 * Permite que los módulos se comuniquen sin importarse entre sí.
 * Por ejemplo: cart.js emite 'cart:updated' y catalog.js reacciona
 * actualizando el badge, sin que ninguno de los dos se conozca directamente.
 *
 * Eventos usados en la app:
 *   'filters:applied'  → Se aplicaron filtros; renderizar la nueva lista
 *   'cart:updated'     → El carrito cambió; actualizar badge y drawer
 *   'auth:logout'      → El usuario cerró sesión; limpiar UI dependiente
 *   'state:changed'    → Cambio genérico de estado (usado internamente)
 */

const EventBus = (() => {
  /** Mapa de evento → conjunto de callbacks suscritos */
  const listeners = new Map();

  return {
    /**
     * Suscribe un callback a un evento.
     * El callback se ejecuta cada vez que se emita el evento.
     */
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
    },

    /**
     * Elimina la suscripción de un callback a un evento.
     * Útil para evitar memory leaks al desmontar componentes.
     */
    off(event, handler) {
      if (listeners.has(event)) listeners.get(event).delete(handler);
    },

    /**
     * Emite un evento y ejecuta todos sus callbacks con el dato recibido.
     * Los errores en handlers individuales se capturan para no romper la cadena.
     */
    emit(event, data) {
      if (!listeners.has(event)) return;
      listeners.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[EventBus] Error en handler de "${event}":`, err);
        }
      });
    },

    /**
     * Suscribe un callback que se ejecuta una sola vez y luego se elimina.
     * Útil para esperar un evento puntual sin acumular listeners.
     */
    once(event, handler) {
      const wrapper = (data) => {
        handler(data);
        this.off(event, wrapper);
      };
      this.on(event, wrapper);
    },
  };
})();

export default EventBus;
