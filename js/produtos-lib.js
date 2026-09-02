import { obterAvaliacao } from './avaliacoes.js';
import { extrairValorNumerico } from './utils.js';
import { CONFIG } from './config.js';

// Cache em memória para evitar múltiplas buscas
let cacheMemoria = null;
let cachePromessa = null;

export function criarCardProduto(prod) {
    const card = document.createElement('a');
    card.className = 'produto-card';
    card.href = `detalhe.html?id=${prod.id}`;
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';

    let imgSrc = prod.imagem || CONFIG.IMAGEM_FALLBACK;

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    const shareLink = `${baseUrl}/detalhe.html?id=${prod.id}`;

    let html = `
        <div class="produto-imagem">
            <img src="${imgSrc}" alt="${prod.nome}" loading="lazy" decoding="async" 
                 onerror="this.onerror=null; this.src='${CONFIG.IMAGEM_FALLBACK}';">
        </div>
        <div class="produto-info">
            <span class="categoria-tag">${prod.tag || prod.categoria}</span>
            <h3>${prod.nome}</h3>
    `;

    if (prod.preco_antigo) {
        html += `<p class="preco"><span class="desconto">${prod.desconto || ''}</span> ${prod.preco}</p>`;
        html += `<span style="text-decoration:line-through;color:#999;font-size:14px;">${prod.preco_antigo}</span>`;
    } else {
        html += `<p class="preco">${prod.preco}</p>`;
    }

    if (prod.parcelas) { html += `<p class="parcelas">${prod.parcelas}</p>`; }

    if (prod.frete_gratis) {
        if (prod.prazo_entrega === 'hoje') {
            html += `<span class="selo-entrega hoje">Chegará grátis hoje</span>`;
        } else if (prod.prazo_entrega === 'amanha') {
            html += `<span class="selo-entrega amanha">Chegará grátis amanhã ⚡ FULL</span>`;
        } else {
            html += `<span class="selo-frete"><strong>Frete grátis</strong> FULL</span>`;
        }
    }

    if (prod.estoque !== undefined) {
        if (prod.estoque <= 0) html += `<span style="display:block; color:#E74C3C; font-weight:700; margin-top:6px;">🚫 Esgotado</span>`;
        else if (prod.estoque <= 5) html += `<span style="display:block; color:#E74C3C; font-weight:600; font-size:13px; margin-top:6px;">🔥 Últimas ${prod.estoque} unidades!</span>`;
        else html += `<span style="display:block; color:#27ae60; font-size:13px; margin-top:6px;">✅ ${prod.estoque} em estoque</span>`;
    }

    html += `<div class="avaliacao-card" data-produto-id="${prod.id}" style="margin-top:6px; font-size:13px; min-height:18px;"></div>`;

    html += `
        <div style="margin-top: 12px; display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
            <button class="btn-add-carrinho-card" 
                    data-id="${prod.id}" 
                    data-nome="${prod.nome}" 
                    data-preco="${prod.preco}" 
                    data-preco-num="${extrairValorNumerico(prod.preco)}" 
                    data-estoque="${prod.estoque || 0}"
                    style="background: var(--cor-ouro); color: #000; border: none; padding: 8px 16px; border-radius: 30px; font-weight: 700; font-size: 14px; cursor: pointer; flex: 1; transition: 0.2s;">
                🛒 Adicionar
            </button>
            <button class="btn-share" data-nome="${prod.nome}" data-preco="${prod.preco}" data-link="${shareLink}"
                    style="background:transparent; border:1px solid #25D366; color:#25D366; padding:8px 16px; border-radius:30px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:0.2s;">
                📤 Partilhar
            </button>
        </div>
    `;
    html += `</div>`;
    card.innerHTML = html;

    obterAvaliacao(prod.id).then(avaliacao => {
        const avaliacaoDiv = card.querySelector('.avaliacao-card');
        if (avaliacaoDiv && avaliacao.media > 0) {
            avaliacaoDiv.textContent = `⭐ ${avaliacao.media.toFixed(1)} (${avaliacao.total})`;
        }
    }).catch(() => {});

    return card;
}

export function filtrarEOrdenar(produtos, categoria, busca, min, max, ordenacao) {
    let filtrados = produtos.filter(prod => {
        const matchCategoria = categoria === 'todos' || prod.categoria === categoria;
        const matchBusca = !busca || prod.nome.toLowerCase().includes(busca.toLowerCase()) || (prod.tag || '').toLowerCase().includes(busca.toLowerCase()) || prod.categoria.toLowerCase().includes(busca.toLowerCase());
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

export async function carregarCatalogo() {
    // Retorna cache em memória se existir
    if (cacheMemoria) return cacheMemoria;
    if (cachePromessa) return cachePromessa;

    cachePromessa = new Promise(async (resolve) => {
        try {
            const cachedStr = localStorage.getItem(CONFIG.CACHE_KEY);
            if (cachedStr) {
                const cache = JSON.parse(cachedStr);
                if (cache.data && cache.data.length > 1) {
                    cacheMemoria = cache.data;
                    resolve(cacheMemoria);
                    return;
                }
            }
        } catch (e) {}

        try {
            const response = await fetch('/api/produtos');
            const produtos = await response.json();
            if (produtos && produtos.length > 0) {
                cacheMemoria = produtos;
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ data: produtos, timestamp: Date.now() }));
                resolve(produtos);
            } else {
                throw new Error('Lista vazia');
            }
        } catch (e) {
            console.warn('Falha ao buscar produtos:', e);
            resolve([]);
        } finally {
            cachePromessa = null;
        }
    });

    return cachePromessa;
}

export async function renderizarGrade(produtosFiltrados, container, pagina = 1, itensPorPagina = 10) {
    if (!container) return;
    const start = (pagina - 1) * itensPorPagina;
    const end = start + itensPorPagina;
    const paginaProdutos = produtosFiltrados.slice(start, end);

    if (pagina === 1) container.innerHTML = '';
    if (paginaProdutos.length === 0 && pagina === 1) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#999; font-size:16px;">Nenhum produto encontrado.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const prod of paginaProdutos) {
        const card = criarCardProduto(prod);
        fragment.appendChild(card);
    }
    container.appendChild(fragment);
}