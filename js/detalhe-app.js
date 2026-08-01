// ============================================================
// DETALHE - Página de detalhes do produto
// ============================================================

import { initCarrinho, adicionarProdutoCarrinho } from './carrinho.js';
import { carregarCatalogo, adicionarAvaliacao } from './catalogo.js';
import { atualizarMetaTags, mostrarToast } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    initCarrinho();

    const params = new URLSearchParams(window.location.search);
    const idProduto = parseInt(params.get('id'));
    if (!idProduto || isNaN(idProduto)) {
        mostrarErro('Nenhum ID de produto foi informado.');
        return;
    }

    const catalogo = await carregarCatalogo();
    if (!catalogo) {
        mostrarErro('Erro ao carregar catálogo.');
        return;
    }

    const prod = catalogo.find(p => p.id === idProduto);
    if (!prod) {
        mostrarErro('Produto não encontrado.');
        return;
    }

    renderizarDetalhes(prod);
    // Atualiza meta tags
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

    // PREENCHER BREADCRUMB
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

    // Avaliação
    const avaliacao = obterAvaliacao(prod.id);

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

    // Miniaturas
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
        adicionarProdutoCarrinho(prod.nome, prod.preco);
    });

    // Avaliação
    document.getElementById('btnAvaliar').addEventListener('click', () => {
        const nota = parseInt(document.getElementById('notaAvaliacao').value);
        adicionarAvaliacao(prod.id, nota);
        mostrarToast('Avaliação registada!', 'sucesso');
        // Atualiza a exibição
        const novaAval = obterAvaliacao(prod.id);
        document.querySelector('.avaliacao span').textContent = `⭐ ${novaAval.media.toFixed(1)} (${novaAval.total} avaliações)`;
    });
}

function obterAvaliacao(prodId) {
    const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
    const prodAval = avaliacoes[prodId] || [];
    if (prodAval.length === 0) return { media: 0, total: 0 };
    const soma = prodAval.reduce((acc, a) => acc + a.nota, 0);
    return { media: soma / prodAval.length, total: prodAval.length };
}