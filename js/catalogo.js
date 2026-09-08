import { db, CONFIG } from './config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { extrairValorNumerico, IMAGEM_FALLBACK, urlSegura } from './utils.js';
import { obterAvaliacao } from './avaliacoes.js';
import { verificarFavorito } from './favoritos.js';
import { obterLinkAfiliado } from './fase3.js';

let cacheMemoria = null;
let catalogoPromise = null;

function normalizarProduto(snapshotDoc) {
  const produto = snapshotDoc.data();
  return { ...produto, id: String(produto.id || snapshotDoc.id) };
}

export async function carregarCatalogo() {
  if (cacheMemoria) return cacheMemoria;
  if (catalogoPromise) return catalogoPromise;
  catalogoPromise = (async () => {
    try {
      const cache = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY) || 'null');
      if (Array.isArray(cache?.data) && cache.data.length) {
        cacheMemoria = cache.data;
        atualizarDoFirebase();
        return cacheMemoria;
      }
    } catch (_) {}
    try {
      const snapshot = await getDocs(collection(db, 'produtos'));
      cacheMemoria = snapshot.docs.map(normalizarProduto);
      salvarCache(cacheMemoria);
      return cacheMemoria;
    } catch (error) {
      console.warn('Falha ao buscar catálogo:', error);
      return [];
    }
  })();
  return catalogoPromise;
}

function salvarCache(produtos) {
  localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ data: produtos, timestamp: Date.now() }));
}

async function atualizarDoFirebase() {
  try {
    const snapshot = await getDocs(collection(db, 'produtos'));
    cacheMemoria = snapshot.docs.map(normalizarProduto);
    salvarCache(cacheMemoria);
  } catch (_) {}
}

function elemento(tag, texto, classe = '') {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texto !== undefined && texto !== null) node.textContent = String(texto);
  return node;
}

function imagemProduto(src, alt, classe = '') {
  const image = document.createElement('img');
  image.src = urlSegura(src, IMAGEM_FALLBACK);
  image.alt = String(alt || '');
  image.loading = 'lazy';
  image.decoding = 'async';
  if (classe) image.className = classe;
  image.addEventListener('error', () => { image.src = IMAGEM_FALLBACK; }, { once: true });
  return image;
}

export function criarCardProduto(produto) {
  const prod = { ...produto, id: String(produto.id || '') };
  const card = document.createElement('a');
  card.className = 'produto-card';
  card.href = `detalhe.html?id=${encodeURIComponent(prod.id)}`;
  card.style.cssText = 'text-decoration:none;color:inherit;';

  const imagemContainer = elemento('div', null, 'produto-imagem');
  imagemContainer.append(imagemProduto(prod.imagens?.[0], prod.nome));
  card.append(imagemContainer);

  const favorito = elemento('button', verificarFavorito(prod.id) ? '❤️' : '🤍', `btn-favorito${verificarFavorito(prod.id) ? ' ativo' : ''}`);
  favorito.type = 'button';
  favorito.dataset.produtoId = prod.id;
  favorito.style.cssText = 'position:absolute;top:10px;left:10px;background:rgba(255,255,255,.9);border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,.1);z-index:5;';
  card.append(favorito);

  const info = elemento('div', null, 'produto-info');
  info.append(elemento('span', prod.tag || prod.categoria || '', 'categoria-tag'));
  info.append(elemento('h3', prod.nome || 'Produto'));
  const preco = elemento('p', prod.preco || '', 'preco');
  if (prod.precoAntigo && prod.desconto) preco.prepend(elemento('span', prod.desconto, 'desconto'));
  info.append(preco);
  if (prod.precoAntigo) {
    const antigo = elemento('span', prod.precoAntigo);
    antigo.style.cssText = 'text-decoration:line-through;color:#999;font-size:14px;';
    info.append(antigo);
  }
  if (prod.parcelas) info.append(elemento('p', prod.parcelas, 'parcelas'));
  if (prod.freteGratis) info.append(elemento('span', 'Frete grátis FULL', 'selo-frete'));

  const estoque = Number(prod.estoque);
  if (Number.isFinite(estoque)) {
    const aviso = elemento('span');
    aviso.style.cssText = 'display:block;margin-top:6px;font-size:13px;';
    if (estoque <= 0) { aviso.textContent = '🚫 Esgotado'; aviso.style.color = '#E74C3C'; }
    else if (estoque <= 5) { aviso.textContent = `🔥 Últimas ${estoque} unidades!`; aviso.style.color = '#E74C3C'; }
    else { aviso.textContent = `✅ ${estoque} em estoque`; aviso.style.color = '#27ae60'; }
    info.append(aviso);
  }

  const avaliacao = elemento('div', '', 'avaliacao-card');
  avaliacao.dataset.produtoId = prod.id;
  avaliacao.style.cssText = 'margin-top:6px;font-size:13px;min-height:18px;';
  info.append(avaliacao);

  const acoes = elemento('div', null, 'acoes-produto');
  acoes.style.cssText = 'margin-top:12px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;';
  const adicionar = elemento('button', '🛒 Adicionar', 'btn-add-carrinho-card');
  adicionar.type = 'button';
  adicionar.dataset.produtoId = prod.id;
  adicionar.style.cssText = 'background:var(--cor-ouro);color:#000;border:none;padding:8px 16px;border-radius:30px;font-weight:700;font-size:14px;cursor:pointer;flex:1;';
  const partilhar = elemento('button', '📤 Partilhar', 'btn-share');
  partilhar.type = 'button';
  partilhar.dataset.nome = String(prod.nome || 'Produto');
  partilhar.dataset.preco = String(prod.preco || '');
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
  partilhar.dataset.link = obterLinkAfiliado(`${baseUrl}/detalhe.html?id=${encodeURIComponent(prod.id)}`);
  partilhar.style.cssText = 'background:transparent;border:1px solid #25D366;color:#25D366;padding:8px 16px;border-radius:30px;font-size:14px;font-weight:700;cursor:pointer;';
  acoes.append(adicionar, partilhar);
  info.append(acoes);
  card.append(info);

  obterAvaliacao(prod.id).then((dados) => {
    if (dados.media > 0) avaliacao.textContent = `⭐ ${dados.media.toFixed(1)} (${dados.total})`;
  }).catch(() => {});
  return card;
}

