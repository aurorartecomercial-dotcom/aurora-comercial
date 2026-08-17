// Linha de importação removida, pois não era usada.

async function carregarBlog() {
    try {
        const res = await fetch('blog.json');
        const posts = await res.json();
        renderizarPosts(posts);
    } catch (e) {
        document.getElementById('blogGrid').innerHTML = '<p style="text-align:center; color:#999;">Erro ao carregar artigos.</p>';
    }
}

function renderizarPosts(posts) {
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = '';
    posts.forEach(post => {
        const card = document.createElement('a');
        card.className = 'produto-card';
        card.href = `post.html?id=${post.id}`;
        card.innerHTML = `
            <div class="produto-imagem">
                <img src="${post.imagem}" alt="${post.titulo}" onerror="this.src='placeholder.jpg'" />
            </div>
            <div class="produto-info">
                <span style="color:var(--cor-esmeralda); font-size:11px; font-weight:600;">${post.data}</span>
                <h3 style="font-size:16px; margin-top:6px;">${post.titulo}</h3>
                <p style="font-size:13px; color:#666; margin:6px 0;">${post.resumo}</p>
                <span style="color:var(--cor-ouro); font-weight:600; font-size:12px;">Ler mais →</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', carregarBlog);