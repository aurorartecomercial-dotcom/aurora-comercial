import { initCarrinho, adicionarProdutoCarrinho } from './carrinho.js';
import { carregarCatalogo, filtrarEOrdenar, renderizarGrade, criarCardProduto } from './catalogo.js';
import { initMobileMenu } from './menu.js';
import { debounce, mostrarToast, extrairValorNumerico } from './utils.js';
import { initClienteUI } from './cliente-ui.js';

let catalogo = [];
let paginaAtual = 1;
const ITENS_POR_PAGINA = 10;
let categoriaAtiva = 'todos';
let termoBusca = '';
let precoMin = 0;
let precoMax = Infinity;
let ordenacao = 'ordem';

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa componentes em paralelo (mais rápido)
    Promise.all([
        initCarrinho(),
        initMobileMenu(),
        initClienteUI()
    ]).catch(e => console.warn('Erro ao inicializar componentes:', e));

    const carregando = document.getElementById('carregandoProdutos');
    if (carregando) {
        carregando.style.display = 'block';
        carregando.textContent = '⏳ Carregando produtos...';
    }

    // Carrega catálogo e recomendações em paralelo
    const [catalogoData] = await Promise.all([
        carregarCatalogo().catch(() => []),
        carregarRecomendacoes().catch(() => [])
    ]);

    catalogo = catalogoData;

    renderizarTudo();
    if (carregando) carregando.style.display = 'none';

    // Atualiza catálogo em segundo plano (sem bloquear)
    setTimeout(async () => {
        const freshCatalogo = await carregarCatalogo().catch(() => []);
        if (freshCatalogo.length > 0) {
            catalogo = freshCatalogo;
            renderizarTudo();
        }
    }, 5000);

    // Configuração dos filtros (com debounce para evitar excesso de chamadas)
    const buscaInput = document.getElementById('campoBusca');
    if (buscaInput) {
        buscaInput.addEventListener('input', debounce(() => {
            termoBusca = buscaInput.value.trim();
            paginaAtual = 1;
            aplicarFiltros();
        }, 300));
    }

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

    const ordenarSelect = document.getElementById('ordenar');
    if (ordenarSelect) {
        ordenarSelect.addEventListener('change', (e) => {
            ordenacao = e.target.value;
            paginaAtual = 1;
            aplicarFiltros();
        });
    }

    const carregarMaisBtn = document.getElementById('carregarMais');
    if (carregarMaisBtn) {
        carregarMaisBtn.addEventListener('click', () => {
            paginaAtual++;
            aplicarFiltros(false);
        });
    }

    await aplicarFiltros();
});

document.addEventListener('click', function(e) {
    const btnAdd = e.target.closest('.btn-add-carrinho-card');
    if (btnAdd) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnAdd.dataset.id;
        const nome = btnAdd.dataset.nome;
        const preco = btnAdd.dataset.preco;
        const estoque = parseInt(btnAdd.dataset.estoque) || 0;
        const precoNum = btnAdd.dataset.precoNum ? parseFloat(btnAdd.dataset.precoNum) : extrairValorNumerico(preco);
        if (precoNum > 0) {
            adicionarProdutoCarrinho(id, nome, preco, estoque);
        } else {
            console.warn('Preço inválido.');
            mostrarToast('Erro ao adicionar produto.', 'info');
        }
        return;
    }

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

function renderizarTudo() {
    renderizarMaisComprados();
    aplicarFiltros();
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

async function carregarRecomendacoes() {
    const token = localStorage.getItem('cliente_token');
    if (!token) return;
    try {
        const res = await fetch('/api/recomendacoes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const produtos = await res.json();
        const container = document.getElementById('recomendacoesGrid');
        if (container && produtos.length > 0) {
            container.innerHTML = '';
            produtos.forEach(p => container.appendChild(criarCardProduto(p)));
            document.getElementById('secaoRecomendacoes').style.display = 'block';
        }
    } catch (e) {
        console.warn('Erro ao carregar recomendações:', e);
    }
}

window.shareProduct = function(nome, preco, link) {
    const texto = `Olha só este produto incrível da Aurora Comercial!\n\n🔹 *${nome}*\n💰 Preço: ${preco}\n🔗 Confira aqui: ${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
};

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