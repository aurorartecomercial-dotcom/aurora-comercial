export function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const menuLista = document.getElementById('menuCategorias');
    if (!menuToggle || !menuLista || menuToggle.dataset.menuReady === '1') return;

    menuToggle.dataset.menuReady = '1';
    const menuContainer = menuToggle.closest('.menu-categorias');
    const dropdowns = Array.from(menuLista.children).filter((item) => item.classList.contains('dropdown'));
    const dropdownToggles = dropdowns.map((item) => item.querySelector('.dropdown-toggle')).filter(Boolean);

    const closeAll = () => {
        menuLista.classList.remove('menu-aberto');
        menuToggle.setAttribute('aria-expanded', 'false');
        dropdowns.forEach(d => d.classList.remove('menu-aberto'));
        dropdownToggles.forEach(t => t.setAttribute('aria-expanded', 'false'));
    };

    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', 'menuCategorias');

    // Menu principal: funciona por toque/clique no celular.
    menuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const aberto = menuLista.classList.toggle('menu-aberto');
        menuToggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        if (!aberto) dropdowns.forEach(d => d.classList.remove('menu-aberto'));
    });

    // Submenu Categorias.
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!menuLista.classList.contains('menu-aberto')) {
                menuLista.classList.add('menu-aberto');
                menuToggle.setAttribute('aria-expanded', 'true');
            }
            const parent = toggle.closest('.dropdown');
            dropdowns.forEach(d => {
                if (d !== parent) d.classList.remove('menu-aberto');
            });
            const aberto = parent.classList.toggle('menu-aberto');
            toggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        });
    });

    // Links normais/submenu fecham o menu depois da navegação começar.
    menuLista.querySelectorAll('a').forEach(link => {
        if (link.classList.contains('dropdown-toggle')) return;
        link.addEventListener('click', () => closeAll());
    });

    // Clique fora fecha tudo, sem interferir no clique do botão.
    document.addEventListener('click', (e) => {
        if (!menuContainer || !menuContainer.contains(e.target)) closeAll();
    });

    // ESC fecha no desktop e mobile.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAll();
    });
}

// Segurança: se uma página carregar este módulo diretamente, inicializa sozinho.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu, { once: true });
} else {
    initMobileMenu();
}
