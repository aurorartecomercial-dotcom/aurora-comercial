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

    // 1. CARREGA DO CACHE IMEDIATAMENTE (0ms) - se existir
    let cacheRenderizado = false;
    const cacheData = localStorage.getItem('aurora_cache_pagina1');
    if (cacheData) {
        try {
            const parsed = JSON.parse(cacheData);
            catalogo = parsed.data || [];
            if (catalogo.length > 0) {
                document.getElementById('carregandoProdutos').style.display = 'none';
                renderizarGrade(catalogo, document.getElementById('gradeProdutos'), 1, ITENS_POR_PAGINA);
                renderizarMaisComprados();
                cacheRenderizado = true;
            }
        } catch (e) { console.warn('Erro ao ler cache'); }
    }

    // 2. TENTA BUSCAR DADOS NOVOS. Se falhar, NÃO APAGA o cache renderizado.
    try {
        const dadosNovos = await carregarProdutosPagina('todos', '', 1, ITENS_POR_PAGINA);
        
        // Só atualiza e renderiza novamente se houver dados novos
        if (dadosNovos && dadosNovos.length > 0) {
            catalogo = dadosNovos;
            document.getElementById('carregandoProdutos').style.display = 'none';
            const container = document.getElementById('gradeProdutos');
            container.innerHTML = ''; // Limpa para renderizar os novos
            renderizarGrade(catalogo, container, 1, ITENS_POR_PAGINA);
            renderizarMaisComprados();
        } else {
            // Se a rede falhar e dadosNovos for vazio, mantemos o catalogo do passo 1!
            console.warn('Supabase não respondeu. A manter produtos do cache.');
        }
    } catch (e) {
        console.error('Erro de rede, mantendo cache:', e);
    }

    // 3. Lógica de Busca e Filtros (Mantida)
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

    // 4. Botão "Carregar mais" (Mantido)
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

// ... O resto das funções (aplicarFiltros, renderizarMaisComprados, etc) mantêm-se iguais