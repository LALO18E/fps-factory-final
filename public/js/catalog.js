/**
 * catalog.js — Orquestador principal de la tienda
 * ──────────────────────────────────────────────────
 * Es el único archivo cargado como <script type="module"> en index.html.
 * Su única responsabilidad es conectar los módulos entre sí:
 *   1. Inicializa el Store con datos de localStorage
 *   2. Carga el catálogo desde Firestore (o mock local)
 *   3. Renderiza el estado inicial de la UI
 *   4. Registra todos los listeners del DOM
 *   5. Suscribe los handlers del EventBus
 *
 * Toda la lógica de negocio vive en los módulos importados.
 */

import Store                           from './modules/store.js';
import EventBus                        from './modules/eventBus.js';
import { fetchCatalog, debounce }      from './modules/api.js';
import { showToast }                   from './modules/toast.js';
import { initModalListeners, closeModal } from './modules/modal.js';
import {
  openCart, closeCart,
  renderCartDrawer, updateCartBadge, goToCheckout,
} from './modules/cart.js';
import {
  openAuthModal, switchTab,
  submitLogin, submitRegister, logout, restoreSession,
} from './modules/auth.js';
import {
  applyFilters, onCategoryChange, onSearchInput,
  onSortChange, onPriceApply, onStockChange,
  onFeaturedChange, updateCategoryCounts,
} from './modules/filters.js';
import {
  renderProductGrid, renderHeroFeatured, renderSkeletons,
  changeModalQty, addToCartFromModal,
} from './modules/render.js';
import { initParallax } from './modules/parallax.js';

// ══════════════════════════════════════════════════════════
//  ARRANQUE DE LA APLICACIÓN
// ══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', async () => {

  Store.hydrate();          // Restaura carrito y sesión desde localStorage
  renderSkeletons(6);       // Muestra placeholders mientras carga el catálogo

  let products = [];
  try {
    products = await fetchCatalog();  // Lee productos de Firestore (o mock local)
  } catch {
    showToast('No se pudo cargar el catálogo.', 'error');
  }

  Store.setState({ allProducts: products, filteredProducts: products });

  renderProductGrid(products);       // Pinta las tarjetas del catálogo
  renderHeroFeatured(products);      // Pinta el producto destacado en el hero
  updateCategoryCounts(products);    // Muestra el conteo junto a cada categoría del sidebar

  restoreSession();                  // Muestra el user-pill si había sesión activa
  updateCartBadge();                 // Muestra el contador del carrito si había ítems

  initModalListeners();              // Activa Escape y click-en-overlay para cerrar modales
  initParallax();                    // Activa el efecto parallax del hero con GSAP
  _initNavbarScroll();               // Agrega la clase "scrolled" a la navbar al hacer scroll
  _initEventBusSubscriptions();      // Suscribe los handlers a los eventos globales
  _bindDOMEvents();                  // Conecta todos los botones del HTML con sus funciones

  document.getElementById('loading-screen')?.classList.add('hidden');
});

// ══════════════════════════════════════════════════════════
//  SUSCRIPCIONES AL EVENT BUS
// ══════════════════════════════════════════════════════════

/**
 * Conecta los eventos globales con las funciones que actualizan el DOM.
 * Se ejecuta una sola vez al iniciar la app.
 *
 * · 'filters:applied' → El usuario cambió algún filtro; re-renderizar el grid
 * · 'cart:updated'    → El carrito cambió; actualizar badge y drawer si está abierto
 */
function _initEventBusSubscriptions() {
  EventBus.on('filters:applied', (state) => {
    renderProductGrid(state.filteredProducts);
  });

  EventBus.on('cart:updated', () => {
    updateCartBadge();
    const drawer = document.getElementById('cart-drawer');
    if (drawer?.getAttribute('aria-hidden') === 'false') renderCartDrawer();
  });
}

