import { initCarrinho } from './carrinho.js';
import { carregarProdutosPagina, buscarAtualizacaoSupabase, renderizarGrade } from './catalogo.js';
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

    // 1. Carrega os produtos INSTANTANEAMENTE a partir do 'produtos.json'
    const dadosIniciais = await carregarProdutosPagina('todos', '', 1, ITENS_POR_PAGINA);
    if (dadosIniciais && dadosIniciais.length > 0) {
        catalogo = dadosIniciais;
        document.getElementById('carregandoProdutos').style.display = 'none';
        renderizarGrade(catalogo, document.getElementById('gradeProdutos'), 1, ITENS_POR_PAGINA);
        renderizarMaisComprados();
    }

    // 2. Tenta buscar dados atualizados do Supabase (em background)
    try {
        const dadosNovos = await buscarAtualizacaoSupabase('todos', '', 1, ITENS_POR_PAGINA);
        if (dadosNovos && dadosNovos.length > 0) {
            catalogo = dadosNovos;
            const container = document.getElementById('gradeProdutos');
            container.innerHTML = '';
            renderizarGrade(catalogo, container, 1, ITENS_POR_PAGINA);
            renderizarMaisComprados();
        }
    } catch (e) { console.warn('Atualização Supabase falhou, a manter cache.'); }

    // 3. Lógica de Busca
    const buscaInput = document.getElementById('campoBusca');
    buscaInput.addEventListener('input', debounce(() => {
        termoBusca = buscaInput.value.trim();
        paginaAtual = 1;
        aplicarFiltros();
    }, 300));

    // 4. Lógica de Filtros e Categorias
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

    // 5. Botão "Carregar mais"
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
    else { categoriaAtiva = categoria; aplicarFiltros(); }
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