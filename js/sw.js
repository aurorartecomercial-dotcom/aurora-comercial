const CACHE_NAME = 'aurora-cache-v7';   // use um número maior
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

// ✅ Instalação: cacheia apenas ficheiros que existem
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Usamos Promise.allSettled para não falhar se algum ficheiro não existir
                return Promise.allSettled(
                    urlsToCache.map(url => cache.add(url).catch(err => {
                        console.warn(`Falha ao cachear: ${url}`, err);
                    }))
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ✅ Ativação: limpa caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// ✅ Estratégia: network-first para JS, cache-first para o resto
self.addEventListener('fetch', event => {
    // Se a requisição for para ficheiros JavaScript, busca primeiro na rede (para evitar versões antigas)
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
    // Para imagens, tenta cache primeiro e depois rede
    else if (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png') || event.request.url.endsWith('.webp') || event.request.url.includes('i.ibb.co')) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request).then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                }).catch(() => caches.match('/logo auro.png')))
        );
    }
    // Para o resto: cache primeiro, depois rede
    else {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request).then(response => {
                    // Cacheia apenas respostas válidas (status 200)
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return response;
                }).catch(() => caches.match('/index.html')))
        );
    }
});