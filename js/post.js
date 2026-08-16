async function carregarPost() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    if (!id) return;

    try {
        const res = await fetch('blog.json');
        const posts = await res.json();
        const post = posts.find(p => p.id === id);
        if (!post) throw new Error('Post não encontrado');

        document.getElementById('postTituloBreadcrumb').textContent = post.titulo;
        document.getElementById('postConteudo').innerHTML = `
            <div style="background:#fff; padding:24px; border-radius:16px; box-shadow:var(--sombra-card);">
                <h1 style="color:var(--cor-esmeralda);">${post.titulo}</h1>
                <p style="color:#888; font-size:14px; margin-bottom:10px;">${post.data}</p>
                <img src="${post.imagem}" alt="${post.titulo}" style="width:100%; max-height:400px; object-fit:cover; border-radius:12px; margin-bottom:16px;" />
                <div style="line-height:1.8; font-size:16px; color:#444;">${post.conteudo}</div>
                <a href="blog.html" style="display:inline-block; margin-top:20px; color:var(--cor-esmeralda); font-weight:600;">← Voltar ao Blog</a>
            </div>
        `;
    } catch (e) {
        document.getElementById('postConteudo').innerHTML = '<p style="text-align:center; color:#999;">Artigo não encontrado.</p>';
    }
}

document.addEventListener('DOMContentLoaded', carregarPost);