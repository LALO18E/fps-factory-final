/**
 * render.js — Renderizado del DOM
 * ────────────────────────────────
 * Convierte los datos del Store en elementos HTML visibles.
 * No modifica el estado de la app; solo escribe en el DOM.
 *
 * Responsabilidades:
 *   · renderProductGrid()   → grilla de tarjetas del catálogo
 *   · renderHeroFeatured()  → tarjeta del producto destacado en el hero
 *   · renderSkeletons()     → placeholders animados mientras carga el catálogo
 *   · openProductModal()    → modal de detalle con carrusel de imágenes
 */

import Store         from './store.js';
import { formatMXN } from './api.js';
import { addToCart } from './cart.js';
import { openModal } from './modal.js';

// ══════════════════════════════════════════════════════════
//  GRILLA DEL CATÁLOGO
// ══════════════════════════════════════════════════════════

/**
 * Renderiza las tarjetas de producto en el grid principal.
 * Actualiza el título y el contador de resultados en la cabecera del catálogo.
 * Si no hay productos que mostrar, renderiza el estado vacío con ícono.
 */
export function renderProductGrid(products) {
  const grid    = document.getElementById('products-grid');
  const countEl = document.getElementById('catalog-count');
  const titleEl = document.getElementById('catalog-title');
  if (!grid) return;

  const { selectedCategories } = Store.getState();
  const categoryLabel = selectedCategories.length === 1
    ? selectedCategories[0]
    : 'Todo el catálogo';

  if (titleEl) titleEl.textContent = categoryLabel;
  if (countEl) countEl.textContent = products.length === 0
    ? 'Sin resultados'
    : `${products.length} producto${products.length !== 1 ? 's' : ''}`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" role="status">
        <div class="empty-state-icon" aria-hidden="true">🔍</div>
        <p class="empty-state-text">Sin productos para estos filtros</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map((p, i) => _cardTemplate(p, i)).join('');
  if (window.lucide) window.lucide.createIcons({ nodes: [grid] });
  _bindGridEvents(grid);
}

/**
 * Genera el HTML de una tarjeta de producto.
 * Muestra badges de "Destacado" y "Últimas unidades" cuando aplican.
 * Incluye un badge de galería si el producto tiene imágenes extra.
 * La animación de entrada usa un delay escalonado según el índice.
 */
function _cardTemplate(p, index) {
  const delay     = Math.min(index * 60, 500);
  const lowStock  = p.stock_disponible > 0 && p.stock_disponible <= 3;
  const stockText = p.stock_disponible === 0
    ? '❌ Sin stock'
    : `✅ ${p.stock_disponible} disponibles`;

  const hasGallery   = Array.isArray(p.imagenes_extra) && p.imagenes_extra.length > 0;
  const galleryBadge = hasGallery
    ? `<span class="card-gallery-badge" aria-label="${p.imagenes_extra.length + 1} fotos">
         <i data-lucide="images" width="11" height="11" aria-hidden="true"></i>
         ${p.imagenes_extra.length + 1}
       </span>`
    : '';

  return `
    <article class="product-card"
             style="animation-delay:${delay}ms"
             data-product-id="${p.id_producto}"
             role="article"
             aria-label="${p.nombre}">
      ${p.destacado ? '<span class="card-badge badge-featured" aria-label="Producto destacado">Destacado</span>' : ''}
      ${lowStock    ? '<span class="card-badge badge-low-stock">Últimas unidades</span>'                          : ''}
      <div class="card-img-wrap" aria-hidden="true">
        <div class="card-img-glow"></div>
        <img class="card-img"
             src="${p.imagen_url || ''}" alt="${p.nombre}"
             width="200" height="150" loading="lazy"
             onerror="this.src='https://placehold.co/300x200/0f1623/00d2ff?text=FPS'">
        ${galleryBadge}
      </div>
      <div class="card-body">
        <p class="card-category">${p.categoria}</p>
        <h3 class="card-name">${p.nombre}</h3>
        <p class="card-brand">${p.marca}</p>
        <div class="card-footer">
          <div>
            <p class="card-price">${formatMXN(p.precio)}</p>
            <p class="card-price-iva">Con IVA: ${formatMXN(p.precio_iva)}</p>
          </div>
          <button class="btn-add-cart"
                  aria-label="Agregar ${p.nombre} al carrito"
                  data-action="quick-add"
                  data-id="${p.id_producto}"
                  ${p.stock_disponible === 0 ? 'disabled aria-disabled="true"' : ''}>
            <i data-lucide="plus" width="16" height="16" aria-hidden="true"></i>
          </button>
        </div>
        <p class="card-stock" aria-live="polite">${stockText}</p>
      </div>
    </article>`;
}

