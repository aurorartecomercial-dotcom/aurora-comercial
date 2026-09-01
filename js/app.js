import { initCarrinho, adicionarProdutoCarrinho } from './carrinho.js';
import { carregarCatalogo, filtrarEOrdenar, renderizarGrade, criarCardProduto } from './catalogo.js';
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
    // ✅ Inicializa o carrinho (verifica se elementos existem)
    if (!window.__carrinhoInicializado) {
        initCarrinho();
        window.__carrinhoInicializado = true;
    }
    initMobileMenu();

    const carregando = document.getElementById('carregandoProdutos');
    if (carregando) {
        carregando.style.display = 'block';
        carregando.textContent = '⏳ Carregando produtos...';
    }

    // ✅ 1. Tenta carregar do cache local primeiro (instantâneo)
    let catalogoCarregado = false;
    const cachedStr = localStorage.getItem('aurora_catalogo_cache');
    if (cachedStr) {
        try {
            const cache = JSON.parse(cachedStr);
            if (cache.data && cache.data.length > 0) {
                catalogo = cache.data;
                catalogoCarregado = true;
            }
        } catch (e) { console.warn('Cache inválido:', e); }
    }

    // ✅ 2. Se não tem cache, busca do Firebase
    if (!catalogoCarregado) {
        try {
            catalogo = await carregarCatalogo();
        } catch (e) {
            console.error('Erro ao carregar catálogo:', e);
            catalogo = [];
        }
    }

    // ✅ 3. Renderiza os produtos
    renderizarTudo();
    if (carregando) carregando.style.display = 'none';

    // Se veio do cache, atualiza em segundo plano com os dados do Firebase
    if (catalogoCarregado) {
        atualizarCatalogoDoFirebase();
    }

    // ✅ 4. Configuração dos filtros (sempre executada!)
    const buscaInput = document.getElementById('campoBusca');
    if (buscaInput) {
        buscaInput.addEventListener('input', debounce(() => {
            termoBusca = buscaInput.value.trim();
            paginaAtual = 1;
            aplicarFiltros();
        }, 300));
    }

    // ✅ 5. Preço mínimo e máximo
    const precoMinInput = document.getElementById('precoMin');
    const precoMaxInput = document.getElementById('precoMax');
    const precoMinLabel = document.getElementById('precoMinLabel');
    const precoMaxLabel = document.getElementById('precoMaxLabel');

    if (precoMinInput) {
        precoMinInput.addEventListener('input', () => {
            precoMin = parseInt(precoMinInput.value) || 0;
            if (precoMinLabel) precoMinLabel.textContent = precoMin;
            paginaAtual = 1;
            aplicarFiltros();
        });
    }
    if (precoMaxInput) {
        precoMaxInput.addEventListener('input', () => {
            precoMax = parseInt(precoMaxInput.value) || Infinity;
            if (precoMaxLabel) precoMaxLabel.textContent = precoMax;
            paginaAtual = 1;
            aplicarFiltros();
        });
    }

    // ✅ 6. Ordenação
    const ordenarSelect = document.getElementById('ordenar');
    if (ordenarSelect) {
        ordenarSelect.addEventListener('change', (e) => {
            ordenacao = e.target.value;
            paginaAtual = 1;
            aplicarFiltros();
        });
    }

    // ✅ 7. Botão "Carregar mais"
    const carregarMaisBtn = document.getElementById('carregarMais');
    if (carregarMaisBtn) {
        carregarMaisBtn.addEventListener('click', () => {
            paginaAtual++;
            aplicarFiltros(false);
        });
    }

    await aplicarFiltros();
});

