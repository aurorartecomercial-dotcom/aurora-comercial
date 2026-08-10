// ============================================================
// CATEGORIA - Página de filtro por categoria
// ============================================================

import { initCarrinho } from './carrinho.js';
import { carregarCatalogo, criarCardProduto } from './catalogo.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Inicia o carrinho (reutiliza a lógica global)
    initCarrinho();

    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('cat');

    if (!categoria) {
        document.getElementById('nenhumProduto').style.display = 'block';
        document.getElementById('nenhumProduto').textContent = 'Nenhuma categoria foi selecionada.';
        document.getElementById('carregandoCategoria').style.display = 'none';
        return;
    }

    // Atualiza o breadcrumb e título
    const nomeCategoria = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    document.getElementById('breadcrumbCat').textContent = nomeCategoria;
    document.getElementById('tituloCategoria').textContent = `📦 ${nomeCategoria}`;
    document.getElementById('paginaTitulo').textContent = `${nomeCategoria} - Aurora Comercial`;

    const catalogo = await carregarCatalogo();
    document.getElementById('carregandoCategoria').style.display = 'none';

    if (!catalogo || catalogo.length === 0) {
        document.getElementById('nenhumProduto').style.display = 'block';
        document.getElementById('nenhumProduto').textContent = 'Erro ao carregar o catálogo.';
        return;
    }

    // Filtra os produtos pela categoria
    const produtosFiltrados = catalogo.filter(prod => prod.categoria === categoria);

    const grid = document.getElementById('gradeCategoria');
    grid.innerHTML = '';

    if (produtosFiltrados.length === 0) {
        document.getElementById('nenhumProduto').style.display = 'block';
        document.getElementById('nenhumProduto').textContent = 'Nenhum produto encontrado nesta categoria.';
        return;
    }

    // Renderiza os produtos
    produtosFiltrados.forEach(prod => {
        const card = criarCardProduto(prod);
        grid.appendChild(card);
    });

    // ===== MENU MOBILE (Ícone de 4 pontinhos) =====
    const menuToggle = document.getElementById('menuToggle');
    const menuLista = document.getElementById('menuCategorias');
    if (menuToggle && menuLista) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuLista.classList.toggle('menu-aberto');
            const isOpen = menuLista.classList.contains('menu-aberto');
            menuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-categorias')) {
                menuLista.classList.remove('menu-aberto');
            }
        });
    }
});