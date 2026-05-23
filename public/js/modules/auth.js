/**
 * auth.js — Gestión de sesión de usuario
 * ────────────────────────────────────────
 * Controla todo el flujo de autenticación visible en la UI:
 *   · Abrir/cerrar el modal de login y registro
 *   · Validar formularios antes de enviar a Firebase
 *   · Actualizar la navbar al iniciar o cerrar sesión
 *
 * Cambios respecto al diseño original:
 *   · El logout ya no usa window.confirm() (que el browser bloqueaba).
 *     En su lugar se muestra un dropdown inline con botones propios.
 *   · El cierre de sesión actualiza el UI al instante sin necesidad de recargar.
 */

import Store                  from './store.js';
import EventBus               from './eventBus.js';
import { login, register }    from './api.js';
import { showToast }          from './toast.js';
import { openModal, closeModal } from './modal.js';

/**
 * Abre el modal de autenticación en la pestaña indicada.
 * Por defecto muestra 'login'; también acepta 'register'.
 */
export function openAuthModal(tab = 'login') {
  openModal('modal-auth');
  switchTab(tab);
}

/** Cierra el modal de autenticación y restaura el foco. */
export function closeAuthModal() {
  closeModal('modal-auth');
}

/**
 * Cambia la pestaña activa dentro del modal (login ↔ register).
 * Actualiza los atributos ARIA para accesibilidad y limpia
 * los mensajes de error del formulario anterior.
 */
export function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    const isActive = t.dataset.tab === tab;
    t.setAttribute('aria-selected', String(isActive));
    t.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  document.querySelectorAll('.auth-panel').forEach(p => {
    p.setAttribute('aria-hidden', String(p.id !== `panel-${tab}`));
  });

  const titleEl = document.getElementById('auth-modal-title');
  const subEl   = document.getElementById('auth-modal-sub');

  if (tab === 'login') {
    if (titleEl) titleEl.textContent = 'Bienvenido de vuelta';
    if (subEl)   subEl.textContent   = 'Inicia sesión para continuar comprando';
  } else {
    if (titleEl) titleEl.textContent = 'Crear una cuenta';
    if (subEl)   subEl.textContent   = 'Es gratis y solo toma un minuto';
  }

  _clearErrors();
}

/**
 * Valida el formulario de login y llama a Firebase Auth.
 * Muestra errores en línea si los campos están vacíos o las credenciales son incorrectas.
 * Al tener éxito, cierra el modal y actualiza la navbar con el nombre del usuario.
 */
export async function submitLogin() {
  _clearErrors();
  const email = _val('login-email');
  const pass  = _val('login-password');

  if (!email || !pass) {
    _showError('login-error', 'Completa todos los campos.');
    _markInvalid('login-email', !email);
    _markInvalid('login-password', !pass);
    return;
  }

  const btn = document.getElementById('btn-login');
  _setLoading(btn, true, 'Iniciando sesión…');

  try {
    const { usuario, token } = await login(email, pass);
    localStorage.setItem('fps_token', token);
    _onAuthSuccess(usuario);
  } catch (e) {
    _showError('login-error', e.message);
  } finally {
    _setLoading(btn, false, 'Iniciar sesión');
  }
}

/**
 * Valida el formulario de registro y crea la cuenta en Firebase Auth.
 * Verifica que todos los campos obligatorios estén completos y que
 * las contraseñas coincidan antes de llamar a la API.
 */
export async function submitRegister() {
  _clearErrors();
  const nombre   = _val('reg-nombre');
  const apellido = _val('reg-apellido');
  const email    = _val('reg-email');
  const telefono = _val('reg-telefono');
  const pass     = _val('reg-password');
  const pass2    = _val('reg-password2');

  const errors = [];
  if (!nombre)        errors.push('reg-nombre');
  if (!apellido)      errors.push('reg-apellido');
  if (!email)         errors.push('reg-email');
  if (!pass)          errors.push('reg-password');
  if (pass !== pass2) errors.push('reg-password2');

  if (errors.length) {
    errors.forEach(id => _markInvalid(id, true));
    _showError('register-error',
      pass !== pass2 ? 'Las contraseñas no coinciden.' : 'Completa los campos obligatorios.'
    );
    return;
  }

  if (pass.length < 8) {
    _showError('register-error', 'La contraseña debe tener mínimo 8 caracteres.');
    _markInvalid('reg-password', true);
    return;
  }

  const btn = document.getElementById('btn-register');
  _setLoading(btn, true, 'Creando cuenta…');

  try {
    const { usuario, token } = await register({ nombre, apellido, email, telefono, password: pass });
    localStorage.setItem('fps_token', token);
    _onAuthSuccess(usuario);
  } catch (e) {
    _showError('register-error', e.message);
  } finally {
    _setLoading(btn, false, 'Crear cuenta');
  }
}

