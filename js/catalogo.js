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

export function criarCardProduto(prod) {
    const card = document.createElement('a');
    card.className = 'produto-card';
    card.href = `detalhe.html?id=${prod.id}`;
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';

    let imgSrc = prod.imagens && prod.imagens[0] ? prod.imagens[0] : 'placeholder.jpg';
    if (imgSrc.includes('i.ibb.co') && !imgSrc.includes('format=webp')) {
        imgSrc += '?format=webp';
    }

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

    if (prod.estoque !== undefined) {
        if (prod.estoque <= 0) html += `<span style="display:block; color:#E74C3C; font-weight:700; margin-top:6px;">🚫 Esgotado</span>`;
        else if (prod.estoque <= 5) html += `<span style="display:block; color:#E74C3C; font-weight:600; font-size:13px; margin-top:6px;">🔥 Últimas ${prod.estoque} unidades!</span>`;
        else html += `<span style="display:block; color:#27ae60; font-size:13px; margin-top:6px;">✅ ${prod.estoque} em estoque</span>`;
    }

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

export function renderizarGrade(produtos, container, pagina = 1, itensPorPagina = 10, append = false) {
    if (!container) return;
    if (!append && pagina === 1) container.innerHTML = '';
    
    if (produtos.length === 0 && pagina === 1) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#999; font-size:16px;">Nenhum produto encontrado.</p>`;
        return;
    }

    produtos.forEach(prod => {
        const card = criarCardProduto(prod);
        container.appendChild(card);
    });
}