import { CONFIG } from './config.js';
import { criarCardProduto, filtrarEOrdenar, renderizarGrade } from './produtos-lib.js';

let cacheMemoria = null;
let catalogoPromise = null;

export async function carregarCatalogo() {
    if (cacheMemoria) return cacheMemoria;
    if (catalogoPromise) return catalogoPromise;

    catalogoPromise = new Promise(async (resolve) => {
        // 1. Tenta buscar do cache local
        try {
            const cachedStr = localStorage.getItem(CONFIG.CACHE_KEY);
            if (cachedStr) {
                const cache = JSON.parse(cachedStr);
                // VERIFICAÇÃO SEGURA: só aceita cache se tiver mais de 1 produto
                if (cache.data && cache.data.length > 1) {
                    cacheMemoria = cache.data;
                    resolve(cacheMemoria);
                    // Atualiza em segundo plano
                    atualizarDoServidor();
                    return;
                }
            }
        } catch (e) {}

        // 2. Se o cache for inválido, busca do servidor
        await atualizarDoServidor(resolve);
    });

    return catalogoPromise;
}

async function atualizarDoServidor(resolveCallback) {
    try {
        const response = await fetch('/api/produtos');
        const produtos = await response.json();
        // Só guarda no cache se for uma lista válida
        if (produtos && produtos.length > 0) {
            cacheMemoria = produtos;
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ data: produtos, timestamp: Date.now() }));
            if (resolveCallback) resolveCallback(produtos);
        } else {
            throw new Error('Lista de produtos vazia');
        }
    } catch (e) {
        console.warn('Falha ao buscar produtos do servidor, usando dados de emergência:', e);
        // Se falhar, retorna uma lista vazia para não mostrar produtos falsos
        if (resolveCallback) resolveCallback([]);
    }
}

export { criarCardProduto, filtrarEOrdenar, renderizarGrade };