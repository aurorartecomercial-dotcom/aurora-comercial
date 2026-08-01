const CACHE_NAME = 'aurora-cache-v1';
const urlsToCache = [
    'index.html',
    'detalhe.html',
    'admin.html',
    'style.css',
    'js/app.js',
    'js/detalhe-app.js',
    'js/admin.js',
    'js/carrinho.js',
    'js/catalogo.js',
    'js/utils.js',
    'js/config.js',
    'manifest.json',
    'logo auro.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});