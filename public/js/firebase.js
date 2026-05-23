/**
 * firebase.js — Inicialización de Firebase
 * ─────────────────────────────────────────
 * Este archivo carga primero que cualquier módulo JS de la app.
 * Registra las instancias de Auth y Firestore en window.fpsFire
 * para que todos los módulos puedan accederlas sin importarlas directamente.
 *
 * ⚠️  Requiere que los 3 SDKs compat estén cargados antes en el HTML:
 *     firebase-app-compat.js · firebase-auth-compat.js · firebase-firestore-compat.js
 */

const firebaseConfig = {
  apiKey:            "AIzaSyAnzwUF3ctx7rSk0KdOsdIaaGwQqBpU3ck",
  authDomain:        "fps-factory.firebaseapp.com",
  projectId:         "fps-factory",
  storageBucket:     "fps-factory.firebasestorage.app",
  messagingSenderId: "829779847082",
  appId:             "1:829779847082:web:bd156ec4b5362a4465edd3",
};

firebase.initializeApp(firebaseConfig);

window.fpsFire = {
  auth: firebase.auth(),       // Gestiona login, registro y sesión de usuarios
  db:   firebase.firestore(),  // Base de datos en tiempo real (productos, usuarios)
};

console.info('[Firebase] Inicializado correctamente ✓');
