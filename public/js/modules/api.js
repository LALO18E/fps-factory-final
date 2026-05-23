/**
 * api.js — Capa de acceso a datos
 * ─────────────────────────────────
 * Centraliza toda la comunicación con Firebase:
 *   · fetchCatalog() → lee productos de Firestore
 *   · login()        → autentica con Firebase Auth
 *   · register()     → crea cuenta y guarda perfil en Firestore
 *
 * Si Firebase no está configurado (desarrollo sin credenciales),
 * fetchCatalog() cae automáticamente al mock local MOCK_PRODUCTS.
 */

/**
 * Productos de ejemplo usados cuando Firestore está vacío o no disponible.
 * También sirven como referencia de la estructura que debe tener cada
 * documento en la colección "productos" de Firestore.
 */
export const MOCK_PRODUCTS = [
  {
    id_producto: 1,
    slug: 'amd-ryzen-9-9950x',
    nombre: 'AMD Ryzen 9 9950X',
    marca: 'AMD', categoria: 'CPU',
    precio: 12999, precio_iva: 15078.84, stock_disponible: 15,
    imagen_url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500',
    imagenes_extra: [
      'https://images.unsplash.com/photo-1555617778-02518510b9d5?w=500',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
    ],
    destacado: 1,
    descripcion: 'El procesador más potente de la arquitectura Zen 5. 16 núcleos, 32 hilos, boost hasta 5.7 GHz.',
    especificaciones: { Núcleos: '16', Hilos: '32', Boost: '5.7 GHz', TDP: '170W', Socket: 'AM5', PCIe: '5.0' },
  },
  {
    id_producto: 2,
    slug: 'nvidia-rtx-5090-fe',
    nombre: 'NVIDIA GeForce RTX 5090 FE',
    marca: 'NVIDIA', categoria: 'GPU',
    precio: 47999, precio_iva: 55678.84, stock_disponible: 7,
    imagen_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500',
    imagenes_extra: [
      'https://images.unsplash.com/photo-1593640408182-31c228d1f3c0?w=500',
      'https://images.unsplash.com/photo-1622151834677-70f982c9adef?w=500',
    ],
    destacado: 1,
    descripcion: 'GPU Blackwell, 32 GB GDDR7, DLSS 4 y ray tracing de cuarta generación.',
    especificaciones: { VRAM: '32 GB GDDR7', Bus: '512-bit', Boost: '2407 MHz', TDP: '575W', DLSS: '4', PCIe: '5.0' },
  },
  {
    id_producto: 3,
    slug: 'corsair-dominator-titanium-ddr5',
    nombre: 'Corsair Dominator Titanium DDR5 64 GB',
    marca: 'Corsair', categoria: 'RAM',
    precio: 6499, precio_iva: 7538.84, stock_disponible: 25,
    imagen_url: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=500',
    imagenes_extra: ['https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500'],
    destacado: 0,
    descripcion: 'Kit DDR5 2×32 GB a 6400 MT/s, XMP 3.0, iCUE ARGB.',
    especificaciones: { Capacidad: '64 GB', 'Vel. XMP': '6400 MT/s', Latencia: 'CL32', Voltaje: '1.40V', RGB: 'iCUE ARGB' },
  },
  {
    id_producto: 4,
    slug: 'samsung-990-pro-2tb',
    nombre: 'Samsung 990 Pro NVMe 2 TB',
    marca: 'Samsung', categoria: 'Almacenamiento',
    precio: 3499, precio_iva: 4058.84, stock_disponible: 30,
    imagen_url: 'https://images.unsplash.com/photo-1601737487795-dab272f52420?w=500',
    imagenes_extra: [],
    destacado: 0,
    descripcion: 'SSD PCIe 4.0, lecturas hasta 7450 MB/s.',
    especificaciones: { Capacidad: '2 TB', Interfaz: 'PCIe 4.0 ×4', Lectura: '7450 MB/s', Escritura: '6900 MB/s' },
  },
  {
    id_producto: 5,
    slug: 'asus-rog-maximus-z890-apex',
    nombre: 'ASUS ROG Maximus Z890 APEX',
    marca: 'ASUS', categoria: 'Motherboard',
    precio: 18999, precio_iva: 22038.84, stock_disponible: 5,
    imagen_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
    imagenes_extra: ['https://images.unsplash.com/photo-1555617778-02518510b9d5?w=500'],
    destacado: 0,
    descripcion: 'Motherboard ATX tope de gama LGA1851. VRM 26+1+2 fases, Wi-Fi 7.',
    especificaciones: { Socket: 'LGA1851', 'Form Factor': 'ATX', VRM: '26+1+2 fases', WiFi: '7 (802.11be)' },
  },
  {
    id_producto: 6,
    slug: 'be-quiet-dark-power-13-1000w',
    nombre: 'be quiet! Dark Power 13 1000W',
    marca: 'be quiet!', categoria: 'Fuente de Poder',
    precio: 5999, precio_iva: 6958.84, stock_disponible: 12,
    imagen_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500',
    imagenes_extra: [],
    destacado: 0,
    descripcion: 'Fuente 80 PLUS Titanium, modular completa, garantía 10 años.',
    especificaciones: { Potencia: '1000W', Cert: '80 PLUS Titanium', Modular: 'Sí', ATX: '3.1', Garantía: '10 años' },
  },
];