/**
 * Al hacer clic en el user-pill, muestra un dropdown propio con las opciones
 * "Cerrar sesión" y "Cancelar". Reemplaza el window.confirm() del diseño
 * original que el browser bloqueaba y no tenía botón "Cancelar" funcional.
 * Si el dropdown ya está visible, lo cierra (toggle).
 */
export function logout() {
  const { currentUser } = Store.getState();
  if (!currentUser) return;

  const existing = document.getElementById('user-logout-dropdown');
  if (existing) { existing.remove(); return; }

  _showLogoutDropdown(currentUser.nombre);
}

/**
 * Construye y posiciona el dropdown de logout debajo del user-pill.
 * Se cierra automáticamente si el usuario hace clic fuera de él.
 */
function _showLogoutDropdown(nombre) {
  const pill = document.getElementById('user-pill');
  if (!pill) return;

  const dropdown = document.createElement('div');
  dropdown.id = 'user-logout-dropdown';
  dropdown.setAttribute('role', 'menu');
  dropdown.innerHTML = `
    <p class="logout-dd-name">Hola, <strong>${nombre}</strong></p>
    <hr class="logout-dd-sep">
    <button id="btn-confirm-logout" class="logout-dd-btn logout-dd-btn--danger" role="menuitem">
      Cerrar sesión
    </button>
    <button id="btn-cancel-logout" class="logout-dd-btn" role="menuitem">
      Cancelar
    </button>
  `;

  pill.style.position = 'relative';
  pill.appendChild(dropdown);

  document.getElementById('btn-confirm-logout').addEventListener('click', () => {
    dropdown.remove();
    _executeLogout();
  });

  document.getElementById('btn-cancel-logout').addEventListener('click', () => {
    dropdown.remove();
  });

  setTimeout(() => {
    document.addEventListener('click', function _outside(e) {
      if (!dropdown.contains(e.target) && e.target !== pill) {
        dropdown.remove();
        document.removeEventListener('click', _outside);
      }
    });
  }, 0);
}

/**
 * Ejecuta el cierre de sesión: limpia el Store, borra localStorage
 * y actualiza la navbar al instante sin necesitar recargar la página.
 */
function _executeLogout() {
  Store.setState({ currentUser: null }, 'auth:logout');
  Store.persistUser(null);
  _renderUserUI(null);
  showToast('Sesión cerrada correctamente.', 'info');
  EventBus.emit('auth:logout', null);
}

/**
 * Al iniciar la app, restaura el estado visual de la navbar
 * según si había una sesión guardada en localStorage o no.
 */
export function restoreSession() {
  _renderUserUI(Store.getState().currentUser);
}

/**
 * Actualiza la navbar según el estado de sesión:
 *   · Con sesión activa: oculta los botones de auth y muestra el user-pill con el nombre
 *   · Sin sesión: muestra los botones "Iniciar sesión" y "Registrarse"
 */
function _renderUserUI(user) {
  const btnLogin    = document.getElementById('btn-open-auth');
  const btnRegister = document.getElementById('btn-open-register');
  const userPill    = document.getElementById('user-pill');
  const avatarEl    = document.getElementById('user-avatar-initial');
  const nameEl      = document.getElementById('user-display-name');

  if (!btnLogin || !userPill) return;

  if (user) {
    btnLogin.hidden    = true;
    btnRegister.hidden = true;
    userPill.hidden    = false;
    if (avatarEl) avatarEl.textContent = user.nombre.charAt(0).toUpperCase();
    if (nameEl)   nameEl.textContent   = user.nombre;
  } else {
    btnLogin.hidden    = false;
    btnRegister.hidden = false;
    userPill.hidden    = true;
  }
}

/** Ejecuta las acciones post-login: guarda en Store, cierra modal y saluda al usuario. */
function _onAuthSuccess(user) {
  Store.setState({ currentUser: user }, 'auth:login');
  Store.persistUser(user);
  closeAuthModal();
  _renderUserUI(user);
  showToast(`¡Bienvenido, ${user.nombre}!`, 'success');
}

// ── Helpers de formulario ──────────────────────────────────

/** Lee y recorta el valor de un input por su ID. */
function _val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/** Muestra un mensaje de error en el elemento indicado. */
function _showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.setAttribute('aria-hidden', 'false');
}

/** Limpia todos los errores y marcas de campo inválido del formulario. */
function _clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll('[aria-invalid]').forEach(el => {
    el.setAttribute('aria-invalid', 'false');
  });
}

/** Marca o desmarca un campo como inválido (para el estilo de error en CSS). */
function _markInvalid(id, invalid) {
  const el = document.getElementById(id);
  if (el) el.setAttribute('aria-invalid', String(invalid));
}

/** Deshabilita un botón y cambia su texto mientras se procesa una petición. */
function _setLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = label;
}
