export function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const menuLista = document.getElementById('menuCategorias');
    const dropdown = document.querySelector('.dropdown');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const submenu = document.querySelector('.submenu');

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
                if (dropdown) dropdown.classList.remove('menu-aberto');
            }
        });
    }

    // Dropdown acessível por clique/toque
    if (dropdownToggle && submenu && dropdown) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('menu-aberto');
            const isOpen = dropdown.classList.contains('menu-aberto');
            dropdownToggle.setAttribute('aria-expanded', isOpen);
        });
    }

    // Fechar dropdown ao clicar em link do submenu
    submenu?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            dropdown.classList.remove('menu-aberto');
            dropdownToggle.setAttribute('aria-expanded', 'false');
        });
    });
}