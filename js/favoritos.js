// ============================================================
// LISTA DE DESEJOS - AURORA COMERCIAL
// ============================================================

let favoritos = [];

export function initFavoritos() {
    carregarFavoritos();

    // Delegar cliques em botões de favorito (funciona para elementos carregados dinamicamente)
    document.addEventListener('click', (e) => {
        const btnFav = e.target.closest('.btn-favorito');
        if (btnFav) {
            e.preventDefault();
            e.stopPropagation();
            const produtoId = btnFav.dataset.produtoId;
            alternarFavorito(produtoId, btnFav);
        }
    });

    // Atualizar badge de favoritos na inicialização
    atualizarBadgeFavoritos();
}

function carregarFavoritos() {
    try {
        favoritos = JSON.parse(localStorage.getItem('aurora_favoritos') || '[]');
    } catch (e) {
        favoritos = [];
    }
}

function salvarFavoritos() {
    localStorage.setItem('aurora_favoritos', JSON.stringify(favoritos));
}

export function alternarFavorito(produtoId, btn) {
    const index = favoritos.indexOf(produtoId);
    if (index > -1) {
        favoritos.splice(index, 1);
        if (btn) {
            btn.textContent = '🤍';
            btn.title = 'Adicionar aos favoritos';
        }
        mostrarToast('Produto removido dos favoritos.', 'info');
    } else {
        favoritos.push(produtoId);
        if (btn) {
            btn.textContent = '❤️';
            btn.title = 'Remover dos favoritos';
        }
        mostrarToast('Produto adicionado aos favoritos!', 'sucesso');
    }
    salvarFavoritos();
    atualizarBadgeFavoritos();
}

export function verificarFavorito(produtoId) {
    return favoritos.includes(produtoId);
}

function atualizarBadgeFavoritos() {
    const badge = document.getElementById('badgeFavoritos');
    const count = document.getElementById('badgeFavoritosCount');
    if (badge && count) {
        count.textContent = favoritos.length;
        badge.style.display = favoritos.length > 0 ? 'inline-flex' : 'none';
    }
}