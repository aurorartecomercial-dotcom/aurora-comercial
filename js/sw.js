const CACHE_NAME = 'aurora-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/detalhe.html',
    '/blog.html',
    '/style.css',
    '/logo auro.png',
    '/manifest.json',
    '/produtos.json' // 👈 ADICIONADO AQUI
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Intercepta requisições e serve do cache se disponível
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});