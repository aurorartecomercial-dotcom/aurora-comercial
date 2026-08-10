// ============================================================
// ADMIN - Painel administrativo
// ============================================================

import { CONFIG } from './config.js';
import { extrairValorNumerico, mostrarToast } from './utils.js';

let produtos = [];
let editandoId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Verifica login
    const loginDiv = document.getElementById('loginAdmin');
    const conteudoAdmin = document.getElementById('conteudoAdmin');
    const btnLogin = document.getElementById('btnLoginAdmin');
    const senhaInput = document.getElementById('senhaAdmin');
    const erroLogin = document.getElementById('erroLogin');

    btnLogin.addEventListener('click', () => {
        if (senhaInput.value === CONFIG.ADMIN_SENHA) {
            loginDiv.style.display = 'none';
            conteudoAdmin.style.display = 'block';
            iniciarAdmin();
        } else {
            erroLogin.style.display = 'block';
        }
    });

    senhaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnLogin.click();
    });
});

function iniciarAdmin() {
    // Elementos
    const form = document.getElementById('formProduto');
    const formTitulo = document.getElementById('formTitulo');
    const btnSalvar = document.getElementById('btnSalvar');
    const btnCancelar = document.getElementById('btnCancelarEdicao');
    const listaDiv = document.getElementById('listaProdutos');
    const contadorSpan = document.getElementById('contadorProdutos');
    const statusMsg = document.getElementById('statusMsg');

    // Inputs
    const prodId = document.getElementById('prodId');
    const nome = document.getElementById('nome');
    const categoria = document.getElementById('categoria');
    const tag = document.getElementById('tag');
    const preco = document.getElementById('preco');
    const precoAntigo = document.getElementById('precoAntigo');
    const desconto = document.getElementById('desconto');
    const parcelas = document.getElementById('parcelas');
    const freteGratis = document.getElementById('freteGratis');
    const descricao = document.getElementById('descricao');
    const imagens = document.getElementById('imagens');
    const ordem = document.getElementById('ordem');
    const estoque = document.getElementById('estoque');
    const video = document.getElementById('video');

    // JSONbin
    const jsonbinIdInput = document.getElementById('jsonbinId');
    const jsonbinKeyInput = document.getElementById('jsonbinKey');
    const btnTestar = document.getElementById('btnTestarJsonbin');
    const btnEnviar = document.getElementById('btnEnviarJsonbin');
    const btnForcarCache = document.getElementById('btnForcarCache');

    function carregarProdutos() {
        const dados = localStorage.getItem('aurora_produtos_admin');
        if (dados) {
            try {
                produtos = JSON.parse(dados);
                if (!Array.isArray(produtos)) produtos = [];
            } catch (e) {
                produtos = [];
            }
        } else {
            fetch('produtos.json')
                .then(res => res.json())
                .then(dados => {
                    produtos = dados;
                    salvarLocalStorage();
                    renderizarLista();
                })
                .catch(() => {
                    produtos = [];
                    renderizarLista();
                });
        }
        renderizarLista();
    }

    function salvarLocalStorage() {
        localStorage.setItem('aurora_produtos_admin', JSON.stringify(produtos));
        // Invalida cache do catálogo
        localStorage.removeItem(CONFIG.CACHE_KEY);
    }

    function mostrarMensagem(texto, tipo = 'info') {
        statusMsg.style.display = 'block';
        statusMsg.textContent = texto;
        statusMsg.className = 'aviso';
        if (tipo === 'sucesso') statusMsg.classList.add('sucesso');
        setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
    }

    // ===== LISTA DE PRODUTOS =====
    function renderizarLista() {
        contadorSpan.textContent = produtos.length;
        if (produtos.length === 0) {
            listaDiv.innerHTML = '<p style="color:#999;">Nenhum produto cadastrado.</p>';
            return;
        }
        const ordenados = [...produtos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        listaDiv.innerHTML = ordenados.map(prod => `
            <div class="produto-item" data-id="${prod.id}">
                <div>
                    <span>${prod.nome}</span>
                    <small style="color:#888; display:block;">
                        ${prod.categoria} | ${prod.preco} 
                        ${prod.estoque !== undefined ? `| Estoque: ${prod.estoque}` : ''}
                        ${prod.video ? '| 🎬 Vídeo' : ''}
                    </small>
                </div>
                <div class="acoes">
                    <button class="btn-admin" onclick="window.editarProduto(${prod.id})">✏️ Editar</button>
                    <button class="btn-admin btn-admin-excluir" onclick="window.excluirProduto(${prod.id})">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');

        // Drag-and-drop (SortableJS)
        if (typeof Sortable !== 'undefined') {
            const el = document.getElementById('listaProdutos');
            Sortable.create(el, {
                animation: 150,
                onEnd: function(evt) {
                    const items = el.querySelectorAll('.produto-item');
                    const newOrder = [];
                    items.forEach(item => {
                        const id = parseInt(item.dataset.id);
                        const prod = produtos.find(p => p.id === id);
                        if (prod) newOrder.push(prod);
                    });
                    produtos = newOrder;
                    produtos.forEach((p, i) => p.ordem = i + 1);
                    salvarLocalStorage();
                    renderizarLista();
                    mostrarMensagem('Ordem atualizada!', 'sucesso');
                }
            });
        }
    }

    // ===== FORMULÁRIO =====
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const precoValor = preco.value.trim();
        if (!nome.value.trim() || !categoria.value || !precoValor) {
            alert('Preencha Nome, Categoria e Preço obrigatoriamente.');
            return;
        }

        const imagensArray = imagens.value.split(',').map(s => s.trim()).filter(s => s);
        const novoProduto = {
            id: editandoId || (produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1),
            ordem: parseInt(ordem.value) || 0,
            nome: nome.value.trim(),
            categoria: categoria.value,
            preco: precoValor,
            precoAntigo: precoAntigo.value.trim() || '',
            desconto: desconto.value.trim() || '',
            parcelas: parcelas.value.trim() || '',
            freteGratis: freteGratis.checked,
            descricao: descricao.value.trim(),
            imagens: imagensArray.length > 0 ? imagensArray : ['placeholder.jpg'],
            tag: tag.value.trim() || categoria.value,
            estoque: parseInt(estoque.value) || 0,
            video: video.value.trim()
        };

        if (editandoId) {
            const index = produtos.findIndex(p => p.id === editandoId);
            if (index !== -1) {
                produtos[index] = novoProduto;
                mostrarMensagem('Produto atualizado com sucesso!', 'sucesso');
            }
        } else {
            produtos.push(novoProduto);
            mostrarMensagem('Produto adicionado com sucesso!', 'sucesso');
        }

        salvarLocalStorage();
        resetForm();
        renderizarLista();
    });

    window.editarProduto = function(id) {
        const prod = produtos.find(p => p.id === id);
        if (!prod) return;
        editandoId = prod.id;
        prodId.value = prod.id;
        nome.value = prod.nome;
        categoria.value = prod.categoria;
        tag.value = prod.tag || '';
        preco.value = prod.preco;
        precoAntigo.value = prod.precoAntigo || '';
        desconto.value = prod.desconto || '';
        parcelas.value = prod.parcelas || '';
        freteGratis.checked = prod.freteGratis || false;
        descricao.value = prod.descricao || '';
        imagens.value = Array.isArray(prod.imagens) ? prod.imagens.join(', ') : '';
        ordem.value = prod.ordem || 0;
        estoque.value = prod.estoque || 0;
        video.value = prod.video || '';
        atualizarPreview(imagens.value);

        formTitulo.textContent = '✏️ Editar Produto';
        btnSalvar.textContent = '💾 Atualizar Produto';
        btnCancelar.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.excluirProduto = function(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        produtos = produtos.filter(p => p.id !== id);
        salvarLocalStorage();
        if (editandoId === id) resetForm();
        renderizarLista();
        mostrarMensagem('Produto excluído.', 'sucesso');
    };

    btnCancelar.addEventListener('click', resetForm);

    function resetForm() {
        editandoId = null;
        form.reset();
        prodId.value = '';
        ordem.value = '0';
        estoque.value = '10';
        video.value = '';
        formTitulo.textContent = '➕ Novo Produto';
        btnSalvar.textContent = '💾 Salvar Produto';
        btnCancelar.style.display = 'none';
        previewImagens.innerHTML = '';
    }

    // ===== PREVIEW IMAGENS =====
    imagens.addEventListener('input', () => {
        atualizarPreview(imagens.value);
    });

    function atualizarPreview(texto) {
        const urls = texto.split(',').map(s => s.trim()).filter(s => s);
        previewImagens.innerHTML = '';
        urls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.onerror = () => { img.style.display = 'none'; };
            previewImagens.appendChild(img);
        });
    }

    // ===== RECARREGAR =====
    document.getElementById('btnRecarregar').addEventListener('click', () => {
        carregarProdutos();
        mostrarMensagem('Lista recarregada.', 'info');
    });

    // ===== JSONBIN =====
    btnTestar.addEventListener('click', async () => {
        const binId = jsonbinIdInput.value.trim();
        const key = jsonbinKeyInput.value.trim();
        if (!binId || !key) {
            alert('Preencha BIN ID e X-Master-Key.');
            return;
        }
        try {
            const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: { 'X-Master-Key': key }
            });
            if (res.ok) {
                const data = await res.json();
                mostrarMensagem('✅ Conexão bem-sucedida! JSONbin contém ' + data.record.length + ' produtos.', 'sucesso');
            } else {
                mostrarMensagem('❌ Erro ao acessar JSONbin. Verifique as credenciais.', 'info');
            }
        } catch (e) {
            mostrarMensagem('❌ Erro de rede ao testar JSONbin.', 'info');
        }
    });

    btnEnviar.addEventListener('click', async () => {
        const binId = jsonbinIdInput.value.trim();
        const key = jsonbinKeyInput.value.trim();
        if (!binId || !key) {
            alert('Configure o JSONbin primeiro.');
            return;
        }
        if (!confirm('Isso substituirá o conteúdo do JSONbin pelo catálogo atual. Continuar?')) return;
        try {
            const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': key
                },
                // 👇 ALTERAÇÃO AQUI: Enviamos a versão e os dados
                body: JSON.stringify({ 
                    version: Date.now(), 
                    data: produtos 
                })
            });
            if (res.ok) {
                mostrarMensagem('📤 Catálogo enviado ao JSONbin com sucesso!', 'sucesso');
                // Invalida cache
                localStorage.removeItem(CONFIG.CACHE_KEY);
            } else {
                mostrarMensagem('❌ Falha ao enviar. Verifique permissões.', 'info');
            }
        } catch (e) {
            mostrarMensagem('❌ Erro de rede.', 'info');
        }
    });

    btnForcarCache.addEventListener('click', () => {
        localStorage.removeItem(CONFIG.CACHE_KEY);
        mostrarMensagem('Cache do catálogo removido. O site recarregará os dados na próxima visita.', 'sucesso');
    });

    // ===== INICIAR =====
    carregarProdutos();

    // Configurações iniciais do JSONbin (preenche com os valores do config)
    jsonbinIdInput.value = CONFIG.BIN_ID;
    jsonbinKeyInput.value = CONFIG.MASTER_KEY;
}