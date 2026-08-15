import { initCarrinho } from './carrinho.js';
import { carregarProdutosPagina, renderizarGrade } from './catalogo.js';
import { initMobileMenu } from './menu.js';
import { debounce, mostrarToast } from './utils.js';

let catalogo = [];
let paginaAtual = 1;
const ITENS_POR_PAGINA = 10;
let categoriaAtiva = 'todos';
let termoBusca = '';
let precoMin = 0;
let precoMax = Infinity;
let ordenacao = 'ordem';

document.addEventListener('DOMContentLoaded', async () => {
    initCarrinho();
    initMobileMenu();

    // 1. CARREGA DO CACHE IMEDIATAMENTE (0ms)
    const cacheData = localStorage.getItem('aurora_cache_pagina1');
    if (cacheData) {
        try {
            const parsed = JSON.parse(cacheData);
            catalogo = parsed.data || [];
            if (catalogo.length > 0) {
                document.getElementById('carregandoProdutos').style.display = 'none';
                renderizarGrade(catalogo, document.getElementById('gradeProdutos'), 1, ITENS_POR_PAGINA);
                renderizarMaisComprados();
            }
        } catch (e) {}
    }

    // 2. BUSCA DADOS REAIS DO SERVIDOR (em background) e atualiza
    try {
        const dadosNovos = await carregarProdutosPagina('todos', '', 1, ITENS_POR_PAGINA);
        if (dadosNovos && dadosNovos.length > 0) {
            catalogo = dadosNovos;
            document.getElementById('carregandoProdutos').style.display = 'none';
            const container = document.getElementById('gradeProdutos');
            container.innerHTML = '';
            renderizarGrade(catalogo, container, 1, ITENS_POR_PAGINA);
            renderizarMaisComprados();
        }
    } catch (e) { console.error('Erro bg:', e); }

    // 3. Lógica de Busca e Filtros
    const buscaInput = document.getElementById('campoBusca');
    buscaInput.addEventListener('input', debounce(() => {
        termoBusca = buscaInput.value.trim();
        paginaAtual = 1;
        aplicarFiltros();
    }, 300));

    document.querySelectorAll('.menu-categorias a[data-categoria]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.menu-categorias a[data-categoria]').forEach(l => l.classList.remove('ativo'));
            link.classList.add('ativo');
            categoriaAtiva = link.dataset.categoria;
            paginaAtual = 1;
            aplicarFiltros();
        });
    });

    // 4. Botão "Carregar mais"
    document.getElementById('carregarMais').addEventListener('click', async () => {
        paginaAtual++;
        const novos = await carregarProdutosPagina(categoriaAtiva, termoBusca, paginaAtual, ITENS_POR_PAGINA);
        if (novos && novos.length > 0) {
            catalogo = [...catalogo, ...novos];
            renderizarGrade(novos, document.getElementById('gradeProdutos'), 1, ITENS_POR_PAGINA, true);
            document.getElementById('carregarMais').textContent = 'Carregar mais';
            document.getElementById('carregarMais').disabled = false;
        } else {
            document.getElementById('carregarMais').textContent = 'Fim do catálogo';
            document.getElementById('carregarMais').disabled = true;
        }
    });

    renderizarBalancoSemanal();
});

async function aplicarFiltros() {
    paginaAtual = 1;
    document.getElementById('gradeProdutos').innerHTML = '<p style="text-align:center; padding:20px; color:#999;">Carregando...</p>';
    const dados = await carregarProdutosPagina(categoriaAtiva, termoBusca, 1, ITENS_POR_PAGINA);
    catalogo = dados || [];
    document.getElementById('gradeProdutos').innerHTML = '';
    renderizarGrade(catalogo, document.getElementById('gradeProdutos'), 1, ITENS_POR_PAGINA);
    document.getElementById('carregarMais').disabled = false;
    document.getElementById('carregarMais').textContent = 'Carregar mais';
}

function renderizarMaisComprados() {
    // Mantenha o seu código original de renderizarMaisComprados aqui
    // ...
}

function renderizarBalancoSemanal() {
    // Mantenha o seu código original de balanço aqui
    // ...
}

window.filtrarPorCategoria = function(categoria) {
    const link = document.querySelector(`.menu-categorias a[data-categoria="${categoria}"]`);
    if (link) link.click();
    else { categoriaAtiva = categoria; aplicarFiltros(); }
};

window.mudarSlide = function(direcao) {
    // Mantenha o código do carrossel original aqui
    // ...
};