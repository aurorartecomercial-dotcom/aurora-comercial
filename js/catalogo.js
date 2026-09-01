export { criarCardProduto, filtrarEOrdenar, renderizarGrade } from './produtos-lib.js';
export { carregarCatalogo } from './produtos-lib.js'; // Se quiser manter a função de carregar catálogo
// Na verdade, carregarCatalogo já estava em catalogo.js. Vamos incluir a função de carregar catálogo:
import { CONFIG } from './config.js';

export async function carregarCatalogo() {
    if (cacheMemoria) return cacheMemoria;
    if (catalogoPromise) return catalogoPromise;

    catalogoPromise = new Promise(async (resolve) => {
        try {
            const cachedStr = localStorage.getItem(CONFIG.CACHE_KEY);
            if (cachedStr) {
                const cache = JSON.parse(cachedStr);
                if (cache.data && cache.data.length > 0) {
                    cacheMemoria = cache.data;
                    resolve(cacheMemoria);
                    atualizarDoServidor();
                    return;
                }
            }
        } catch (e) {}

        await atualizarDoServidor(resolve);
    });

    return catalogoPromise;
}

let cacheMemoria = null;
let catalogoPromise = null;

async function atualizarDoServidor(resolveCallback) {
    try {
        const response = await fetch('/api/produtos');
        const produtos = await response.json();
        cacheMemoria = produtos;
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ data: produtos, timestamp: Date.now() }));
        if (resolveCallback) resolveCallback(produtos);
    } catch (e) {
        console.warn('Falha ao buscar produtos do servidor:', e);
        if (resolveCallback) resolveCallback([]);
    }
}