export function filtrarEOrdenar(produtos, categoria, busca, min, max, ordenacao, minAvaliacao = 0, dataFiltro = '') {
  const termo = String(busca || '').toLocaleLowerCase();
  let filtrados = produtos.filter((prod) => {
    const nome = String(prod.nome || '').toLocaleLowerCase();
    const tag = String(prod.tag || '').toLocaleLowerCase();
    const categoriaProd = String(prod.categoria || '').toLocaleLowerCase();
    const matchCategoria = categoria === 'todos' || prod.categoria === categoria;
    const matchBusca = !termo || nome.includes(termo) || tag.includes(termo) || categoriaProd.includes(termo);
    const preco = extrairValorNumerico(String(prod.preco || ''));
    let matchData = true;
    if (dataFiltro && prod.criadoEm) {
      const data = new Date(prod.criadoEm.seconds ? prod.criadoEm.seconds * 1000 : prod.criadoEm);
      const dias = Number.parseInt(dataFiltro, 10);
      if (!Number.isNaN(dias) && !Number.isNaN(data.getTime())) matchData = Date.now() - data.getTime() <= dias * 86400000;
    }
    return matchCategoria && matchBusca && preco >= min && preco <= max && matchData;
  });
  // A média é carregada assincronamente; não fingir que este filtro funciona.
  if (minAvaliacao > 0) console.warn('O filtro de avaliação exige um campo agregado no produto.');
  const porData = (value) => value?.seconds ? value.seconds : new Date(value || 0).getTime() || 0;
  switch (ordenacao) {
    case 'preco-asc': filtrados.sort((a, b) => extrairValorNumerico(a.preco) - extrairValorNumerico(b.preco)); break;
    case 'preco-desc': filtrados.sort((a, b) => extrairValorNumerico(b.preco) - extrairValorNumerico(a.preco)); break;
    case 'nome': filtrados.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))); break;
    case 'data': filtrados.sort((a, b) => porData(b.criadoEm) - porData(a.criadoEm)); break;
    default: filtrados.sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  }
  return filtrados;
}

export async function renderizarGrade(produtosFiltrados, container, pagina = 1, itensPorPagina = 10) {
  if (!container) return;
  const produtos = produtosFiltrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);
  if (pagina === 1) container.replaceChildren();
  if (!produtos.length && pagina === 1) {
    const aviso = elemento('p', 'Nenhum produto encontrado.');
    aviso.style.cssText = 'grid-column:1/-1;text-align:center;padding:60px 20px;color:#999;font-size:16px;';
    container.append(aviso);
    return;
  }
  const fragment = document.createDocumentFragment();
  produtos.forEach((prod) => fragment.append(criarCardProduto(prod)));
  container.append(fragment);
}
