// ============================================================
// RECOMENDAÇÕES DE PRODUTOS - AURORA COMERCIAL
// ============================================================

export function initRecomendacoes() {
    // Adicionar secção de recomendações na página inicial e detalhe
    const containerRecomendacoes = document.getElementById('recomendacoesProdutos');
    if (!containerRecomendacoes) return;

    const historico = JSON.parse(localStorage.getItem('aurora_historico_vistos') || '[]');
    if (historico.length === 0) return;

    // Obter catálogo (vem do cache)
    import('./catalogo.js').then(({ carregarCatalogo, criarCardProduto }) => {
        carregarCatalogo().then(catalogo => {
            const recomendados = obterRecomendacoes(catalogo, historico);
            if (recomendados.length === 0) return;

            containerRecomendacoes.innerHTML = `
                <section class="secao-recomendacoes" style="max-width:1480px; margin:30px auto; padding:0 24px;">
                    <h2 style="color:#333; font-size:1.8rem; margin-bottom:20px; border-bottom:2px solid #eee; padding-bottom:10px;">💡 Recomendado para si</h2>
                    <div class="grade-produtos" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px;"></div>
                </section>
            `;

            const grid = containerRecomendacoes.querySelector('.grade-produtos');
            recomendados.forEach(prod => {
                const card = criarCardProduto(prod);
                grid.appendChild(card);
            });
        });
    });
}

function obterRecomendacoes(catalogo, historico) {
    // Produtos que o utilizador já viu
    const vistos = historico.map(item => item.id);

    // Produtos da mesma categoria dos vistos
    const categoriasVistas = historico.map(item => item.categoria);
    const recomendados = catalogo.filter(prod => 
        !vistos.includes(prod.id) && categoriasVistas.includes(prod.categoria)
    );

    // Se não houver, recomendamos produtos mais baratos ou com alta ordem
    if (recomendados.length === 0) {
        return catalogo.filter(prod => !vistos.includes(prod.id)).slice(0, 4);
    }

    return recomendados.slice(0, 8);
}

export function registrarVista(produto) {
    const historico = JSON.parse(localStorage.getItem('aurora_historico_vistos') || '[]');
    // Remover o produto se já existir e adicionar no início
    const filtrado = historico.filter(item => item.id !== produto.id);
    filtrado.unshift({ id: produto.id, categoria: produto.categoria });
    // Manter apenas os últimos 10 vistos
    localStorage.setItem('aurora_historico_vistos', JSON.stringify(filtrado.slice(0, 10)));
}