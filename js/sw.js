const CACHE_NAME = 'aurora-cache-v8';
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
    '/js/admin-vendas.js',
    '/js/fidelidade.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.allSettled(
                    urlsToCache.map(url => cache.add(url).catch(err => {
                        console.warn(`Falha ao cachear: ${url}`, err);
                    }))
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // JS: network-first
    if (event.request.url.endsWith('.js')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
        );
    } 
    // Imagens (incluindo WebP): cache-first
    else if (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png') || event.request.url.endsWith('.webp') || event.request.url.endsWith('.jpeg') || event.request.url.includes('i.ibb.co')) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request).then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                }).catch(() => caches.match('/logo auro.png')))
        );
    }
    // Outros: cache-first
    else {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request).then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return response;
                }).catch(() => caches.match('/index.html')))
        );
    }
});