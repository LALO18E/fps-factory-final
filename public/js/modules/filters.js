/**
 * filters.js — Filtrado y ordenamiento del catálogo
 * ───────────────────────────────────────────────────
 * Toma la lista completa de productos del Store y devuelve
 * un subconjunto filtrado y ordenado según las selecciones del usuario:
 *   · Checkboxes de categoría en el sidebar
 *   · Rango de precio mínimo / máximo
 *   · Búsqueda por texto
 *   · Filtros "En stock" y "Destacados"
 *   · Selector de ordenamiento (precio, nombre, destacado)
 *
 * Cada filtro es una función pura independiente (predicado),
 * lo que permite añadir nuevos filtros sin modificar la lógica central.
 */

import Store    from './store.js';
import EventBus from './eventBus.js';

// ── Predicados de filtro ───────────────────────────────────
// Cada función recibe el parámetro del filtro y devuelve
// otra función que evalúa si un producto pasa o no el filtro.

/** Filtra por categorías seleccionadas. Si no hay ninguna seleccionada, pasan todos. */
const byCategory = (cats) => (p) =>
  cats.length === 0 || cats.includes(p.categoria);

/** Filtra por texto buscado en nombre, marca y categoría del producto. */
const bySearch = (query) => (p) =>
  !query || `${p.nombre} ${p.marca} ${p.categoria}`.toLowerCase().includes(query);

/** Filtra por precio mínimo (en MXN sin IVA). */
const byPriceMin = (min) => (p) => min === null || p.precio >= min;

/** Filtra por precio máximo (en MXN sin IVA). */
const byPriceMax = (max) => (p) => max === null || p.precio <= max;

/** Si el toggle "En stock" está activo, oculta los productos sin unidades disponibles. */
const byStock = (onlyInStock) => (p) => !onlyInStock || p.stock_disponible > 0;

/** Si el toggle "Destacados" está activo, muestra solo los productos marcados como destacados. */
const byFeatured = (onlyFeatured) => (p) => !onlyFeatured || Boolean(p.destacado);

// ── Ordenamiento ───────────────────────────────────────────

const SORTERS = {
  'default':    () => 0,
  'price-asc':  (a, b) => a.precio - b.precio,
  'price-desc': (a, b) => b.precio - a.precio,
  'name-asc':   (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  'featured':   (a, b) => (b.destacado || 0) - (a.destacado || 0),
};

/**
 * Aplica todos los filtros activos sobre la lista completa de productos
 * y emite el resultado como 'filters:applied' para que render.js
 * actualice el grid del catálogo.
 */
export function applyFilters() {
  const {
    allProducts, selectedCategories, searchQuery,
    priceRange, filterInStock, filterFeatured, sortMode,
  } = Store.getState();

  const predicates = [
    byCategory(selectedCategories),
    bySearch(searchQuery),
    byPriceMin(priceRange.min),
    byPriceMax(priceRange.max),
    byStock(filterInStock),
    byFeatured(filterFeatured),
  ];

  const filtered = allProducts.filter(p => predicates.every(pred => pred(p)));
  const sorted   = [...filtered].sort(SORTERS[sortMode] || SORTERS['default']);

  Store.setState({ filteredProducts: sorted }, 'filters:applied');
}

/**
 * Se dispara cuando el usuario marca o desmarca una categoría en el sidebar.
 * Lee todos los checkboxes seleccionados y actualiza el Store.
 */
export function onCategoryChange() {
  const checked = Array.from(
    document.querySelectorAll('[data-filter-cat]:checked')
  ).map(cb => cb.dataset.filterCat);

  Store.setState({ selectedCategories: checked });
  applyFilters();
}

/**
 * Se dispara con cada tecla en el buscador (con debounce aplicado en catalog.js).
 * Normaliza el texto a minúsculas para hacer la búsqueda insensible a mayúsculas.
 */
export function onSearchInput(e) {
  Store.setState({ searchQuery: e.target.value.toLowerCase().trim() });
  applyFilters();
}

/** Se dispara al cambiar el selector de ordenamiento en la barra del catálogo. */
export function onSortChange(e) {
  Store.setState({ sortMode: e.target.value });
  applyFilters();
}

/**
 * Se dispara al hacer clic en "Aplicar" del filtro de precio.
 * Convierte los valores de los inputs a número o null si están vacíos.
 * También responde a la tecla Enter dentro de los campos de precio.
 */
export function onPriceApply() {
  const minEl = document.getElementById('price-min');
  const maxEl = document.getElementById('price-max');
  const min   = minEl?.value !== '' ? parseFloat(minEl.value) : null;
  const max   = maxEl?.value !== '' ? parseFloat(maxEl.value) : null;

  Store.setState({ priceRange: { min, max } });
  applyFilters();
}

/** Se dispara al activar o desactivar el toggle "En stock". */
export function onStockChange(e) {
  Store.setState({ filterInStock: e.target.checked });
  applyFilters();
}

/** Se dispara al activar o desactivar el toggle "Destacados". */
export function onFeaturedChange(e) {
  Store.setState({ filterFeatured: e.target.checked });
  applyFilters();
}

/**
 * Actualiza los contadores numéricos junto a cada categoría en el sidebar
 * (ej: "CPU  3"). Se llama una sola vez al terminar de cargar el catálogo.
 * El ID del span debe coincidir con el formato: fc-{categoria-con-guiones}.
 */
export function updateCategoryCounts(allProducts) {
  const countMap = allProducts.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] || 0) + 1;
    return acc;
  }, {});

  document.querySelectorAll('[data-filter-cat]').forEach(cb => {
    const cat     = cb.dataset.filterCat;
    const countEl = document.getElementById(`fc-${cat.replace(/\s+/g, '-')}`);
    if (countEl) countEl.textContent = countMap[cat] || 0;
  });
}