/**
 * Registra los eventos de la grilla mediante delegación.
 * Un clic en el botón "+" agrega el producto directamente al carrito.
 * Un clic en cualquier otra parte de la tarjeta abre el modal de detalle.
 */
function _bindGridEvents(grid) {
  const fresh = grid.cloneNode(true);
  grid.parentNode.replaceChild(fresh, grid);
  if (window.lucide) window.lucide.createIcons({ nodes: [fresh] });

  fresh.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-action="quick-add"]');
    if (addBtn) {
      e.stopPropagation();
      _quickAdd(parseInt(addBtn.dataset.id, 10), addBtn);
      return;
    }
    const card = e.target.closest('.product-card');
    if (card) openProductModal(parseInt(card.dataset.productId, 10));
  });

  fresh.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.product-card');
    if (card && e.target === card) {
      e.preventDefault();
      openProductModal(parseInt(card.dataset.productId, 10));
    }
  });
}

/**
 * Agrega 1 unidad al carrito desde la tarjeta (botón "+").
 * Muestra una animación visual en el botón para confirmar la acción.
 */
function _quickAdd(id, btn) {
  const product = Store.getState().allProducts.find(p => p.id_producto === id);
  if (!product || product.stock_disponible === 0) return;
  addToCart(product, 1);
  btn.classList.add('added');
  setTimeout(() => btn.classList.remove('added'), 1200);
}


// ══════════════════════════════════════════════════════════
//  HERO — PRODUCTO DESTACADO
// ══════════════════════════════════════════════════════════

/**
 * Muestra el primer producto marcado como destacado en la sección hero.
 * Si no hay ninguno marcado, usa el primer producto del catálogo.
 * Actualiza el nombre, precio e imagen del bloque hero-featured.
 */
export function renderHeroFeatured(allProducts) {
  const featured = allProducts.find(p => p.destacado) || allProducts[0];
  if (!featured) return;

  const nameEl  = document.getElementById('hf-name');
  const priceEl = document.getElementById('hf-price');
  const imgWrap = document.querySelector('.hero-featured-img-wrap');

  if (nameEl)  nameEl.textContent = featured.nombre;
  if (priceEl) priceEl.innerHTML  =
    `${formatMXN(featured.precio)} <span class="hero-featured-price-label">MXN sin IVA</span>`;

  if (imgWrap && featured.imagen_url) {
    imgWrap.innerHTML = `
      <img class="hero-featured-img"
           src="${featured.imagen_url}" alt="${featured.nombre}"
           width="300" height="200" loading="eager"
           onerror="this.style.display='none'">`;
  }
}


// ══════════════════════════════════════════════════════════
//  SKELETONS DE CARGA
// ══════════════════════════════════════════════════════════

/**
 * Muestra placeholders animados en el grid mientras se cargan los productos.
 * Evita que el usuario vea una página en blanco durante la espera inicial.
 */
