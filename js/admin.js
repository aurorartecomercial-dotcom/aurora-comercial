import { mostrarToast } from './utils.js';

let produtos = [];
let editandoId = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginDiv = document.getElementById('loginAdmin');
    const conteudoAdmin = document.getElementById('conteudoAdmin');
    const btnLogin = document.getElementById('btnLoginAdmin');
    const emailInput = document.getElementById('emailAdmin');
    const senhaInput = document.getElementById('senhaAdmin');
    const erroLogin = document.getElementById('erroLogin');

    btnLogin.addEventListener('click', async () => {
        try {
            // ✅ CORREÇÃO: usa /api/login em vez de /api/admin/login
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, password: senhaInput.value })
            });
            const data = await response.json();

            if (data.success) {
                sessionStorage.setItem('admin_token', data.token);
                loginDiv.style.display = 'none';
                conteudoAdmin.style.display = 'block';
                iniciarAdmin();
            } else {
                erroLogin.style.display = 'block';
                erroLogin.textContent = 'Credenciais inválidas';
            }
        } catch (e) {
            erroLogin.style.display = 'block';
            erroLogin.textContent = 'Erro de ligação. Tente novamente.';
        }
    });

    senhaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnLogin.click(); });
});

function iniciarAdmin() {
    const form = document.getElementById('formProduto');
    const formTitulo = document.getElementById('formTitulo');
    const btnSalvar = document.getElementById('btnSalvar');
    const btnCancelar = document.getElementById('btnCancelarEdicao');
    const listaDiv = document.getElementById('listaProdutos');
    const contadorSpan = document.getElementById('contadorProdutos');
    const statusMsg = document.getElementById('statusMsg');

    const prodId = document.getElementById('prodId');
    const nome = document.getElementById('nome');
    const categoria = document.getElementById('categoria');
    const tag = document.getElementById('tag');
    const preco = document.getElementById('preco');
    const precoAntigo = document.getElementById('precoAntigo');
    const custo = document.getElementById('custo');
    const desconto = document.getElementById('desconto');
    const parcelas = document.getElementById('parcelas');
    const freteGratis = document.getElementById('freteGratis');
    const descricao = document.getElementById('descricao');
    const imagens = document.getElementById('imagens');
    const previewImagens = document.getElementById('previewImagens');
    const ordem = document.getElementById('ordem');
    const estoque = document.getElementById('estoque');
    const video = document.getElementById('video');

    function mostrarMensagem(texto, tipo = 'info') {
        statusMsg.style.display = 'block';
        statusMsg.textContent = texto;
        statusMsg.className = 'aviso';
        if (tipo === 'sucesso') statusMsg.classList.add('sucesso');
        setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
    }

    async function carregarProdutos() {
        try {
            const token = sessionStorage.getItem('admin_token');
            const response = await fetch('/api/admin/produtos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            produtos = await response.json();
            renderizarLista();
        } catch (e) {
            console.error('Erro ao carregar produtos:', e);
            produtos = [];
            renderizarLista();
        }
    }

    function renderizarLista() {
        contadorSpan.textContent = produtos.length;
        let htmlLista = '';
        if (produtos.length === 0) {
            htmlLista = '<p style="color:#999;">Nenhum produto cadastrado.</p>';
        } else {
            const ordenados = [...produtos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
            htmlLista = ordenados.map(prod => `
                <div class="produto-item" data-id="${prod.id}">
                    <div>
                        <span>${prod.nome}</span>
                        <small style="color:#888; display:block;">
                            ${prod.categoria} | ${prod.preco} | Custo: ${prod.custo || 'N/A'}
                            ${prod.estoque !== undefined ? `| Estoque: ${prod.estoque}` : ''}
                        </small>
                    </div>
                    <div class="acoes">
                        <button class="btn-admin" onclick="window.editarProduto('${prod.id}')">✏️ Editar</button>
                        <button class="btn-admin btn-admin-excluir" onclick="window.excluirProduto('${prod.id}')">🗑️ Excluir</button>
                    </div>
                </div>
            `).join('');
        }
        listaDiv.innerHTML = htmlLista;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('admin_token');
        const precoValor = preco.value.trim();
        if (!nome.value.trim() || !categoria.value || !precoValor || !custo.value.trim()) {
            alert('Preencha Nome, Categoria, Preço e Preço de Custo obrigatoriamente.');
            return;
        }

        const novoProduto = {
            nome: nome.value.trim(),
            categoria: categoria.value,
            preco: precoValor,
            preco_antigo: precoAntigo.value.trim() || null,
            descricao: descricao.value.trim(),
            imagem: imagens.value.split(',')[0].trim() || '',
            estoque: parseInt(estoque.value) || 0,
            tag: tag.value.trim() || categoria.value,
            frete_gratis: freteGratis.checked ? 1 : 0,
            prazo_entrega: 'normal',
            ordem: parseInt(ordem.value) || 0,
            video: video.value.trim()
        };

        try {
            let url = '/api/admin/produtos';
            let method = 'POST';
            if (editandoId) {
                url += `?id=${editandoId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(novoProduto)
            });

            if (response.ok) {
                mostrarMensagem(editandoId ? 'Produto atualizado!' : 'Produto adicionado!', 'sucesso');
                resetForm();
                await carregarProdutos();
            } else {
                mostrarMensagem('Erro ao salvar produto.', 'info');
            }
        } catch (e) {
            console.error('Erro ao salvar produto:', e);
            mostrarMensagem('Erro ao salvar produto: ' + e.message, 'info');
        }
    });

    window.editarProduto = function(id) {
        const prod = produtos.find(p => p.id == id);
        if (!prod) return;
        editandoId = prod.id;
        prodId.value = prod.id;
        nome.value = prod.nome;
        categoria.value = prod.categoria;
        tag.value = prod.tag || '';
        preco.value = prod.preco;
        precoAntigo.value = prod.preco_antigo || '';
        custo.value = prod.custo || '';
        desconto.value = prod.desconto || '';
        parcelas.value = prod.parcelas || '';
        freteGratis.checked = prod.frete_gratis === 1;
        descricao.value = prod.descricao || '';
        imagens.value = prod.imagem || '';
        ordem.value = prod.ordem || 0;
        estoque.value = prod.estoque || 0;
        video.value = prod.video || '';
        atualizarPreview(imagens.value);

        formTitulo.textContent = '✏️ Editar Produto';
        btnSalvar.textContent = '💾 Atualizar Produto';
        btnCancelar.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.excluirProduto = async function(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        const token = sessionStorage.getItem('admin_token');
        try {
            const response = await fetch(`/api/admin/produtos?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                produtos = produtos.filter(p => p.id != id);
                if (editandoId == id) resetForm();
                renderizarLista();
                mostrarMensagem('Produto excluído.', 'sucesso');
            } else {
                mostrarMensagem('Erro ao excluir.', 'info');
            }
        } catch (e) {
            mostrarMensagem('Erro ao excluir.', 'info');
        }
    };

    btnCancelar.addEventListener('click', resetForm);

    function resetForm() {
        editandoId = null;
        form.reset();
        prodId.value = '';
        ordem.value = '0';
        estoque.value = '10';
        video.value = '';
        custo.value = '';
        formTitulo.textContent = '➕ Novo Produto';
        btnSalvar.textContent = '💾 Salvar Produto';
        btnCancelar.style.display = 'none';
        previewImagens.innerHTML = '';
        imagens.value = '';
    }

    imagens.addEventListener('input', () => { atualizarPreview(imagens.value); });

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

    document.getElementById('btnRecarregar').addEventListener('click', () => { carregarProdutos(); mostrarMensagem('Lista recarregada.', 'info'); });

    carregarProdutos();
}