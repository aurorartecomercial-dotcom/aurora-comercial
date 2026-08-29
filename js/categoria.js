import { carregarCatalogo, criarCardProduto } from './catalogo.js';
import { initMobileMenu } from './menu.js';
import { extrairValorNumerico } from './utils.js';

let catalogo = [];
let categoriaAtual = '';
let subcategoriaAtual = '';
let precoMin = 0;
let precoMax = 500000;
let ordenacao = 'ordem';

// Mapeamento de categorias principais para subcategorias
const subcategoriasMap = {
    'eletronicos': ['smartphones', 'tablets', 'notebooks', 'acessorios-eletronicos'],
    'games': ['consolas', 'jogos', 'controles', 'headsets', 'cadeiras-gamer'],
    'moda': ['feminino', 'masculino', 'calcados', 'joias', 'oculos', 'relogios', 'bolsas', 'cintos-bones'],
    'beleza': ['maquiagem', 'cuidados-pele', 'perfumes', 'manicure-pedicure'],
    'casa': ['cozinha', 'decoracao', 'iluminacao', 'jardinagem', 'organizadores'],
    'esporte': ['futebol', 'fitness', 'ciclismo', 'camping'],
    'infantil': ['bebes', 'criancas', 'bonecas', 'carrinhos', 'quebra-cabecas'],
    'livros': ['livros-tecnicos', 'bestsellers', 'material-escolar', 'escritorio'],
    'ferramentas': ['eletrica', 'hidraulica', 'tintas', 'construcao'],
    'alimentos': ['gourmet', 'cafes-chas', 'snacks'],
    'saude': ['vitaminas', 'proteinas', 'termogenicos', 'equipamentos-medicao'],
    'viagem': ['malas-mochilas', 'necessaires', 'travesseiros-viagem'],
    'musica': ['violoes', 'teclados', 'baterias', 'acessorios-musica'],
    'pets': ['racao', 'brinquedos-pets', 'banho-tosa', 'roupas-pets'],
    'escritorio': ['cadeiras-escritorio', 'mesas', 'impressoras', 'material-escritorio']
};

document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();

    const params = new URLSearchParams(window.location.search);
    categoriaAtual = params.get('cat') || '';

    if (!categoriaAtual) {
        document.getElementById('nenhumProduto').style.display = 'block';
        document.getElementById('nenhumProduto').textContent = 'Nenhuma categoria foi selecionada.';
        document.getElementById('carregandoCategoria').style.display = 'none';
        return;
    }

    // Nome da categoria
    const nomes = {
        'eletronicos': 'Eletrônicos', 'games': 'Games & Consolas', 'moda': 'Moda & Acessórios',
        'beleza': 'Beleza', 'casa': 'Casa & Decoração', 'esporte': 'Esporte & Lazer',
        'infantil': 'Infantil & Brinquedos', 'livros': 'Livros & Papelaria',
        'ferramentas': 'Ferramentas & Construção', 'alimentos': 'Alimentos & Bebidas',
        'saude': 'Saúde & Suplementos', 'viagem': 'Viagem & Malas', 'musica': 'Música & Instrumentos',
        'pets': 'Pet Shop', 'escritorio': 'Escritório & Informática'
    };
    document.getElementById('breadcrumbCat').textContent = nomes[categoriaAtual] || categoriaAtual;
    document.getElementById('tituloCategoria').textContent = `📦 ${nomes[categoriaAtual] || categoriaAtual}`;
    document.getElementById('paginaTitulo').textContent = `${nomes[categoriaAtual] || categoriaAtual} - Aurora Comercial`;

    // Carregar catálogo
    catalogo = await carregarCatalogo();

    // Mostrar subcategorias na sidebar
    renderizarSubcategorias();

    // Configurar filtros
    const precoMinInput = document.getElementById('precoMinCat');
    const precoMaxInput = document.getElementById('precoMaxCat');
    const precoMinLabel = document.getElementById('precoMinLabelCat');
    const precoMaxLabel = document.getElementById('precoMaxLabelCat');
    const ordenarSelect = document.getElementById('ordenarCat');

    precoMinInput.addEventListener('input', () => {
        precoMin = parseInt(precoMinInput.value) || 0;
        precoMinLabel.textContent = precoMin;
        renderizarProdutos();
    });

    precoMaxInput.addEventListener('input', () => {
        precoMax = parseInt(precoMaxInput.value) || 500000;
        precoMaxLabel.textContent = precoMax;
        renderizarProdutos();
    });

    ordenarSelect.addEventListener('change', (e) => {
        ordenacao = e.target.value;
        renderizarProdutos();
    });

    renderizarProdutos();
});