export function renderSkeletons(count = 4) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line" style="height:11px;width:45%"></div>
        <div class="skeleton-line" style="height:17px;width:90%"></div>
        <div class="skeleton-line" style="height:13px;width:65%;margin-top:14px"></div>
      </div>
    </div>`).join('');
}


// ══════════════════════════════════════════════════════════
//  MODAL DE DETALLE — CARRUSEL DE IMÁGENES
// ══════════════════════════════════════════════════════════

/**
 * Estado interno del carrusel de imágenes del modal.
 * Gestiona la imagen activa, la navegación entre slides
 * y la sincronización con los thumbnails.
 */
const Carousel = {
  images: [], current: 0, total: 0,

  /** Inicializa el carrusel con la imagen principal y las extra del producto. */
  init(mainImage, extraImages = []) {
    this.images  = [mainImage, ...extraImages].filter(Boolean);
    this.current = 0;
    this.total   = this.images.length;
  },

  /** Avanza a la imagen siguiente (con vuelta circular). */
  next() { this.current = (this.current + 1) % this.total; this._render(); },

  /** Retrocede a la imagen anterior (con vuelta circular). */
  prev() { this.current = (this.current - 1 + this.total) % this.total; this._render(); },

  /** Salta directamente a la imagen del índice indicado. */
  goTo(index) {
    if (index < 0 || index >= this.total) return;
    this.current = index;
    this._render();
  },

  /**
   * Actualiza la imagen principal, los thumbnails activos y el contador
   * (ej: "2 / 3") cada vez que cambia la imagen activa.
   */
  _render() {
    const mainImg = document.getElementById('md-img');
    if (mainImg) {
      mainImg.classList.add('carousel-fade');
      setTimeout(() => {
        mainImg.src = this.images[this.current];
        mainImg.classList.remove('carousel-fade');
      }, 150);
    }

    document.querySelectorAll('.carousel-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === this.current);
      thumb.setAttribute('aria-pressed', String(i === this.current));
    });

    const counter = document.getElementById('carousel-counter');
    if (counter) counter.textContent = `${this.current + 1} / ${this.total}`;

    const arrows = document.querySelectorAll('.carousel-arrow');
    arrows.forEach(a => { a.style.display = this.total <= 1 ? 'none' : 'flex'; });
  },
};

/**
 * Busca el producto por ID en el Store y abre el modal de detalle.
 * Llena todos los campos del modal (nombre, precio, specs, carrusel)
 * antes de mostrarlo.
 */
export function openProductModal(productId) {
  const product = Store.getState().allProducts.find(p => p.id_producto === productId);
  if (!product) return;

  Store.setState({ activeProduct: product });
  _populateProductModal(product);
  openModal('modal-product');
}

/** Rellena todos los campos del modal con los datos del producto recibido. */
function _populateProductModal(p) {
  _setText('md-cat',       p.categoria);
  _setText('md-name',      p.nombre);
  _setText('md-brand',     p.marca);
  _setText('md-price',     formatMXN(p.precio));
  _setText('md-price-sub', `Con IVA: ${formatMXN(p.precio_iva)} · Precio en MXN`);
  _setText('md-desc',      p.descripcion || '');

  const qtyInput = document.getElementById('qty-input');
  if (qtyInput) { qtyInput.value = 1; qtyInput.max = p.stock_disponible; }

  const dot = document.getElementById('md-stock-dot');
  const txt = document.getElementById('md-stock-text');
  const btn = document.getElementById('btn-modal-add-cart');

  if (p.stock_disponible === 0) {
    if (dot) dot.className = 'stock-dot out';
    if (txt) txt.textContent = 'Sin stock disponible';
    if (btn) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
  } else if (p.stock_disponible <= 5) {
    if (dot) dot.className = 'stock-dot low';
    if (txt) txt.textContent = `Solo ${p.stock_disponible} unidades disponibles`;
    if (btn) { btn.disabled = false; btn.setAttribute('aria-disabled', 'false'); }
  } else {
    if (dot) dot.className = 'stock-dot';
    if (txt) txt.textContent = `${p.stock_disponible} en stock`;
    if (btn) { btn.disabled = false; btn.setAttribute('aria-disabled', 'false'); }
  }

  const specsEl = document.getElementById('md-specs');
  if (specsEl) {
    if (p.especificaciones && typeof p.especificaciones === 'object') {
      specsEl.innerHTML = Object.entries(p.especificaciones)
        .map(([k, v]) => `<dt class="spec-key">${k}</dt><dd class="spec-val">${v}</dd>`)
        .join('');
      specsEl.style.display = 'grid';
    } else {
      specsEl.style.display = 'none';
    }
  }

  _buildCarousel(p);

  if (window.lucide) window.lucide.createIcons({
    nodes: [document.getElementById('modal-product')],
  });
}

/**
 * Construye el HTML del carrusel en el modal.
 * Si el producto solo tiene una imagen, oculta las flechas y los thumbnails.
 * Si tiene varias, renderiza flechas, thumbnails y un contador "1 / N".
 */
function _buildCarousel(p) {
  const panel = document.getElementById('md-carousel-panel');
  if (!panel) return;

  Carousel.init(p.imagen_url, Array.isArray(p.imagenes_extra) ? p.imagenes_extra : []);
  const hasManyImages = Carousel.total > 1;

  panel.innerHTML = `
    <div class="carousel-main" role="img" aria-label="Imagen del producto">
      <img id="md-img" class="modal-product-img"
           src="${Carousel.images[0] || ''}" alt="${p.nombre}"
           width="300" height="280" loading="lazy"
           onerror="this.src='https://placehold.co/300x280/0f1623/00d2ff?text=FPS'">

      <button class="carousel-arrow carousel-arrow--prev" aria-label="Imagen anterior"
              style="${hasManyImages ? '' : 'display:none'}" data-carousel="prev">
        <i data-lucide="chevron-left" width="20" height="20" aria-hidden="true"></i>
      </button>
      <button class="carousel-arrow carousel-arrow--next" aria-label="Imagen siguiente"
              style="${hasManyImages ? '' : 'display:none'}" data-carousel="next">
        <i data-lucide="chevron-right" width="20" height="20" aria-hidden="true"></i>
      </button>

      ${hasManyImages
        ? `<span class="carousel-counter" id="carousel-counter" aria-live="polite">1 / ${Carousel.total}</span>`
        : ''}
    </div>

    ${hasManyImages ? `
      <div class="carousel-thumbs" role="group" aria-label="Miniaturas">
        ${Carousel.images.map((url, i) => `
          <button class="carousel-thumb ${i === 0 ? 'active' : ''}"
                  data-carousel-thumb="${i}"
                  aria-label="Ver imagen ${i + 1}" aria-pressed="${i === 0}">
            <img src="${url}" alt="Miniatura ${i + 1}"
                 width="56" height="56" loading="lazy"
                 onerror="this.src='https://placehold.co/56/0f1623/00d2ff?text=FPS'">
          </button>`).join('')}
      </div>` : ''}`;

  _bindCarouselEvents(panel);
}

/**
 * Registra los eventos del carrusel: clic en flechas, clic en thumbnails
 * y navegación con las teclas ← → cuando el modal está abierto.
 */
function _bindCarouselEvents(panel) {
  panel.addEventListener('click', (e) => {
    const arrow = e.target.closest('[data-carousel]');
    if (arrow) {
      arrow.dataset.carousel === 'next' ? Carousel.next() : Carousel.prev();
      return;
    }
    const thumb = e.target.closest('[data-carousel-thumb]');
    if (thumb) Carousel.goTo(parseInt(thumb.dataset.carouselThumb, 10));
  });

  const keyHandler = (e) => {
    const modal = document.getElementById('modal-product');
    if (!modal || modal.getAttribute('aria-hidden') !== 'false') return;
    if (e.key === 'ArrowRight') Carousel.next();
    if (e.key === 'ArrowLeft')  Carousel.prev();
  };

  panel._keyHandler = keyHandler;
  document.addEventListener('keydown', keyHandler);
}

/**
 * Limpia el listener de teclado del carrusel al cerrar el modal.
 * Sin esto, el keydown se acumularía en cada apertura del modal.
 */
export function cleanupCarousel() {
  const panel = document.getElementById('md-carousel-panel');
  if (panel?._keyHandler) document.removeEventListener('keydown', panel._keyHandler);
}

// ── Controles de cantidad en el modal de producto ─────────

/** Incrementa o decrementa el input de cantidad dentro del modal. */
export function changeModalQty(delta) {
  const input = document.getElementById('qty-input');
  if (!input) return;
  const max = parseInt(input.max, 10) || 99;
  input.value = Math.max(1, Math.min(parseInt(input.value, 10) + delta, max));
}

/**
 * Agrega al carrito la cantidad seleccionada en el modal y lo cierra.
 * Lee el producto activo del Store para no tener que pasarlo como parámetro.
 */
export function addToCartFromModal() {
  const { activeProduct } = Store.getState();
  if (!activeProduct) return;
  const qty = parseInt(document.getElementById('qty-input')?.value, 10) || 1;
  addToCart(activeProduct, qty);
  import('./modal.js').then(({ closeModal }) => closeModal('modal-product'));
}

/** Escribe el texto dado en el elemento con el ID indicado. */
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
