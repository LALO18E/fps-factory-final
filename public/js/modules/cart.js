/**
 * cart.js — Carrito de compras
 * ─────────────────────────────
 * Gestiona todas las operaciones del carrito y el drawer lateral:
 *   · Agregar, eliminar y cambiar cantidad de productos
 *   · Calcular subtotal, IVA y costo de envío
 *   · Renderizar el drawer con la lista actualizada
 *   · Controlar el acceso al checkout (requiere sesión activa)
 */

import Store         from './store.js';
import EventBus      from './eventBus.js';
import { showToast } from './toast.js';
import { formatMXN } from './api.js';

const ENVIO_GRATIS_UMBRAL = 4000;  // Monto mínimo con IVA para envío sin costo
const COSTO_ENVIO_STD     = 149;   // Costo de envío estándar en MXN

/**
 * Agrega un producto al carrito o incrementa su cantidad si ya existe.
 * Respeta el límite de stock disponible: no permite agregar más
 * unidades de las que hay en inventario.
 */
export function addToCart(product, qty = 1) {
  const state    = Store.getState();
  const existing = state.cart.find(i => i.id === product.id_producto);
  const maxStock = product.stock_disponible;
  let updatedCart;

  if (existing) {
    const newQty = Math.min(existing.qty + qty, maxStock);
    if (newQty === existing.qty) {
      showToast('Has alcanzado el máximo de stock disponible.', 'warning');
      return;
    }
    updatedCart = state.cart.map(i =>
      i.id === product.id_producto ? { ...i, qty: newQty } : i
    );
  } else {
    updatedCart = [...state.cart, {
      id:         product.id_producto,
      nombre:     product.nombre,
      marca:      product.marca,
      categoria:  product.categoria,
      precio:     product.precio,
      precio_iva: product.precio_iva,
      imagen:     product.imagen_url,
      stock:      maxStock,
      qty:        Math.min(qty, maxStock),
    }];
  }

  Store.setState({ cart: updatedCart }, 'cart:updated');
  Store.persistCart();
  showToast(`"${product.nombre}" agregado al carrito.`, 'success');
}

/**
 * Elimina un producto del carrito por su ID.
 * El drawer se re-renderiza automáticamente vía el evento 'cart:updated'.
 */
export function removeFromCart(productId) {
  const updatedCart = Store.getState().cart.filter(i => i.id !== productId);
  Store.setState({ cart: updatedCart }, 'cart:updated');
  Store.persistCart();
}

/**
 * Incrementa o decrementa la cantidad de un ítem en el carrito.
 * El parámetro delta es +1 para aumentar y -1 para disminuir.
 * No permite bajar de 1 ni superar el stock disponible.
 */
export function changeQty(productId, delta) {
  const updatedCart = Store.getState().cart.map(i => {
    if (i.id !== productId) return i;
    return { ...i, qty: Math.max(1, Math.min(i.qty + delta, i.stock)) };
  });
  Store.setState({ cart: updatedCart }, 'cart:updated');
  Store.persistCart();
}

/**
 * Calcula los totales del carrito a partir de los precios sin IVA.
 * El IVA se calcula como el 16% del subtotal.
 * El envío es gratuito si el total con IVA supera el umbral definido.
 */
export function calcTotals(cart) {
  const subtotal    = cart.reduce((s, i) => s + i.precio * i.qty, 0);
  const iva         = subtotal * 0.16;
  const totalConIva = subtotal + iva;
  const envio       = totalConIva >= ENVIO_GRATIS_UMBRAL ? 0 : COSTO_ENVIO_STD;
  return { subtotal, iva, totalConIva, envio, grand: totalConIva + envio };
}

/**
 * Abre el drawer lateral del carrito.
 * Bloquea el scroll del body y mueve el foco al botón de cerrar.
 */
export function openCart() {
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (!drawer || !overlay) return;

  drawer.setAttribute('aria-hidden', 'false');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  renderCartDrawer();

  drawer.querySelector('.cart-close-btn')?.focus();
}