/**
 * Carga la lista de productos desde Firestore.
 * Si la colección está vacía o Firestore no responde,
 * devuelve los productos de ejemplo para no dejar la tienda en blanco.
 */
export async function fetchCatalog() {
  const db = window.fpsFire?.db;

  if (!db) {
    console.info('[Api] Firestore no disponible — usando mock local.');
    return MOCK_PRODUCTS;
  }

  try {
    const snap = await db.collection('productos').orderBy('id_producto').get();
    if (snap.empty) {
      console.info('[Api] Colección "productos" vacía — usando mock local.');
      return MOCK_PRODUCTS;
    }
    return snap.docs.map(doc => ({ ...doc.data(), _firestoreId: doc.id }));
  } catch (err) {
    console.warn('[Api] fetchCatalog falló, usando mock:', err);
    return MOCK_PRODUCTS;
  }
}

/**
 * Inicia sesión con Firebase Auth usando email y contraseña.
 * Si la autenticación es exitosa, lee el nombre del usuario
 * guardado en Firestore y lo devuelve junto al token de sesión.
 */
export async function login(email, password) {
  const auth = window.fpsFire?.auth;

  if (!auth) {
    await new Promise(r => setTimeout(r, 600));
    if (email === 'demo@fpsfactory.mx' && password === 'Test@1234') {
      return { usuario: { id: 2, nombre: 'Juan', apellido: 'Pérez', email }, token: 'mock-token' };
    }
    throw new Error('Correo o contraseña incorrectos.');
  }

  try {
    const cred    = await auth.signInWithEmailAndPassword(email, password);
    const token   = await cred.user.getIdToken();
    const snap    = await window.fpsFire.db.collection('usuarios').doc(cred.user.uid).get();
    const extra   = snap.exists ? snap.data() : {};

    const usuario = {
      id:       cred.user.uid,
      nombre:   extra.nombre   || cred.user.displayName?.split(' ')[0] || 'Usuario',
      apellido: extra.apellido || '',
      email:    cred.user.email,
    };
    return { usuario, token };
  } catch (err) {
    throw new Error(_parseAuthError(err.code));
  }
}

/**
 * Crea una cuenta nueva con Firebase Auth y guarda los datos
 * adicionales del perfil (nombre, apellido, teléfono) en Firestore
 * bajo la colección "usuarios/{uid}".
 */
export async function register({ nombre, apellido, email, telefono, password }) {
  const auth = window.fpsFire?.auth;

  if (!auth) {
    await new Promise(r => setTimeout(r, 800));
    return { usuario: { id: 99, nombre, apellido, email }, token: 'mock-token-new' };
  }

  try {
    const cred  = await auth.createUserWithEmailAndPassword(email, password);
    const token = await cred.user.getIdToken();

    await window.fpsFire.db.collection('usuarios').doc(cred.user.uid).set({
      nombre, apellido, email,
      telefono: telefono || '',
      creadoEn: window.firebase?.firestore?.FieldValue?.serverTimestamp() ?? new Date().toISOString(),
    });

    return { usuario: { id: cred.user.uid, nombre, apellido, email }, token };
  } catch (err) {
    throw new Error(_parseAuthError(err.code));
  }
}

/**
 * Traduce los códigos de error de Firebase Auth a mensajes
 * en español comprensibles para el usuario final.
 */
function _parseAuthError(code) {
  const MAP = {
    'auth/operation-not-allowed': 'Activa Email/Contraseña en Firebase Console → Authentication.',
    'auth/user-not-found':        'No existe una cuenta con ese correo.',
    'auth/wrong-password':        'Contraseña incorrecta.',
    'auth/email-already-in-use':  'Ese correo ya está registrado.',
    'auth/invalid-email':         'El correo no tiene formato válido.',
    'auth/weak-password':         'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests':     'Demasiados intentos. Espera un momento.',
    'auth/network-request-failed':'Sin conexión. Revisa tu internet.',
  };
  return MAP[code] || 'Ocurrió un error. Inténtalo de nuevo.';
}

/** Formatea un número como moneda mexicana: $1,234.56 MXN */
export function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Retrasa la ejecución de una función hasta que deje de llamarse
 * por `delay` milisegundos. Se usa en el buscador para no filtrar
 * en cada tecla sino cuando el usuario termina de escribir.
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
