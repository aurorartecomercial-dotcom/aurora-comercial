/* ============================================================
   CABEÇALHO INTELIGENTE — AURORA COMERCIAL
   Desce = esconde | Sobe = mostra
   ============================================================ */
(() => {
    const header = document.querySelector('.header-principal');
    if (!header) return;

    let ultimaPosicao = window.scrollY || 0;
    let ticking = false;
    const LIMIAR = 70;

    const atualizarHeader = () => {
        const atual = window.scrollY || 0;
        const menuAberto = document.querySelector('#menuCategorias.menu-aberto, #menuCategorias .menu-aberto');

        // No topo, o cabeçalho fica sempre visível.
        if (atual <= 12) {
            header.classList.remove('header-escondido');
            ultimaPosicao = atual;
            ticking = false;
            return;
        }

        // Nunca escondemos o cabeçalho enquanto o menu mobile estiver aberto.
        if (menuAberto) {
            header.classList.remove('header-escondido');
            ultimaPosicao = atual;
            ticking = false;
            return;
        }

        const movimento = atual - ultimaPosicao;

        if (movimento > 4 && atual > LIMIAR) {
            header.classList.add('header-escondido');
        } else if (movimento < -4) {
            header.classList.remove('header-escondido');
        }

        ultimaPosicao = atual;
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(atualizarHeader);
            ticking = true;
        }
    }, { passive: true });

    // Garante o estado correto depois de voltar à página pelo histórico.
    window.addEventListener('pageshow', atualizarHeader);
})();
