export function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const menuLista = document.getElementById('menuCategorias');

    if (menuToggle && menuLista) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuLista.classList.toggle('menu-aberto');
            const isOpen = menuLista.classList.contains('menu-aberto');
            menuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
        });

        // Fecha o menu ao clicar em qualquer link dentro dele
        menuLista.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuLista.classList.remove('menu-aberto');
                menuToggle.setAttribute('aria-label', 'Abrir menu');
            });
        });

        // Fecha o menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-categorias')) {
                menuLista.classList.remove('menu-aberto');
            }
        });
    }
}