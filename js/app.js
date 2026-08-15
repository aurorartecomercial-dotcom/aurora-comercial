import { initCarrinho } from './carrinho.js';
import { carregarProdutosPagina, buscarAtualizacaoSupabase, renderizarGrade } from './catalogo.js';
import { initMobileMenu } from './menu.js';
import { debounce, mostrarToast } from './utils.js';

let catalogo = [];
let paginaAtual = 1;
const ITENS_POR_PAGINA = 10;
let categoriaAtiva = 'todos';
let termoBusca = '';

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
    // Se falhar, o site continua a usar os dados do passo 1
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

    // 3. O resto do código (busca, filtros, carregar mais) mantém-se igual
    // ... 
});