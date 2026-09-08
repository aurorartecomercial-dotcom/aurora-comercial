const CACHE_NAME = 'aurora-cache-v11';
const APP_SHELL = [
  './','./index.html','./detalhe.html','./blog.html','./categoria.html','./rastreio.html','./perfil.html',
  './style.css','./logo auro.png','./manifest.json','./js/app.js','./js/carrinho.js','./js/catalogo.js','./js/config.js',
  './js/utils.js','./js/menu.js','./js/avaliacoes.js','./js/blog.js','./js/post.js','./js/detalhe-app.js',
  './js/categoria.js','./js/fidelidade.js','./js/favoritos.js','./js/chatbot.js','./js/perfil.js','./js/fase3.js','./firebase-messaging-sw.js'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(async cache => { await Promise.allSettled(APP_SHELL.map(u => cache.add(u).catch(()=>null))); await self.skipWaiting(); })));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  const req = event.request;
  if (req.destination === 'script' || req.destination === 'style') {
    event.respondWith(fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy)); return res; }).catch(()=>caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { if(res.ok) { const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy)); } return res; }).catch(()=>caches.match('./index.html'))));
});
