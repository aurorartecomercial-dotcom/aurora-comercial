// =========================================================
// CONFIGURAÇÃO DO FIREBASE - AURORA COMERCIAL
// =========================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDhXoAdNf7eAT0GqrpNSHDN1x_Hd5JvzH4",
  authDomain: "aurora-comerciall.firebaseapp.com",
  projectId: "aurora-comerciall",
  storageBucket: "aurora-comerciall.firebasestorage.app",
  messagingSenderId: "998765354073",
  appId: "1:998765354073:web:ea2c6934e8e9d4cad3a548",
  measurementId: "G-FLB61EN4Q9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ⚠️ NÃO ESQUEÇA DE EXPORTAR O CONFIG!
export const CONFIG = {
    CACHE_KEY: 'aurora_catalogo_cache',
    CACHE_TTL: 60 * 60 * 1000,
    NUMERO_WHATSAPP: '244933677628'
};