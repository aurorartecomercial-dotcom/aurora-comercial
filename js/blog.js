import { IMAGEM_FALLBACK, urlSegura } from './utils.js';

async function carregarBlog() {
  const grid = document.getElementById('blogGrid');
  try {
    const response = await fetch('blog.json', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Não foi possível carregar o blog.');
    const posts = await response.json();
    renderizarPosts(Array.isArray(posts) ? posts : []);
  } catch (_) {
    grid.textContent = 'Erro ao carregar artigos.';
  }
}

function renderizarPosts(posts) {
  const grid = document.getElementById('blogGrid');
  grid.replaceChildren();
  posts.forEach((post) => {
    const card = document.createElement('a');
    card.className = 'produto-card';
    card.href = `post.html?id=${encodeURIComponent(post.id)}`;
    const imagemDiv = document.createElement('div');
    imagemDiv.className = 'produto-imagem';
    const imagem = document.createElement('img');
    imagem.src = urlSegura(post.imagem, IMAGEM_FALLBACK);
    imagem.alt = String(post.titulo || 'Artigo');
    imagem.addEventListener('error', () => { imagem.src = IMAGEM_FALLBACK; }, { once: true });
    imagemDiv.append(imagem);
    const info = document.createElement('div');
    info.className = 'produto-info';
    const data = document.createElement('span');
    data.textContent = String(post.data || '');
    data.style.cssText = 'color:var(--cor-esmeralda);font-size:11px;font-weight:600;';
    const titulo = document.createElement('h3');
    titulo.textContent = String(post.titulo || 'Artigo');
    titulo.style.cssText = 'font-size:16px;margin-top:6px;';
    const resumo = document.createElement('p');
    resumo.textContent = String(post.resumo || '');
    resumo.style.cssText = 'font-size:13px;color:#666;margin:6px 0;';
    const mais = document.createElement('span');
    mais.textContent = 'Ler mais →';
    mais.style.cssText = 'color:var(--cor-ouro);font-weight:600;font-size:12px;';
    info.append(data, titulo, resumo, mais);
    card.append(imagemDiv, info);
    grid.append(card);
  });
}

document.addEventListener('DOMContentLoaded', carregarBlog);
