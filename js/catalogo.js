import { supabase } from './config.js'; // Importa o Supabase agora
import { CONFIG } from './config.js';
import { extrairValorNumerico } from './utils.js';
import { adicionarProdutoCarrinho } from './carrinho.js';
import { obterAvaliacao } from './avaliacoes.js';

export async function carregarCatalogo() {
    // Tenta pegar do cache do navegador primeiro para ser rápido
    const cachedStr = localStorage.getItem(CONFIG.CACHE_KEY);
    if (cachedStr) {
        try {
            const cache = JSON.parse(cachedStr);
            // Se o cache tiver menos de 1 hora, usa ele
            if (Date.now() - cache.timestamp < CONFIG.CACHE_TTL) {
                return cache.data;
            }
        } catch (e) {}
    }

    // Se não tiver cache ou tiver expirado, busca direto do Supabase
    const { data, error } = await supabase.from('produtos').select('*').order('ordem', { ascending: true });
    
    if (error) {
        console.error('Erro ao carregar produtos do Supabase:', error);
        // Em caso de erro de rede, tenta devolver o cache antigo como fallback
        const fallbackCache = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY));
        if (fallbackCache) return fallbackCache.data;
        return [];
    }

    // Salva os novos dados no cache e devolve
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ data: data || [], timestamp: Date.now() }));
    return data || [];
}

export function criarCardProduto(prod) {
    // (Mantido igual ao seu código original, não mexa aqui)
    const card = document.createElement('a');
    card.className = 'produto-card';
    card.href = `detalhe.html?id=${prod.id}`;
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';

    const imgSrc = prod.imagens && prod.imagens[0] ? prod.imagens[0] : 'placeholder.jpg';

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    const shareLink = `${baseUrl}/detalhe.html?id=${prod.id}`;

    let html = `
        <div class="produto-imagem">
            <img src="${imgSrc}" alt="${prod.nome}" loading="lazy" decoding="async" onerror="this.src='placeholder.jpg'">
        </div>
        <div class="produto-info">
            <span class="categoria-tag">${prod.tag || prod.categoria}</span>
            <h3>${prod.nome}</h3>
    `;

    if (prod.precoAntigo) {
        html += `<p class="preco"><span class="desconto">${prod.desconto || ''}</span> ${prod.preco}</p>`;
        html += `<span style="text-decoration:line-through;color:#999;font-size:14px;">${prod.precoAntigo}</span>`;
    } else {
        html += `<p class="preco">${prod.preco}</p>`;
    }

    if (prod.parcelas) { html += `<p class="parcelas">${prod.parcelas}</p>`; }
    if (prod.freteGratis) { html += `<span class="selo-frete"><strong>Frete grátis</strong> FULL</span>`; }

    let estoqueHtml = '';
    if (prod.estoque !== undefined) {
        if (prod.estoque <= 0) estoqueHtml = `<span style="display:block; color:#E74C3C; font-weight:700; margin-top:6px;">🚫 Esgotado</span>`;
        else if (prod.estoque <= 5) estoqueHtml = `<span style="display:block; color:#E74C3C; font-weight:600; font-size:13px; margin-top:6px;">🔥 Últimas ${prod.estoque} unidades!</span>`;
        else estoqueHtml = `<span style="display:block; color:#27ae60; font-size:13px; margin-top:6px;">✅ ${prod.estoque} em estoque</span>`;
    }
    html += estoqueHtml;

    const avaliacao = obterAvaliacao(prod.id);
    if (avaliacao.media > 0) { html += `<div style="margin-top:6px; font-size:13px;">⭐ ${avaliacao.media.toFixed(1)} (${avaliacao.total})</div>`; }

    html += `
        <div style="margin-top: 12px; display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
            <button class="btn-add-carrinho-card" data-id="${prod.id}" data-nome="${prod.nome}" data-preco="${prod.preco}" data-estoque="${prod.estoque || 0}"
                    style="background: var(--cor-ouro); color: #000; border: none; padding: 8px 16px; border-radius: 30px; font-weight: 700; font-size: 14px; cursor: pointer; flex: 1; transition: 0.2s;">
                🛒 Adicionar
            </button>
            <button onclick="window.shareProduct('${prod.nome}', '${prod.preco}', '${shareLink}')"
                    style="background:transparent; border:1px solid #25D366; color:#25D366; padding:8px 16px; border-radius:30px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:0.2s;">
                📤 Partilhar
            </button>
        </div>
    `;
    html += `</div>`;
    card.innerHTML = html;

    const btnAdd = card.querySelector('.btn-add-carrinho-card');
    if (btnAdd) {
        btnAdd.addEventListener('click', function(e) {
            e.stopPropagation(); e.preventDefault();
            adicionarProdutoCarrinho(
                parseInt(this.dataset.id), 
                this.dataset.nome, 
                this.dataset.preco, 
                parseInt(this.dataset.estoque)
            );
        });
    }
    return card;
}

export function filtrarEOrdenar(produtos, categoria, busca, min, max, ordenacao) {
    let filtrados = produtos.filter(prod => {
        const matchCategoria = categoria === 'todos' || prod.categoria === categoria;
        const matchBusca = !busca || prod.nome.toLowerCase().includes(busca.toLowerCase()) || prod.tag.toLowerCase().includes(busca.toLowerCase()) || prod.categoria.toLowerCase().includes(busca.toLowerCase());
        const precoNum = extrairValorNumerico(prod.preco);
        const matchPreco = precoNum >= min && precoNum <= max;
        return matchCategoria && matchBusca && matchPreco;
    });

    switch (ordenacao) {
        case 'preco-asc': filtrados.sort((a, b) => extrairValorNumerico(a.preco) - extrairValorNumerico(b.preco)); break;
        case 'preco-desc': filtrados.sort((a, b) => extrairValorNumerico(b.preco) - extrairValorNumerico(a.preco)); break;
        case 'nome': filtrados.sort((a, b) => a.nome.localeCompare(b.nome)); break;
        default: filtrados.sort((a, b) => (a.ordem || a.id) - (b.ordem || b.id));
    }
    return filtrados;
}

export function renderizarGrade(produtosFiltrados, container, pagina = 1, itensPorPagina = 10) {
    if (!container) return;
    const start = (pagina - 1) * itensPorPagina;
    const end = start + itensPorPagina;
    const paginaProdutos = produtosFiltrados.slice(start, end);

    if (pagina === 1) container.innerHTML = '';
    if (paginaProdutos.length === 0 && pagina === 1) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#999; font-size:16px;">Nenhum produto encontrado.</p>`;
        return;
    }

    paginaProdutos.forEach(prod => {
        const card = criarCardProduto(prod);
        container.appendChild(card);
    });
}