/** Cierra el drawer lateral del carrito y restaura el scroll. */
export function closeCart() {
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (!drawer || !overlay) return;

  drawer.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Genera el HTML del drawer con los ítems actuales del carrito.
 * Si el carrito está vacío muestra un estado vacío con ícono.
 * Si tiene ítems, renderiza la lista y calcula los totales y el mensaje de envío.
 */
export function renderCartDrawer() {
  const list   = document.getElementById('cart-items-list');
  const footer = document.getElementById('cart-footer');
  if (!list || !footer) return;

  const { cart } = Store.getState();

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty-state" role="status">
        <div class="cart-empty-icon" aria-hidden="true">
          <i data-lucide="shopping-cart" width="52" height="52"></i>
        </div>
        <p class="cart-empty-title">Tu carrito está vacío</p>
        <p style="font-size:0.8rem;margin-top:6px;color:var(--text-muted)">
          Agrega productos para comenzar
        </p>
      </div>`;
    footer.hidden = true;
    if (window.lucide) window.lucide.createIcons({ nodes: [list] });
    return;
  }

  footer.hidden  = false;
  list.innerHTML = cart.map(item => `
    <article class="cart-item" aria-label="${item.nombre}">
      <img class="cart-item-img"
           src="${item.imagen || ''}" alt="${item.nombre}"
           width="64" height="64" loading="lazy"
           onerror="this.src='https://placehold.co/64/0f1623/00d2ff?text=FPS'">
      <div class="cart-item-body">
        <p class="cart-item-name" title="${item.nombre}">${item.nombre}</p>
        <p class="cart-item-cat">${item.categoria}</p>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" aria-label="Disminuir cantidad"
                  data-action="dec" data-id="${item.id}">−</button>
          <span class="cart-qty-val" aria-label="Cantidad: ${item.qty}">${item.qty}</span>
          <button class="cart-qty-btn" aria-label="Aumentar cantidad"
                  data-action="inc" data-id="${item.id}">+</button>
          <span class="cart-item-price">${formatMXN(item.precio_iva * item.qty)}</span>
        </div>
      </div>
      <button class="cart-item-remove" aria-label="Eliminar ${item.nombre}"
              data-action="remove" data-id="${item.id}">
        <i data-lucide="x" width="14" height="14" aria-hidden="true"></i>
      </button>
    </article>
  `).join('');

  const { subtotal, iva, envio, grand } = calcTotals(cart);
  document.getElementById('cart-subtotal').textContent = formatMXN(subtotal);
  document.getElementById('cart-iva').textContent      = formatMXN(iva);
  document.getElementById('cart-total').textContent    = formatMXN(grand);

  const note = document.getElementById('cart-shipping-note');
  if (note) {
    if (envio === 0) {
      note.innerHTML = `🚚 <span class="cart-shipping-free">¡Envío gratis!</span> Tu pedido supera los $4,000 MXN`;
    } else {
      const faltante = ENVIO_GRATIS_UMBRAL - (subtotal * 1.16);
      note.innerHTML = `Agrega ${formatMXN(faltante)} más para <span class="cart-shipping-free">envío gratis</span>`;
    }
  }

  if (window.lucide) window.lucide.createIcons({ nodes: [list] });
  _bindCartListEvents(list);
}

/**
 * Registra los eventos de clic en los botones del drawer (+, −, eliminar).
 * Clona el nodo antes de asignar listeners para evitar duplicados al re-renderizar.
 */
function _bindCartListEvents(list) {
  const fresh = list.cloneNode(true);
  list.parentNode.replaceChild(fresh, list);
  if (window.lucide) window.lucide.createIcons({ nodes: [fresh] });

  fresh.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    if (btn.dataset.action === 'inc')    changeQty(id, 1);
    if (btn.dataset.action === 'dec')    changeQty(id, -1);
    if (btn.dataset.action === 'remove') removeFromCart(id);
    renderCartDrawer();
  });
}

/**
 * Actualiza el badge numérico del ícono del carrito en la navbar.
 * Si el total de ítems es mayor a 0, muestra el número con una animación de rebote.
 */
export function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  const total = Store.getState().cart.reduce((s, i) => s + i.qty, 0);
  badge.textContent    = total;
  badge.dataset.visible = total > 0 ? 'true' : 'false';

  if (total > 0) {
    badge.classList.remove('bounce');
    void badge.offsetWidth; // Fuerza reflow para reiniciar la animación CSS
    badge.classList.add('bounce');
  }
}

/**
 * Valida que el carrito tenga ítems y que el usuario tenga sesión
 * antes de redirigir a checkout.html.
 * Si no hay sesión abre el modal de login en lugar de redirigir.
 */
export function goToCheckout() {
  const { currentUser, cart } = Store.getState();

  if (cart.length === 0) {
    showToast('Tu carrito está vacío.', 'warning');
    return;
  }

  if (!currentUser) {
    closeCart();
    import('./auth.js').then(({ openAuthModal }) => openAuthModal('login'));
    showToast('Inicia sesión para continuar con tu compra.', 'info');
    return;
  }

  window.location.href = 'checkout.html';
}