function renderizarSubcategorias() {
    const container = document.getElementById('subcategoriasLista');
    if (!container) return;

    const subcats = subcategoriasMap[categoriaAtual] || [];
    let html = '<a href="#" data-subcat="" style="display:block; padding:8px 12px; border-radius:8px; margin-bottom:4px; text-decoration:none; color:var(--cor-esmeralda); font-weight:600; background:var(--cor-esmeralda-claro);">Todos</a>';
    
    const nomesSub = {
        'smartphones': 'Smartphones', 'tablets': 'Tablets', 'notebooks': 'Notebooks',
        'acessorios-eletronicos': 'Acessórios', 'consolas': 'Consolas', 'jogos': 'Jogos',
        'controles': 'Controles', 'headsets': 'Headsets', 'cadeiras-gamer': 'Cadeiras Gamer',
        'feminino': 'Feminino', 'masculino': 'Masculino', 'calcados': 'Calçados',
        'joias': 'Joias', 'oculos': 'Óculos', 'relogios': 'Relógios', 'bolsas': 'Bolsas',
        'cintos-bones': 'Cintos & Bonés', 'maquiagem': 'Maquiagem', 'cuidados-pele': 'Cuidados Pele',
        'perfumes': 'Perfumes', 'manicure-pedicure': 'Manicure', 'cozinha': 'Cozinha',
        'decoracao': 'Decoração', 'iluminacao': 'Iluminação', 'jardinagem': 'Jardinagem',
        'organizadores': 'Organizadores', 'futebol': 'Futebol', 'fitness': 'Fitness',
        'ciclismo': 'Ciclismo', 'camping': 'Camping', 'bebes': 'Bebês', 'criancas': 'Crianças',
        'bonecas': 'Bonecas', 'carrinhos': 'Carrinhos', 'quebra-cabecas': 'Quebra-cabeças',
        'livros-tecnicos': 'Técnicos', 'bestsellers': 'Bestsellers', 'material-escolar': 'Escolar',
        'escritorio': 'Escritório', 'eletrica': 'Elétrica', 'hidraulica': 'Hidráulica',
        'tintas': 'Tintas', 'construcao': 'Construção', 'gourmet': 'Gourmet',
        'cafes-chas': 'Cafés & Chás', 'snacks': 'Snacks', 'vitaminas': 'Vitaminas',
        'proteinas': 'Proteínas', 'termogenicos': 'Termogênicos', 'equipamentos-medicao': 'Medição',
        'malas-mochilas': 'Malas & Mochilas', 'necessaires': 'Necessaires',
        'travesseiros-viagem': 'Travesseiros', 'violoes': 'Violões', 'teclados': 'Teclados',
        'baterias': 'Baterias', 'acessorios-musica': 'Acessórios', 'racao': 'Ração',
        'brinquedos-pets': 'Brinquedos', 'banho-tosa': 'Banho & Tosa', 'roupas-pets': 'Roupas',
        'cadeiras-escritorio': 'Cadeiras', 'mesas': 'Mesas', 'impressoras': 'Impressoras',
        'material-escritorio': 'Material'
    };

    subcats.forEach(sub => {
        html += `<a href="#" data-subcat="${sub}" style="display:block; padding:8px 12px; border-radius:8px; margin-bottom:4px; text-decoration:none; color:#666; font-size:14px;">${nomesSub[sub] || sub}</a>`;
    });

    container.innerHTML = html;

    // Adicionar event listeners
    container.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            subcategoriaAtual = link.dataset.subcat || '';
            container.querySelectorAll('a').forEach(a => a.style.background = 'transparent');
            container.querySelectorAll('a').forEach(a => a.style.color = '#666');
            if (subcategoriaAtual) {
                link.style.background = 'var(--cor-esmeralda-claro)';
                link.style.color = 'var(--cor-esmeralda)';
            } else {
                container.querySelector('a[data-subcat=""]').style.background = 'var(--cor-esmeralda-claro)';
                container.querySelector('a[data-subcat=""]').style.color = 'var(--cor-esmeralda)';
            }
            renderizarProdutos();
        });
    });
}

function renderizarProdutos() {
    const container = document.getElementById('gradeCategoria');
    const carregando = document.getElementById('carregandoCategoria');
    const nenhum = document.getElementById('nenhumProduto');

    carregando.style.display = 'block';
    container.innerHTML = '';
    nenhum.style.display = 'none';

    let produtos = catalogo.filter(prod => {
        // Filtrar pela categoria principal
        if (categoriaAtual) {
            const subcats = subcategoriasMap[categoriaAtual] || [];
            const isPrincipal = prod.categoria === categoriaAtual || subcats.includes(prod.categoria);
            if (!isPrincipal) return false;
        }
        // Filtrar pela subcategoria selecionada
        if (subcategoriaAtual && prod.categoria !== subcategoriaAtual) return false;
        // Filtrar por preço
        const preco = extrairValorNumerico(prod.preco);
        if (preco < precoMin || preco > precoMax) return false;
        return true;
    });

    // Ordenar
    switch (ordenacao) {
        case 'preco-asc': produtos.sort((a, b) => extrairValorNumerico(a.preco) - extrairValorNumerico(b.preco)); break;
        case 'preco-desc': produtos.sort((a, b) => extrairValorNumerico(b.preco) - extrairValorNumerico(a.preco)); break;
        case 'nome': produtos.sort((a, b) => a.nome.localeCompare(b.nome)); break;
        default: produtos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    }

    carregando.style.display = 'none';

    if (produtos.length === 0) {
        nenhum.style.display = 'block';
        return;
    }

    const fragment = document.createDocumentFragment();
    produtos.forEach(prod => {
        const card = criarCardProduto(prod);
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
}