// ✅ DELEGAÇÃO GLOBAL DE EVENTOS (funciona para qualquer card, mesmo carregado depois)
document.addEventListener('click', function(e) {
    // Botão Adicionar ao Carrinho
    const btnAdd = e.target.closest('.btn-add-carrinho-card');
    if (btnAdd) {
        e.preventDefault();
        e.stopPropagation();
        // ✅ ALTERAÇÃO: extrai o ID do produto
        const id = btnAdd.dataset.id;
        const nome = btnAdd.dataset.nome;
        const preco = btnAdd.dataset.preco;
        const estoque = parseInt(btnAdd.dataset.estoque) || 0;
        const precoNum = btnAdd.dataset.precoNum ? parseFloat(btnAdd.dataset.precoNum) : extrairValorNumerico(preco);
        if (precoNum > 0) {
            // ✅ ALTERAÇÃO: passa o ID para a função
            adicionarProdutoCarrinho(id, nome, preco, estoque);
        } else {
            console.warn('Preço inválido, não foi possível adicionar.');
            mostrarToast('Erro ao adicionar produto.', 'info');
        }
        return;
    }

    // Botão Partilhar
    const btnShare = e.target.closest('.btn-share');
    if (btnShare) {
        e.preventDefault();
        e.stopPropagation();
        const nome = btnShare.dataset.nome;
        const preco = btnShare.dataset.preco;
        const link = btnShare.dataset.link;
        shareProduct(nome, preco, link);
        return;
    }
});

// ✅ Funções auxiliares
function renderizarTudo() {
    renderizarMaisComprados();
    aplicarFiltros();
}

async function atualizarCatalogoDoFirebase() {
    try {
        catalogo = await carregarCatalogo();
        // Após atualizar o catálogo, re-renderiza a lista para refletir os dados mais recentes
        renderizarTudo();
    } catch (e) {
        console.warn('Erro ao atualizar do Firebase:', e);
    }
}

async function aplicarFiltros(resetPagina = true) {
    if (resetPagina) paginaAtual = 1;
    const filtrados = filtrarEOrdenar(catalogo, categoriaAtiva, termoBusca, precoMin, precoMax, ordenacao);
    const container = document.getElementById('gradeProdutos');
    if (!container) return;
    if (paginaAtual === 1) container.innerHTML = '';
    await renderizarGrade(filtrados, container, paginaAtual, ITENS_POR_PAGINA);
    const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA);
    const btn = document.getElementById('carregarMais');
    if (btn) {
        btn.textContent = paginaAtual < totalPaginas ? 'Carregar mais' : 'Todos carregados';
        btn.disabled = paginaAtual >= totalPaginas;
    }
}

async function renderizarMaisComprados() {
    const grid = document.getElementById('maisCompradosGrid');
    if (!grid) return;
    const ordens = [1, 2, 3, 4, 5, 6, 7, 8];
    const produtos = catalogo
        .filter(p => ordens.includes(p.ordem))
        .sort((a, b) => a.ordem - b.ordem);
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (const prod of produtos) {
        const card = criarCardProduto(prod);
        fragment.appendChild(card);
    }
    grid.appendChild(fragment);
}

// ✅ Função de redirecionamento por categoria (para links do rodapé)
window.filtrarPorCategoria = function(categoria) {
    window.location.href = `categoria.html?cat=${categoria}`;
};

window.mudarSlide = function(direcao) {
    const slides = document.querySelectorAll('.slide');
    const indicadores = document.querySelectorAll('.indicador');
    let indexAtual = Array.from(slides).findIndex(s => s.classList.contains('ativo'));
    if (indexAtual === -1) return;
    slides[indexAtual].classList.remove('ativo');
    indicadores[indexAtual].classList.remove('ativo');
    indexAtual = (indexAtual + direcao + slides.length) % slides.length;
    slides[indexAtual].classList.add('ativo');
    indicadores[indexAtual].classList.add('ativo');
};

document.querySelectorAll('.indicador').forEach((ind, i) => {
    ind.addEventListener('click', () => {
        const slides = document.querySelectorAll('.slide');
        const indicadores = document.querySelectorAll('.indicador');
        const indexAtual = Array.from(slides).findIndex(s => s.classList.contains('ativo'));
        if (indexAtual === -1) return;
        slides[indexAtual].classList.remove('ativo');
        indicadores[indexAtual].classList.remove('ativo');
        slides[i].classList.add('ativo');
        indicadores[i].classList.add('ativo');
    });
});

window.shareProduct = function(nome, preco, link) {
    const texto = `Olha só este produto incrível da Aurora Comercial!\n\n🔹 *${nome}*\n💰 Preço: ${preco}\n🔗 Confira aqui: ${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
};