// ══════════════════════════════════════════════════════════
//  LISTENERS DEL DOM
// ══════════════════════════════════════════════════════════

/**
 * Conecta cada elemento interactivo del HTML con su función correspondiente.
 * Usa ?. (optional chaining) para no romper si algún elemento no existe en la página.
 */
function _bindDOMEvents() {

  // Navbar — autenticación y carrito
  document.getElementById('btn-open-auth')
    ?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('btn-open-register')
    ?.addEventListener('click', () => openAuthModal('register'));
  document.getElementById('user-pill')
    ?.addEventListener('click', logout);
  document.getElementById('cart-btn')
    ?.addEventListener('click', openCart);
  document.getElementById('cart-overlay')
    ?.addEventListener('click', closeCart);

  // Barra de búsqueda — con debounce para no filtrar en cada tecla
  document.getElementById('search-input')
    ?.addEventListener('input', debounce(onSearchInput, 250));

  // Selector de ordenamiento
  document.getElementById('sort-select')
    ?.addEventListener('change', onSortChange);

  // Filtros del sidebar
  document.querySelectorAll('[data-filter-cat]')
    .forEach(cb => cb.addEventListener('change', onCategoryChange));
  document.getElementById('filter-in-stock')
    ?.addEventListener('change', onStockChange);
  document.getElementById('filter-featured')
    ?.addEventListener('change', onFeaturedChange);
  document.getElementById('btn-apply-price')
    ?.addEventListener('click', onPriceApply);
  ['price-min', 'price-max'].forEach(id =>
    document.getElementById(id)
      ?.addEventListener('keydown', e => { if (e.key === 'Enter') onPriceApply(); })
  );

  // Drawer del carrito
  document.getElementById('cart-close-btn')
    ?.addEventListener('click', closeCart);
  document.getElementById('btn-checkout')
    ?.addEventListener('click', goToCheckout);

  // Modal de autenticación — tabs y formularios
  document.getElementById('tab-login')
    ?.addEventListener('click', () => switchTab('login'));
  document.getElementById('tab-register')
    ?.addEventListener('click', () => switchTab('register'));
  document.getElementById('btn-login')
    ?.addEventListener('click', submitLogin);
  document.getElementById('btn-register')
    ?.addEventListener('click', submitRegister);
  document.getElementById('panel-login')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
  document.getElementById('panel-register')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') submitRegister(); });

  // Botones X de cierre de modales
  document.getElementById('close-modal-product')
    ?.addEventListener('click', () => closeModal('modal-product'));
  document.getElementById('close-modal-auth')
    ?.addEventListener('click', () => closeModal('modal-auth'));

  // Modal de producto — cantidad y agregar al carrito
  document.getElementById('btn-modal-add-cart')
    ?.addEventListener('click', addToCartFromModal);
  document.getElementById('qty-dec')
    ?.addEventListener('click', () => changeModalQty(-1));
  document.getElementById('qty-inc')
    ?.addEventListener('click', () => changeModalQty(1));

  // CTAs del hero — scroll al catálogo y abrir registro
  document.getElementById('btn-hero-catalog')
    ?.addEventListener('click', () =>
      document.getElementById('main-layout')?.scrollIntoView({ behavior: 'smooth' })
    );
  document.getElementById('btn-hero-register')
    ?.addEventListener('click', () => openAuthModal('register'));
}

// ══════════════════════════════════════════════════════════
//  EFECTO DE SCROLL EN LA NAVBAR
// ══════════════════════════════════════════════════════════

/**
 * Agrega la clase 'scrolled' a la navbar cuando el usuario baja más de 10px.
 * Esta clase activa un fondo más opaco definido en CSS para mejorar la legibilidad.
 */
function _initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const opts = window.FPSSupport?.passiveEvents ? { passive: true } : false;
  window.addEventListener('scroll', () =>
    navbar.classList.toggle('scrolled', window.scrollY > 10), opts
  );
}
