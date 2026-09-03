// ============================================================
// LISTA DE DESEJOS - AURORA COMERCIAL (VERSÃO MELHORADA)
// ============================================================

let favoritos = [];

export function initFavoritos() {
    carregarFavoritos();

    // Delegar cliques em botões de favorito
    document.addEventListener('click', (e) => {
        const btnFav = e.target.closest('.btn-favorito');
        if (btnFav) {
            e.preventDefault();
            e.stopPropagation();
            const produtoId = btnFav.dataset.produtoId;
            alternarFavorito(produtoId, btnFav);
        }
    });

    // Atualizar badge na inicialização
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

// ✅ FUNÇÃO MELHORADA QUE CRIA O BADGE SE NÃO EXISTIR
function atualizarBadgeFavoritos() {
    let badge = document.getElementById('badgeFavoritos');
    let count = document.getElementById('badgeFavoritosCount');

    // Se o badge não existir, criar dinamicamente e inserir no header
    if (!badge) {
        const headerIcones = document.querySelector('.header-icones');
        if (headerIcones) {
            badge = document.createElement('button');
            badge.id = 'badgeFavoritos';
            badge.style.cssText = 'background:#D4AF37; color:#000; border:none; padding:6px 12px; border-radius:20px; font-weight:700; font-size:13px; cursor:pointer; display:none;';
            badge.innerHTML = '❤️ <span id="badgeFavoritosCount">0</span>';
            // Inserir antes do botão do carrinho
            const carrinhoBtn = document.getElementById('abrirCarrinhoFlutuante');
            if (carrinhoBtn && carrinhoBtn.parentNode) {
                carrinhoBtn.parentNode.insertBefore(badge, carrinhoBtn);
            } else {
                headerIcones.appendChild(badge);
            }
        }
    }

    // Atualizar contagem
    if (badge) {
        const countSpan = badge.querySelector('#badgeFavoritosCount') || count;
        if (countSpan) {
            countSpan.textContent = favoritos.length;
        }
        badge.style.display = favoritos.length > 0 ? 'inline-flex' : 'none';
    }
}