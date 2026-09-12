import { htmlEditorialSeguro, IMAGEM_FALLBACK, urlSegura } from './utils.js';

async function carregarPost() {
  const container = document.getElementById('postConteudo');
  const id = Number.parseInt(new URLSearchParams(window.location.search).get('id'), 10);
  if (!Number.isInteger(id)) return mostrarErro(container);
  try {
    const response = await fetch('blog.json', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Blog indisponível');
    const posts = await response.json();
    const post = posts.find((item) => Number(item.id) === id);
    if (!post) throw new Error('Artigo não encontrado');
    document.getElementById('postTituloBreadcrumb').textContent = String(post.titulo || 'Artigo');
    renderizarPost(container, post);
  } catch (_) {
    mostrarErro(container);
  }
}

function resolverImagemBlog(valor) {
  if (!valor || typeof valor !== 'string') return IMAGEM_FALLBACK;
  try {
    const url = new URL(valor.trim(), document.baseURI);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch (_) {}
  return IMAGEM_FALLBACK;
}

function renderizarPost(container, post) {
  container.replaceChildren();
  const artigo = document.createElement('article');
  artigo.style.cssText = 'background:#fff;padding:24px;border-radius:16px;box-shadow:var(--sombra-card);';
  const titulo = document.createElement('h1');
  titulo.textContent = String(post.titulo || 'Artigo');
  titulo.style.color = 'var(--cor-esmeralda)';
  const data = document.createElement('p');
  data.textContent = String(post.data || '');
  data.style.cssText = 'color:#888;font-size:14px;margin-bottom:10px;';
  const imagem = document.createElement('img');
  imagem.src = resolverImagemBlog(post.imagem);
  imagem.alt = String(post.titulo || 'Artigo');
  imagem.style.cssText = 'width:100%;max-height:400px;object-fit:cover;border-radius:12px;margin-bottom:16px;';
  imagem.addEventListener('error', () => { imagem.src = IMAGEM_FALLBACK; }, { once: true });
  const conteudo = document.createElement('div');
  conteudo.style.cssText = 'line-height:1.8;font-size:16px;color:#444;';
  conteudo.innerHTML = htmlEditorialSeguro(post.conteudo);
  const voltar = document.createElement('a');
  voltar.href = 'blog.html';
  voltar.textContent = '← Voltar ao Blog';
  voltar.style.cssText = 'display:inline-block;margin-top:20px;color:var(--cor-esmeralda);font-weight:600;';
  artigo.append(titulo, data, imagem, conteudo, voltar);
  container.append(artigo);
}

function mostrarErro(container) {
  container.textContent = 'Artigo não encontrado.';
}

document.addEventListener('DOMContentLoaded', carregarPost);
