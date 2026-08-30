export function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const menuLista = document.getElementById('menuCategorias');
    const dropdowns = document.querySelectorAll('.dropdown');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    // Abrir/fechar menu principal (hambúrguer)
    if (menuToggle && menuLista) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuLista.classList.toggle('menu-aberto');
            const isOpen = menuLista.classList.contains('menu-aberto');
            menuToggle.setAttribute('aria-expanded', isOpen);
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-categorias')) {
                menuLista.classList.remove('menu-aberto');
                dropdowns.forEach(d => d.classList.remove('menu-aberto'));
            }
        });
    }

    // Abrir/fechar dropdowns (Roupas, Mais Categorias) por clique
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const parentDropdown = toggle.closest('.dropdown');
            // Fecha os outros dropdowns
            dropdowns.forEach(d => {
                if (d !== parentDropdown) d.classList.remove('menu-aberto');
            });
            // Alterna o atual
            parentDropdown.classList.toggle('menu-aberto');
            toggle.setAttribute('aria-expanded', parentDropdown.classList.contains('menu-aberto'));
        });
    });

    // Fechar dropdown ao clicar em um link do submenu
    dropdowns.forEach(dropdown => {
        const submenuLinks = dropdown.querySelectorAll('.submenu a');
        submenuLinks.forEach(link => {
            link.addEventListener('click', () => {
                dropdown.classList.remove('menu-aberto');
                menuLista.classList.remove('menu-aberto');
            });
        });
    });
}