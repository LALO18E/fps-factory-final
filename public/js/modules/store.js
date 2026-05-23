/**
 * store.js — Estado global centralizado de la aplicación
 * ────────────────────────────────────────────────────────
 * Única fuente de verdad de la app. Ningún módulo guarda
 * estado local propio; todos leen y escriben aquí.
 *
 * Flujo de datos:
 *   Acción de usuario → módulo llama setState() → EventBus notifica
 *   → otros módulos escuchan y re-renderizan su parte del DOM
 */

import EventBus from './eventBus.js';

const initialState = {
  allProducts:        [],    // Lista completa de productos cargados desde Firestore
  filteredProducts:   [],    // Subconjunto de productos tras aplicar filtros activos
  cart:               [],    // Ítems en el carrito: [{ id, nombre, qty, precio... }]
  currentUser:        null,  // Usuario autenticado o null si no hay sesión
  activeProduct:      null,  // Producto abierto en el modal de detalle
  sortMode:           'default',
  priceRange:         { min: null, max: null },
  selectedCategories: [],    // Categorías marcadas en el sidebar
  filterInStock:      false, // Si true, oculta productos sin stock
  filterFeatured:     false, // Si true, muestra solo productos destacados
  searchQuery:        '',    // Texto ingresado en la barra de búsqueda
};

const Store = (() => {
  let state = { ...initialState };

  return {
    /** Devuelve una copia del estado actual (inmutable externamente). */
    getState() {
      return { ...state };
    },

    /**
     * Actualiza parcialmente el estado y notifica a los suscriptores.
     * El parámetro eventName permite que los listeners reaccionen
     * solo a los cambios que les interesan.
     */
    setState(partial, eventName = 'state:changed') {
      state = { ...state, ...partial };
      EventBus.emit(eventName, state);
    },

    /**
     * Al cargar la app, recupera el carrito y la sesión del usuario
     * desde localStorage para restaurar la experiencia previa.
     */
    hydrate() {
      try {
        const savedCart = localStorage.getItem('fps_cart');
        const savedUser = localStorage.getItem('fps_user');
        if (savedCart) state.cart        = JSON.parse(savedCart);
        if (savedUser) state.currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.warn('[Store] No se pudo restaurar el estado:', e);
      }
    },

    /** Guarda el carrito en localStorage para persistirlo entre recargas. */
    persistCart() {
      try {
        localStorage.setItem('fps_cart', JSON.stringify(state.cart));
      } catch (e) {
        console.warn('[Store] No se pudo guardar el carrito:', e);
      }
    },

    /**
     * Guarda o borra los datos del usuario en localStorage.
     * Al hacer logout (user = null) también elimina el token de sesión.
     */
    persistUser(user) {
      try {
        if (user) {
          localStorage.setItem('fps_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('fps_user');
          localStorage.removeItem('fps_token');
        }
      } catch (e) {
        console.warn('[Store] No se pudo guardar el usuario:', e);
      }
    },
  };
})();

export default Store;
