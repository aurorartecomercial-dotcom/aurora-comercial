import { initCarrinho, adicionarProdutoCarrinho } from './carrinho.js';
import { carregarCatalogo, filtrarEOrdenar, renderizarGrade, criarCardProduto } from './catalogo.js';
import { initMobileMenu } from './menu.js';
import { debounce, mostrarToast } from './utils.js';
import { initFidelidade } from './fidelidade.js';

let catalogo = [];
let paginaAtual = 1;
const ITENS_POR_PAGINA = 10;
let categoriaAtiva = 'todos';
let termoBusca = '';
let precoMin = 0;
let precoMax = Infinity;
let ordenacao = 'ordem';
let minAvaliacao = 0;
let dataFiltro = '';

document.addEventListener('DOMContentLoaded', async () => {
    // ✅ Inicializa o carrinho
    if (!window.__carrinhoInicializado) {
        initCarrinho();
        window.__carrinhoInicializado = true;
    }
    initMobileMenu();
    initFidelidade();
    initDarkMode();
    initBuscaAutocomplete();

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

    // Se veio do cache, atualiza em segundo plano
    if (catalogoCarregado) {
        atualizarCatalogoDoFirebase();
    }

    // ✅ 4. Configuração dos filtros
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

    // ✅ 7. Filtro de avaliação mínima
    const minAvaliacaoSelect = document.getElementById('minAvaliacao');
    if (minAvaliacaoSelect) {
        minAvaliacaoSelect.addEventListener('change', (e) => {
            minAvaliacao = parseFloat(e.target.value) || 0;
            paginaAtual = 1;
            aplicarFiltros();
        });
    }

    // ✅ 8. Filtro de data (novidades)
    const dataSelect = document.getElementById('ordenarData');
    if (dataSelect) {
        dataSelect.addEventListener('change', (e) => {
            dataFiltro = e.target.value;
            paginaAtual = 1;
            aplicarFiltros();
        });
    }

    // ✅ 9. Botão "Carregar mais"
    const carregarMaisBtn = document.getElementById('carregarMais');
    if (carregarMaisBtn) {
        carregarMaisBtn.addEventListener('click', () => {
            paginaAtual++;
            aplicarFiltros(false);
        });
    }

    await aplicarFiltros();
});

