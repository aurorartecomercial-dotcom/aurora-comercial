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
    if (!window.__carrinhoInicializado) {
        initCarrinho();
        window.__carrinhoInicializado = true;
    }
    initMobileMenu();

    // ✅ CARREGAMENTO RÁPIDO: primeiro carrega do localStorage (instantâneo)
    const carregando = document.getElementById('carregandoProdutos');
    carregando.style.display = 'block';
    carregando.textContent = '⏳ Carregando produtos...';

    const cachedStr = localStorage.getItem('aurora_catalogo_cache');
    if (cachedStr) {
        try {
            const cache = JSON.parse(cachedStr);
            if (cache.data && cache.data.length > 0) {
                catalogo = cache.data;
                renderizarTudo();
                carregando.style.display = 'none';
                // Atualiza do Firebase em segundo plano
                atualizarCatalogoDoFirebase();
                return;
            }
        } catch (e) { console.warn('Cache inválido:', e); }
    }

    // Sem cache, busca do Firebase
    catalogo = await carregarCatalogo();
    renderizarTudo();
    carregando.style.display = 'none';

    // ✅ Configuração dos filtros
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

    document.querySelectorAll('.filtro-rapido').forEach(el => {
        el.addEventListener('click', () => {
            const cat = el.dataset.categoria;
            const link = document.querySelector(`.menu-categorias a[data-categoria="${cat}"]`);
            if (link) link.click();
        });
    });

    const precoMinInput = document.getElementById('precoMin');
    const precoMaxInput = document.getElementById('precoMax');
    const precoMinLabel = document.getElementById('precoMinLabel');
    const precoMaxLabel = document.getElementById('precoMaxLabel');

    precoMinInput.addEventListener('input', () => {
        precoMin = parseInt(precoMinInput.value);
        precoMinLabel.textContent = precoMin;
        paginaAtual = 1;
        aplicarFiltros();
    });
    precoMaxInput.addEventListener('input', () => {
        precoMax = parseInt(precoMaxInput.value);
        precoMaxLabel.textContent = precoMax;
        paginaAtual = 1;
        aplicarFiltros();
    });

    document.getElementById('ordenar').addEventListener('change', (e) => {
        ordenacao = e.target.value;
        paginaAtual = 1;
        aplicarFiltros();
    });

    document.getElementById('carregarMais').addEventListener('click', () => {
        paginaAtual++;
        aplicarFiltros(false);
    });

    document.getElementById('btnLimparHistorico').addEventListener('click', () => {
        if (confirm('Deseja zerar o balanço e limpar o histórico de vendas da semana?')) {
            localStorage.removeItem('aurora_historico_vendas');
            renderizarBalancoSemanal();
            mostrarToast('Histórico limpo!', 'sucesso');
        }
    });

    renderizarBalancoSemanal();
    await aplicarFiltros();

    // Delegação de eventos para grade
    document.getElementById('gradeProdutos').addEventListener('click', async (e) => {
        const btnAdd = e.target.closest('.btn-add-carrinho-card');
        if (btnAdd) {
            e.preventDefault();
            e.stopPropagation();
            adicionarProdutoCarrinho(btnAdd.dataset.nome, btnAdd.dataset.preco, parseInt(btnAdd.dataset.estoque));
            return;
        }

        const btnShare = e.target.closest('.btn-share');
        if (btnShare) {
            e.preventDefault();
            e.stopPropagation();
            shareProduct(btnShare.dataset.nome, btnShare.dataset.preco, btnShare.dataset.link);
            return;
        }
    });
});

// ✅ Renderiza tudo de uma vez (grade + mais comprados)
function renderizarTudo() {
    renderizarMaisComprados();
    aplicarFiltros();
}

// ✅ Atualiza catálogo do Firebase sem bloquear a UI
async function atualizarCatalogoDoFirebase() {
    try {
        catalogo = await carregarCatalogo(); // retorna do cache em memória
    } catch (e) {
        console.warn('Erro ao atualizar do Firebase:', e);
    }
}

async function aplicarFiltros(resetPagina = true) {
    if (resetPagina) paginaAtual = 1;
    const filtrados = filtrarEOrdenar(catalogo, categoriaAtiva, termoBusca, precoMin, precoMax, ordenacao);
    const container = document.getElementById('gradeProdutos');
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
    // ✅ Cria cards síncronamente (mais rápido)
    const fragment = document.createDocumentFragment();
    for (const prod of produtos) {
        const card = criarCardProduto(prod);
        fragment.appendChild(card);
    }
    grid.appendChild(fragment);
}

function renderizarBalancoSemanal() {
    const historico = JSON.parse(localStorage.getItem('aurora_historico_vendas')) || [];
    const corpoTabela = document.getElementById('corpoTabelaHistorico');
    const faturamentoTotalHTML = document.getElementById('faturamentoTotal');
    const qtdPedidosTotalHTML = document.getElementById('qtdPedidosTotal');
    const itensVendidosTotalHTML = document.getElementById('itensVendidosTotal');

    if (corpoTabela) {
        corpoTabela.innerHTML = '';
        let faturamentoAcumulado = 0;
        let totalItensVendidos = 0;

        if (historico.length === 0) {
            corpoTabela.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#999; padding:20px;">Nenhuma venda registada esta semana.</td></tr>`;
        } else {
            historico.forEach(venda => {
                faturamentoAcumulado += venda.valorTotal || 0;
                totalItensVendidos += venda.totalItens || 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${venda.dataHora || ''}</strong></td>
                    <td>${venda.produtosResumo || ''}</td>
                    <td style="color:#25D366; font-weight:bold;">${(venda.valorTotal || 0).toLocaleString('pt-AO')} Kz</td>
                `;
                corpoTabela.appendChild(tr);
            });
        }
        if (faturamentoTotalHTML) faturamentoTotalHTML.textContent = faturamentoAcumulado.toLocaleString('pt-AO');
        if (qtdPedidosTotalHTML) qtdPedidosTotalHTML.textContent = historico.length;
        if (itensVendidosTotalHTML) itensVendidosTotalHTML.textContent = totalItensVendidos;
    }
}

window.filtrarPorCategoria = function(categoria) {
    const link = document.querySelector(`.menu-categorias a[data-categoria="${categoria}"]`);
    if (link) link.click();
    else { categoriaAtiva = categoria; paginaAtual = 1; aplicarFiltros(); }
    document.getElementById('conteudo-principal').scrollIntoView({ behavior: 'smooth' });
};

window.mudarSlide = function(direcao) {
    const slides = document.querySelectorAll('.slide');
    const indicadores = document.querySelectorAll('.indicador');
    let indexAtual = Array.from(slides).findIndex(s => s.classList.contains('ativo'));
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