import { initCarrinho } from './carrinho.js';
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
    // Evitar dupla inicialização do carrinho
    if (!window.__carrinhoInicializado) {
        initCarrinho();
        window.__carrinhoInicializado = true;
    }
    initMobileMenu();

    catalogo = await carregarCatalogo();
    if (!catalogo || catalogo.length === 0) {
        document.getElementById('carregandoProdutos').textContent = '❌ Erro ao carregar produtos.';
        return;
    }
    document.getElementById('carregandoProdutos').style.display = 'none';

    renderizarMaisComprados();

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
    aplicarFiltros();
});

function aplicarFiltros(resetPagina = true) {
    if (resetPagina) paginaAtual = 1;
    const filtrados = filtrarEOrdenar(catalogo, categoriaAtiva, termoBusca, precoMin, precoMax, ordenacao);
    const container = document.getElementById('gradeProdutos');
    if (paginaAtual === 1) container.innerHTML = '';
    renderizarGrade(filtrados, container, paginaAtual, ITENS_POR_PAGINA);
    const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA);
    const btn = document.getElementById('carregarMais');
    if (btn) {
        btn.textContent = paginaAtual < totalPaginas ? 'Carregar mais' : 'Todos carregados';
        btn.disabled = paginaAtual >= totalPaginas;
    }
}

function renderizarMaisComprados() {
    const grid = document.getElementById('maisCompradosGrid');
    if (!grid) return;
    const ids = [1, 13, 17, 21, 23, 25, 7, 11];
    const produtos = catalogo.filter(p => ids.includes(p.id));
    produtos.sort((a, b) => (a.ordem || a.id) - (b.ordem || b.id));
    grid.innerHTML = '';
    produtos.forEach(prod => {
        const card = criarCardProduto(prod);
        grid.appendChild(card);
    });
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