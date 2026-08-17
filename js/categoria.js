import { initCarrinho } from './carrinho.js';
import { carregarProdutosPagina, renderizarGrade } from './catalogo.js';
import { initMobileMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    initCarrinho();
    initMobileMenu();

    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('cat');

    if (!categoria) {
        document.getElementById('nenhumProduto').style.display = 'block';
        document.getElementById('carregandoCategoria').style.display = 'none';
        return;
    }

    const nomeCategoria = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    document.getElementById('breadcrumbCat').textContent = nomeCategoria;
    document.getElementById('tituloCategoria').textContent = `📦 ${nomeCategoria}`;
    document.getElementById('paginaTitulo').textContent = `${nomeCategoria} - Aurora Comercial`;

    document.getElementById('carregandoCategoria').style.display = 'none';
    
    // Busca apenas os produtos desta categoria no servidor (RPC)
    const dados = await carregarProdutosPagina(categoria, '', 1, 100); // 100 por segurança
    const grid = document.getElementById('gradeCategoria');
    grid.innerHTML = '';

    if (!dados || dados.length === 0) {
        document.getElementById('nenhumProduto').style.display = 'block';
        return;
    }

    renderizarGrade(dados, grid, 1, 100);
});