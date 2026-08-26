// =========================================================
// CONFIGURAÇÃO DO FIREBASE - AURORA COMERCIAL
// =========================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// 🔑 SUAS CHAVES REAIS (copiadas do console Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDxNoAdNf7eAT0GqrpN5HDN1x_HdSJvzH4",
  authDomain: "aurora-comercial.firebaseapp.com",
  projectId: "aurora-comercial",
  storageBucket: "aurora-comercial.firebasestorage.app",
  messagingSenderId: "998765354073",
  appId: "1:998765354073:web:ea2c6934e8e9d4cad3a548",
  measurementId: "G-FLB6IEN40Q"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Configurações gerais do site
export const CONFIG = {
    CACHE_KEY: 'aurora_catalogo_cache',
    CACHE_TTL: 60 * 60 * 1000,
    NUMERO_WHATSAPP: '244933677628'
};