const CACHE_NAME = 'aurora-cache-v4';  // Versão atualizada
const urlsToCache = [
    '/',
    '/index.html',
    '/detalhe.html',
    '/blog.html',
    '/categoria.html',
    '/rastreio.html',
    '/style.css',
    '/logo auro.png',
    '/manifest.json',
    '/js/app.js',
    '/js/carrinho.js',
    '/js/catalogo.js',
    '/js/config.js',
    '/js/utils.js',
    '/js/menu.js',
    '/js/avaliacoes.js',
    '/js/blog.js',
    '/js/post.js',
    '/js/detalhe-app.js',
    '/js/categoria.js',
    '/js/admin.js',
    '/js/admin-vendas.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
});

// Estratégia: network-first para JS (evita versões antigas), cache-first para o resto
self.addEventListener('fetch', event => {
    if (event.request.url.endsWith('.js')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});