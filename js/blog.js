import { IMAGEM_FALLBACK, urlSegura } from './utils.js';

async function carregarBlog() {
  const grid = document.getElementById('blogGrid');
  try {
    const response = await fetch('blog.json', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Não foi possível carregar o blog.');
    const posts = await response.json();
    renderizarPosts(Array.isArray(posts) ? posts : []);
  } catch (_) {
    grid.innerHTML = '<div style="grid-column:1/-1;padding:25px;background:#fff;border:1px solid #e0e9e5;border-radius:16px;color:#6b7c76">Não foi possível carregar os artigos agora.</div>';
  }
}

function renderizarPosts(posts) {
  const grid = document.getElementById('blogGrid');
  grid.replaceChildren();
  posts.forEach((post, index) => {
    const card = document.createElement('a');
    card.className = 'media-card';
    card.href = `post.html?id=${encodeURIComponent(post.id)}`;

    const imagemDiv = document.createElement('div');
    imagemDiv.className = 'media-card-image';
    const imagem = document.createElement('img');
    imagem.src = urlSegura(post.imagem, IMAGEM_FALLBACK);
    imagem.alt = String(post.titulo || 'Artigo VORA 313');
    imagem.loading = index < 2 ? 'eager' : 'lazy';
    imagem.addEventListener('error', () => { imagem.src = IMAGEM_FALLBACK; }, { once: true });
    imagemDiv.append(imagem);

    const body = document.createElement('div');
    body.className = 'media-card-body';
    const meta = document.createElement('div');
    meta.className = 'media-meta';
    const data = document.createElement('span');
    data.textContent = String(post.data || '');
    const leitura = document.createElement('span');
    const palavras = String(post.conteudo || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    leitura.textContent = `${Math.max(2, Math.ceil(palavras / 180))} min de leitura`;
    meta.append(data, leitura);

    const titulo = document.createElement('h3');
    titulo.textContent = String(post.titulo || 'Artigo');
    const resumo = document.createElement('p');
    resumo.textContent = String(post.resumo || '');
    const mais = document.createElement('span');
    mais.className = 'media-read';
    mais.textContent = 'Ler mais →';
    body.append(meta, titulo, resumo, mais);
    card.append(imagemDiv, body);
    grid.append(card);
  });
}

document.addEventListener('DOMContentLoaded', carregarBlog);
