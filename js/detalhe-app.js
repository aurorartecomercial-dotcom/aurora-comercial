// ============================================================
// DETALHE - Página de detalhes do produto
// ============================================================

import { initCarrinho, adicionarProdutoCarrinho } from './carrinho.js';
import { carregarProdutosPagina } from './catalogo.js'; // 👈 CORREÇÃO: importação correta
import { initMobileMenu } from './menu.js';
import { adicionarAvaliacao, obterAvaliacao } from './avaliacoes.js';
import { atualizarMetaTags, mostrarToast } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    initCarrinho();
    initMobileMenu();

    const params = new URLSearchParams(window.location.search);
    const idProduto = parseInt(params.get('id'));
    if (!idProduto || isNaN(idProduto)) {
        mostrarErro('Nenhum ID de produto foi informado.');
        return;
    }

    // Carrega o catálogo usando a função correta (fallback JSON local + Supabase em background)
    const catalogo = await carregarProdutosPagina('todos', '', 1, 100);
    if (!catalogo || catalogo.length === 0) {
        mostrarErro('Erro ao carregar catálogo.');
        return;
    }

    const prod = catalogo.find(p => p.id === idProduto);
    if (!prod) {
        mostrarErro('Produto não encontrado.');
        return;
    }

    renderizarDetalhes(prod);
    atualizarMetaTags(prod.nome, prod.descricao || 'Detalhes do produto', prod.imagens[0] || '');
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

function renderizarDetalhes(prod) {
    const container = document.getElementById('detalhesConteudo');

    const catLink = document.getElementById('breadcrumbCat');
    const prodName = document.getElementById('breadcrumbProd');
    if (catLink) {
        catLink.textContent = prod.categoria.charAt(0).toUpperCase() + prod.categoria.slice(1);
        catLink.href = `index.html#?cat=${prod.categoria}`;
    }
    if (prodName) prodName.textContent = prod.nome;

    let miniaturasHtml = prod.imagens.map((src, i) =>
        `<img src="${src}" alt="Miniatura ${i+1}" data-index="${i}" class="${i === 0 ? 'ativa' : ''}" onerror="this.src='placeholder.jpg'">`
    ).join('');

    const avaliacao = obterAvaliacao(prod.id);

    let videoHtml = '';
    if (prod.video) {
        videoHtml = `
            <div class="video-container">
                <iframe src="${prod.video}" frameborder="0" allowfullscreen></iframe>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="detalhes-grid">
            <div class="detalhes-imagem-principal">
                <img id="detalhesImg" src="${prod.imagens[0]}" alt="${prod.nome}" onerror="this.src='placeholder.jpg'" />
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

                <div class="avaliacao">
                    <span>⭐ ${avaliacao.media.toFixed(1)} (${avaliacao.total} avaliações)</span>
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
                </div>
                <button class="btn-comprar-grande" id="btnComprarDetalhe">🛒 Adicionar à Sacola</button>
            </div>
        </div>
    `;

    const miniaturas = document.querySelectorAll('#miniaturas img');
    const imgPrincipal = document.getElementById('detalhesImg');
    miniaturas.forEach(img => {
        img.addEventListener('click', function() {
            miniaturas.forEach(m => m.classList.remove('ativa'));
            this.classList.add('ativa');
            imgPrincipal.src = this.src;
        });
    });

    document.getElementById('btnComprarDetalhe').addEventListener('click', function() {
        adicionarProdutoCarrinho(prod.id, prod.nome, prod.preco, prod.estoque);
    });

    document.getElementById('btnAvaliar').addEventListener('click', () => {
        const nota = parseInt(document.getElementById('notaAvaliacao').value);
        adicionarAvaliacao(prod.id, nota);
        mostrarToast('Avaliação registada!', 'sucesso');
        const novaAval = obterAvaliacao(prod.id);
        document.querySelector('.avaliacao span').textContent = `⭐ ${novaAval.media.toFixed(1)} (${novaAval.total} avaliações)`;
    });
}