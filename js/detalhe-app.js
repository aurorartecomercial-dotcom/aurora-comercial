import { adicionarProdutoCarrinho } from './carrinho.js';
import { carregarCatalogo } from './catalogo.js';
import { initMobileMenu } from './menu.js';
import { adicionarAvaliacao, obterAvaliacao } from './avaliacoes.js';
import { atualizarMetaTags, mostrarToast, IMAGEM_FALLBACK } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();

    const params = new URLSearchParams(window.location.search);
    const idProduto = params.get('id');
    
    if (!idProduto) {
        mostrarErro('Nenhum ID de produto foi informado.');
        return;
    }

    // ✅ 1. Tenta carregar do cache local primeiro (instantâneo)
    let catalogo = [];
    const cachedStr = localStorage.getItem('aurora_catalogo_cache');
    if (cachedStr) {
        try {
            const cache = JSON.parse(cachedStr);
            if (cache.data && cache.data.length > 0) catalogo = cache.data;
        } catch (e) {}
    }

    // ✅ 2. Se não tem cache, busca do Firebase, mas agora com tempo limite
    if (catalogo.length === 0) {
        catalogo = await carregarCatalogo();
    }

    if (!catalogo || catalogo.length === 0) {
        mostrarErro('Erro ao carregar catálogo.');
        return;
    }

    const prod = catalogo.find(p => String(p.id) === String(idProduto));

    if (!prod) {
        mostrarErro('Produto não encontrado.');
        return;
    }

    // ✅ 3. Renderiza o produto IMEDIATAMENTE (sem esperar avaliação)
    renderizarDetalhes(prod);
    atualizarMetaTags(prod.nome, prod.descricao || 'Detalhes do produto', prod.imagens[0] || '');

    // ✅ 4. Carrega a avaliação em segundo plano e atualiza o DOM
    carregarAvaliacaoAsync(prod.id);
});

function mostrarErro(mensagem) {
    document.getElementById('detalhesConteudo').innerHTML = `
        <div class="erro-msg">
            <h2>⚠️ Ops!</h2>
            <p>${mensagem}</p>
            <p style="margin-top:20px;"><a href="index.html" style="color:#007185; font-weight:600;">Voltar para a loja</a></p>
        </div>
    `;
}

// ✅ Função de renderização SEM `await` (síncrona)
function renderizarDetalhes(prod) {
    const container = document.getElementById('detalhesConteudo');

    const catLink = document.getElementById('breadcrumbCat');
    const prodName = document.getElementById('breadcrumbProd');
    if (catLink) {
        catLink.textContent = prod.categoria.charAt(0).toUpperCase() + prod.categoria.slice(1);
        catLink.href = `index.html#?cat=${prod.categoria}`;
    }
    if (prodName) prodName.textContent = prod.nome;

    // ✅ VERIFICAÇÃO PARA EVITAR UNDEFINED
    const imagemPrincipal = (prod.imagens && prod.imagens.length > 0) ? prod.imagens[0] : IMAGEM_FALLBACK;
    const miniaturasImagens = (prod.imagens && prod.imagens.length > 0) ? prod.imagens : [IMAGEM_FALLBACK];

    let miniaturasHtml = miniaturasImagens.map((src, i) =>
        `<img src="${src}" alt="Miniatura ${i+1}" data-index="${i}" 
              class="${i === 0 ? 'ativa' : ''}" 
              loading="lazy"
              onerror="this.onerror=null; this.src='${IMAGEM_FALLBACK}';">`
    ).join('');

    let videoHtml = '';
    if (prod.video) {
        videoHtml = `
            <div class="video-container">
                <iframe src="${prod.video}" frameborder="0" allowfullscreen loading="lazy"></iframe>
            </div>
        `;
    }

    // ✅ Define um placeholder para a avaliação
    container.innerHTML = `
        <div class="detalhes-grid">
            <div class="detalhes-imagem-principal">
                <img id="detalhesImg" src="${imagemPrincipal}" alt="${prod.nome}" 
                     onerror="this.onerror=null; this.src='${IMAGEM_FALLBACK}';" />
                <div class="detalhes-miniaturas" id="miniaturas">${miniaturasHtml}</div>
            </div>
            <div class="detalhes-info">
                <span class="categoria-tag">${prod.tag || prod.categoria}</span>
                <h2>${prod.nome}</h2>
                <div class="detalhes-precos">
                    ${prod.precoAntigo ? `<span class="preco-antigo">${prod.precoAntigo}</span>` : ''}
                    <span class="preco-destaque">${prod.preco}</span>
                    ${prod.desconto ? `<span class="desconto-badge">${prod.desconto} OFF</span>` : ''}
                </div>
                ${prod.parcelas ? `<div class="parcelas">${prod.parcelas}</div>` : ''}
                ${prod.freteGratis ? `<div class="frete-gratis">🚚 Frete grátis</div>` : ''}
                <div class="descricao">${prod.descricao || 'Descrição não disponível.'}</div>
                
                ${videoHtml}

                <div class="avaliacao" id="avaliacaoContainer">
                    <span>⭐ Carregando avaliações...</span>
                </div>
                <button class="btn-comprar-grande" id="btnComprarDetalhe">🛒 Adicionar à Sacola</button>
            </div>
        </div>
    `;

    // ✅ Configura miniaturas
    const miniaturas = document.querySelectorAll('#miniaturas img');
    const imgPrincipal = document.getElementById('detalhesImg');
    miniaturas.forEach(img => {
        img.addEventListener('click', function() {
            miniaturas.forEach(m => m.classList.remove('ativa'));
            this.classList.add('ativa');
            imgPrincipal.src = this.src;
        });
    });

    // ✅ Botão de comprar
    document.getElementById('btnComprarDetalhe').addEventListener('click', function() {
        adicionarProdutoCarrinho(prod.nome, prod.preco, prod.estoque);
    });
}

// ✅ Carrega avaliação sem bloquear a renderização
async function carregarAvaliacaoAsync(prodId) {
    try {
        const avaliacao = await obterAvaliacao(prodId);
        const containerAvaliacao = document.getElementById('avaliacaoContainer');
        if (containerAvaliacao) {
            let html = `<span>⭐ ${avaliacao.media.toFixed(1)} (${avaliacao.total} avaliações)</span>`;
            html += `
                <div>
                    <label for="notaAvaliacao">Sua nota: </label>
                    <select id="notaAvaliacao">
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5" selected>5</option>
                    </select>
                    <button id="btnAvaliar" class="btn-avaliar" style="background:var(--cor-botao); border:none; padding:4px 12px; border-radius:8px; cursor:pointer; color:#000; font-weight:600;">Avaliar</button>
                </div>
            `;
            containerAvaliacao.innerHTML = html;

            document.getElementById('btnAvaliar').addEventListener('click', async () => {
                const nota = parseInt(document.getElementById('notaAvaliacao').value);
                await adicionarAvaliacao(prodId, nota);
                mostrarToast('Avaliação registada!', 'sucesso');
                const novaAval = await obterAvaliacao(prodId);
                containerAvaliacao.innerHTML = `<span>⭐ ${novaAval.media.toFixed(1)} (${novaAval.total} avaliações)</span>`;
            });
        }
    } catch (e) {
        console.warn('Erro ao carregar avaliação:', e);
        const containerAvaliacao = document.getElementById('avaliacaoContainer');
        if (containerAvaliacao) {
            containerAvaliacao.innerHTML = '<span>⭐ Sem avaliações</span>';
        }
    }
}