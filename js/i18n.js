// ============================================================
// MULTILÍNGUA - AURORA COMERCIAL (PT/EN)
// ============================================================

let idiomaAtual = localStorage.getItem('aurora_idioma') || 'pt';

const traducoes = {
    pt: {
        'search': 'Buscar produtos...',
        'cart': 'Carrinho',
        'login': 'Entrar',
        'categories': 'Categorias',
        'home': 'Início',
        'contact': 'Contactos',
        'blog': 'Blog',
        'track': 'Rastrear Pedido',
        'more_sold': 'Mais Comprados',
        'recommended': 'Recomendado para si',
        'add_to_cart': 'Adicionar',
        'share': 'Partilhar',
        'price': 'Preço',
        'loading': 'Carregando...',
        'no_products': 'Nenhum produto encontrado',
        'footer_description': 'Marketplace angolano com curadoria premium.',
    },
    en: {
        'search': 'Search products...',
        'cart': 'Cart',
        'login': 'Login',
        'categories': 'Categories',
        'home': 'Home',
        'contact': 'Contact',
        'blog': 'Blog',
        'track': 'Track Order',
        'more_sold': 'Best Sellers',
        'recommended': 'Recommended for you',
        'add_to_cart': 'Add',
        'share': 'Share',
        'price': 'Price',
        'loading': 'Loading...',
        'no_products': 'No products found',
        'footer_description': 'Angolan marketplace with premium curation.',
    }
};

export function initI18n() {
    const btnIdioma = document.getElementById('btnIdioma');
    if (btnIdioma) {
        btnIdioma.addEventListener('click', () => {
            idiomaAtual = idiomaAtual === 'pt' ? 'en' : 'pt';
            localStorage.setItem('aurora_idioma', idiomaAtual);
            aplicarTraducoes();
        });
    }
    aplicarTraducoes();
}

function aplicarTraducoes() {
    const t = traducoes[idiomaAtual];
    
    // Atualizar textos estáticos
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const chave = el.dataset.i18n;
        if (t[chave]) el.textContent = t[chave];
    });

    // Atualizar placeholder de busca
    const busca = document.getElementById('campoBusca');
    if (busca) busca.placeholder = t.search;

    // Atualizar título do documento
    document.title = idiomaAtual === 'pt' ? 'Aurora Comercial' : 'Aurora Store';
}

export function t(chave) {
    return traducoes[idiomaAtual][chave] || chave;
}