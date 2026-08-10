import { CONFIG } from './config.js';
import { extrairValorNumerico, debounce } from './utils.js';

export async function carregarCatalogo() {
    const cachedStr = localStorage.getItem(CONFIG.CACHE_KEY);
    let cache = {};
    if (cachedStr) {
        try {
            cache = JSON.parse(cachedStr);
        } catch (e) {}
    }

    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}/latest`, {
            headers: { 'X-Master-Key': CONFIG.MASTER_KEY }
        });
        if (!res.ok) throw new Error('Erro ao buscar JSONbin');

        const data = await res.json();
        let serverData = data.record;

        // Verifica se o servidor enviou um objeto com 'data' e 'version'
        let novosProdutos = Array.isArray(serverData) ? serverData : serverData.data;
        let versaoServer = serverData.version || 0;

        if (!novosProdutos) throw new Error('Formato inválido dos produtos');

        // Se a versão do servidor é maior que a do cache OU se o cache expirou
        if (versaoServer > (cache.version || 0) || (Date.now() - (cache.timestamp || 0)) > CONFIG.CACHE_TTL) {
            // Guarda o novo cache com a nova versão
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                data: novosProdutos,
                version: versaoServer,
                timestamp: Date.now()
            }));
            return novosProdutos;
        }

        // Se o cache ainda é válido, retorna os dados do cache (rápido)
        return cache.data;
    } catch (e) {
        console.warn('Falha ao buscar do JSONbin, usando cache ou fallback:', e);
        if (cache.data) return cache.data;
        // Fallback local (caso o JSONbin esteja fora do ar)
        const fallback = await fetch('produtos.json');
        return fallback.json();
    }
}

export function criarCardProduto(prod) {
    const card = document.createElement('a');
    card.className = 'produto-card';
    card.href = `detalhe.html?id=${prod.id}`;
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';

    const imgSrc = prod.imagens && prod.imagens[0] ? prod.imagens[0] : 'placeholder.jpg';

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

    if (prod.parcelas) {
        html += `<p class="parcelas">${prod.parcelas}</p>`;
    }
    if (prod.freteGratis) {
        html += `<span class="selo-frete"><strong>Frete grátis</strong> FULL</span>`;
    }

    // ===== ESTOQUE =====
    let estoqueHtml = '';
    if (prod.estoque !== undefined) {
        if (prod.estoque <= 0) {
            estoqueHtml = `<span style="display:block; color:#E74C3C; font-weight:700; margin-top:6px;">🚫 Esgotado</span>`;
        } else if (prod.estoque <= 5) {
            estoqueHtml = `<span style="display:block; color:#E74C3C; font-weight:600; font-size:13px; margin-top:6px;">🔥 Últimas ${prod.estoque} unidades!</span>`;
        } else {
            estoqueHtml = `<span style="display:block; color:#27ae60; font-size:13px; margin-top:6px;">✅ ${prod.estoque} em estoque</span>`;
        }
    }
    html += estoqueHtml;

    // ===== AVALIAÇÃO =====
    const avaliacao = obterAvaliacao(prod.id);
    if (avaliacao.media > 0) {
        html += `<div style="margin-top:6px; font-size:13px;">⭐ ${avaliacao.media.toFixed(1)} (${avaliacao.total})</div>`;
    }

    html += `</div>`;
    card.innerHTML = html;
    return card;
}

function obterAvaliacao(prodId) {
    const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
    const prodAval = avaliacoes[prodId] || [];
    if (prodAval.length === 0) return { media: 0, total: 0 };
    const soma = prodAval.reduce((acc, a) => acc + a.nota, 0);
    return { media: soma / prodAval.length, total: prodAval.length };
}

export function adicionarAvaliacao(prodId, nota) {
    const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
    if (!avaliacoes[prodId]) avaliacoes[prodId] = [];
    avaliacoes[prodId].push({ nota, data: new Date().toISOString() });
    localStorage.setItem('aurora_avaliacoes', JSON.stringify(avaliacoes));
}

export function filtrarEOrdenar(produtos, categoria, busca, min, max, ordenacao) {
    let filtrados = produtos.filter(prod => {
        const matchCategoria = categoria === 'todos' || prod.categoria === categoria;
        const matchBusca = !busca ||
            prod.nome.toLowerCase().includes(busca.toLowerCase()) ||
            prod.tag.toLowerCase().includes(busca.toLowerCase()) ||
            prod.categoria.toLowerCase().includes(busca.toLowerCase());
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

    const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
    const controles = document.getElementById('paginaControles');
    if (controles) {
        if (totalPaginas <= 1) {
            controles.style.display = 'none';
        } else {
            controles.style.display = 'flex';
            const btnCarregarMais = document.getElementById('carregarMais');
            if (btnCarregarMais) {
                btnCarregarMais.textContent = pagina < totalPaginas ? 'Carregar mais' : 'Todos carregados';
                btnCarregarMais.disabled = pagina >= totalPaginas;
            }
        }
    }
}