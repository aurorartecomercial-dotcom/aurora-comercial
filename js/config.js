// =========================================================
// CONFIGURAÇÃO DO FIREBASE - AURORA COMERCIAL
// =========================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// 🔑 CHAVES DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDxNoAdNf7eAT0GqrpN5HDN1x_HdSJvzH4",
  authDomain: "aurora-comerciall.firebaseapp.com",   // ⚠️ USE O ID CORRETO (com dois L ou um L, conforme o seu projeto real)
  projectId: "aurora-comerciall",                    // ⚠️ USE O ID CORRETO
  storageBucket: "aurora-comerciall.firebasestorage.app",
  messagingSenderId: "998765354073",
  appId: "1:998765354073:web:ea2c6934e8e9d4cad3a548",
  measurementId: "G-FLB6IEN40Q"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ⚠️⚠️⚠️ ESTA LINHA É ESSENCIAL PARA O SITE FUNCIONAR ⚠️⚠️⚠️
// O objeto CONFIG é exportado e usado pelos outros ficheiros
export const CONFIG = {
    CACHE_KEY: 'aurora_catalogo_cache',
    CACHE_TTL: 60 * 60 * 1000,
    NUMERO_WHATSAPP: '244933677628'
};