// ✅ DELEGAÇÃO GLOBAL DE EVENTOS
document.addEventListener('click', function(e) {
    const btnAdd = e.target.closest('.btn-add-carrinho-card');
    if (btnAdd) {
        e.preventDefault();
        e.stopPropagation();
        const nome = btnAdd.dataset.nome;
        const preco = btnAdd.dataset.preco;
        const estoque = parseInt(btnAdd.dataset.estoque) || 0;
        const precoNum = btnAdd.dataset.precoNum ? parseFloat(btnAdd.dataset.precoNum) : extrairValorNumerico(preco);
        if (precoNum > 0) {
            adicionarProdutoCarrinho(nome, preco, estoque);
        } else {
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

// ✅ FUNÇÕES AUXILIARES
function renderizarTudo() {
    renderizarMaisComprados();
    aplicarFiltros();
}

async function atualizarCatalogoDoFirebase() {
    try {
        catalogo = await carregarCatalogo();
        renderizarTudo();
    } catch (e) {
        console.warn('Erro ao atualizar do Firebase:', e);
    }
}

async function aplicarFiltros(resetPagina = true) {
    if (resetPagina) paginaAtual = 1;
    const filtrados = filtrarEOrdenar(catalogo, categoriaAtiva, termoBusca, precoMin, precoMax, ordenacao, minAvaliacao, dataFiltro);
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

// ✅ DARK MODE
export function initDarkMode() {
    const btnModoEscuro = document.getElementById('btnModoEscuro');
    if (!btnModoEscuro) return;
    const modoSalvo = localStorage.getItem('aurora_modo_escuro');
    if (modoSalvo === 'ativo') {
        document.body.classList.add('modo-escuro');
        btnModoEscuro.innerHTML = '☀️';
        btnModoEscuro.title = 'Modo Claro';
    }
    btnModoEscuro.addEventListener('click', () => {
        document.body.classList.toggle('modo-escuro');
        const escuro = document.body.classList.contains('modo-escuro');
        localStorage.setItem('aurora_modo_escuro', escuro ? 'ativo' : 'inativo');
        btnModoEscuro.innerHTML = escuro ? '☀️' : '🌙';
        btnModoEscuro.title = escuro ? 'Modo Claro' : 'Modo Escuro';
    });
}

// ✅ BUSCA COM AUTOCOMPLETE
export function initBuscaAutocomplete() {
    const campoBusca = document.getElementById('campoBusca');
    if (!campoBusca) return;

    const containerSugestoes = document.createElement('div');
    containerSugestoes.id = 'sugestoesBusca';
    campoBusca.parentElement.style.position = 'relative';
    campoBusca.parentElement.appendChild(containerSugestoes);

    campoBusca.addEventListener('focus', () => {
        if (campoBusca.value.trim().length >= 2) {
            mostrarSugestoes(campoBusca.value.trim(), containerSugestoes);
        }
    });

    campoBusca.addEventListener('input', debounce(() => {
        const termo = campoBusca.value.trim();
        if (termo.length >= 2) {
            mostrarSugestoes(termo, containerSugestoes);
        } else {
            containerSugestoes.style.display = 'none';
        }
    }, 300));

    campoBusca.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') containerSugestoes.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.busca-container')) {
            containerSugestoes.style.display = 'none';
        }
    });
}

async function mostrarSugestoes(termo, container) {
    try {
        const catalogo = await carregarCatalogo();
        const resultados = catalogo.filter(prod => 
            prod.nome.toLowerCase().includes(termo.toLowerCase()) ||
            prod.categoria.toLowerCase().includes(termo.toLowerCase()) ||
            (prod.tag || '').toLowerCase().includes(termo.toLowerCase())
        ).slice(0, 8);

        const categorias = [...new Set(catalogo
            .filter(prod => prod.categoria.toLowerCase().includes(termo.toLowerCase()))
            .map(prod => prod.categoria)
        )].slice(0, 3);

        if (resultados.length === 0 && categorias.length === 0) {
            container.innerHTML = '<div style="padding:12px; color:#999; text-align:center;">Nenhum resultado encontrado</div>';
            container.style.display = 'block';
            return;
        }

        let html = '';
        if (categorias.length > 0) {
            html += '<div style="padding:8px 12px; font-size:11px; text-transform:uppercase; color:#888; background:#f5f5f5; font-weight:700;">Categorias</div>';
            categorias.forEach(cat => {
                html += `
                    <a href="categoria.html?cat=${cat}" style="display:block; padding:10px 12px; text-decoration:none; color:var(--cor-esmeralda); border-bottom:1px solid #f0f0f0; font-weight:600; font-size:14px;">
                        📂 ${cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </a>
                `;
            });
        }

        if (resultados.length > 0) {
            html += '<div style="padding:8px 12px; font-size:11px; text-transform:uppercase; color:#888; background:#f5f5f5; font-weight:700;">Produtos</div>';
            resultados.forEach(prod => {
                const preco = prod.preco || '';
                const imgSrc = prod.imagens && prod.imagens[0] ? prod.imagens[0] : '';
                html += `
                    <a href="detalhe.html?id=${prod.id}" style="display:flex; align-items:center; gap:10px; padding:8px 12px; text-decoration:none; color:#333; border-bottom:1px solid #f0f0f0; transition:0.2s;">
                        <img src="${imgSrc}" alt="" style="width:40px; height:40px; object-fit:cover; border-radius:4px; background:#f0f0f0;" onerror="this.style.display='none';" />
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${prod.nome}</div>
                            <div style="font-size:12px; color:var(--cor-esmeralda); font-weight:700;">${preco}</div>
                        </div>
                    </a>
                `;
            });
        }

        container.innerHTML = html;
        container.style.display = 'block';
    } catch (e) {
        console.error('Erro na busca:', e);
        container.style.display = 'none';
    }
}

// ✅ FUNÇÕES GLOBAIS
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