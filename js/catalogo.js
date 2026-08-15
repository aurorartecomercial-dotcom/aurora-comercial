import { supabase } from './config.js';
import { extrairValorNumerico } from './utils.js';
import { adicionarProdutoCarrinho } from './carrinho.js';

export async function carregarProdutosPagina(categoria, busca, pagina = 1, itensPorPagina = 10) {
    // 1. PLANO A (Garantido): Carrega o ficheiro JSON local para exibir os produtos agora
    try {
        const respostaLocal = await fetch('produtos.json');
        if (respostaLocal.ok) {
            const dadosLocal = await respostaLocal.json();
            // Guarda no cache do navegador para a próxima vez
            localStorage.setItem('aurora_cache_pagina1', JSON.stringify({ data: dadosLocal, timestamp: Date.now() }));
            return dadosLocal; // Retorna os produtos imediatamente!
        }
    } catch (e) { console.warn('Erro a ler JSON local, a tentar cache antigo...'); }

    // 2. PLANO B (Se não houver JSON local, tenta o cache antigo do navegador)
    const cacheData = localStorage.getItem('aurora_cache_pagina1');
    if (cacheData) {
        try {
            const parsed = JSON.parse(cacheData);
            return parsed.data;
        } catch(e) {}
    }

    return []; // Se não houver nada, devolve vazio
}

// Esta função é chamada em segundo plano para atualizar os produtos
export async function buscarAtualizacaoSupabase(categoria, busca, pagina = 1, itensPorPagina = 10) {
    try {
        const offset = (pagina - 1) * itensPorPagina;
        const { data, error } = await supabase
            .rpc('get_paginated_products', {
                p_categoria: categoria === 'todos' ? null : categoria,
                p_busca: busca || null,
                p_limite: itensPorPagina,
                p_offset: offset
            });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn('Supabase offline, a manter cache local.');
        return null; // Retorna null para indicar que falhou
    }
}

// As funções criarCardProduto e renderizarGrade mantêm-se IGUAIS ao seu código original
export function criarCardProduto(prod) {
    // Cole aqui a sua função criarCardProduto original que você já tem
    // (Não preciso reescrevê-la porque você já a tem no seu ficheiro atual)
    // ... código original ...
}
export function renderizarGrade(produtos, container, pagina = 1, itensPorPagina = 10, append = false) {
    // Cole aqui a sua função renderizarGrade original
    // ... código original ...
}