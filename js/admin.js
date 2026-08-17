import { supabase } from './config.js';
import { extrairValorNumerico, mostrarToast } from './utils.js';

// Senha definida diretamente aqui para garantir que o botão funcione sempre
const ADMIN_SENHA = 'admin123';

let produtos = [];
let editandoId = null;
let todasVendas = []; // Para o backup

document.addEventListener('DOMContentLoaded', () => {
    const loginDiv = document.getElementById('loginAdmin');
    const conteudoAdmin = document.getElementById('conteudoAdmin');
    const btnLogin = document.getElementById('btnLoginAdmin');
    const senhaInput = document.getElementById('senhaAdmin');
    const erroLogin = document.getElementById('erroLogin');

    btnLogin.addEventListener('click', () => {
        if (senhaInput.value === ADMIN_SENHA) {
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

    const btnUploadImg = document.getElementById('btnUploadImg');
    const imgUploadInput = document.getElementById('imgUpload');
    const uploadProgress = document.getElementById('uploadProgress');
    const IMGBB_API_KEY = 'b85a8d73cde5cf0bf399fffbdcb53a69';

    async function uploadParaImgBB(file) {
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', file);
        const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Erro no upload');
        const data = await res.json();
        return data.data.display_url || data.data.url;
    }

    btnUploadImg.addEventListener('click', async () => {
        const files = imgUploadInput.files;
        if (!files.length) { alert('Selecione pelo menos uma imagem.'); return; }

        const imagensAtuais = imagens.value.split(',').map(s => s.trim()).filter(s => s);
        btnUploadImg.disabled = true;
        btnUploadImg.textContent = '⏳ Enviando...';
        uploadProgress.textContent = '0/' + files.length;

        let sucesso = 0;
        for (let i = 0; i < files.length; i++) {
            try {
                const url = await uploadParaImgBB(files[i]);
                imagensAtuais.push(url);
                sucesso++;
            } catch (e) { console.error('Erro no upload da imagem', i, e); }
            uploadProgress.textContent = `${sucesso}/${files.length} enviadas`;
        }

        imagens.value = imagensAtuais.join(', ');
        atualizarPreview(imagens.value);
        btnUploadImg.disabled = false;
        btnUploadImg.textContent = '⬆ Enviar para ImgBB';
        uploadProgress.textContent = `✅ ${sucesso} imagens adicionadas!`;
        setTimeout(() => uploadProgress.textContent = '', 3000);
        imgUploadInput.value = '';
    });

    async function carregarProdutos() {
        const dados = localStorage.getItem('aurora_produtos_admin');
        if (dados) {
            try { produtos = JSON.parse(dados); if (!Array.isArray(produtos)) produtos = []; } catch (e) { produtos = []; }
            renderizarLista();
        }

        const { data, error } = await supabase.from('produtos').select('*').order('ordem', { ascending: true });
        if (error) {
            console.error('Erro ao carregar produtos do Supabase:', error);
            return;
        }
        produtos = data || [];
        localStorage.setItem('aurora_produtos_admin', JSON.stringify(produtos));
        renderizarLista();
    }

    async function salvarProduto(produto) {
        const { error } = await supabase.from('produtos').upsert(produto, { onConflict: 'id' });
        if (error) { console.error('Erro ao salvar:', error); return false; }
        return true;
    }

    async function deletarProduto(id) {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) { console.error('Erro ao excluir:', error); return false; }
        return true;
    }

    function mostrarMensagem(texto, tipo = 'info') {
        statusMsg.style.display = 'block';
        statusMsg.textContent = texto;
        statusMsg.className = 'aviso';
        if (tipo === 'sucesso') statusMsg.classList.add('sucesso');
        setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
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
                            ${prod.video ? '| 🎬 Vídeo' : ''}
                        </small>
                    </div>
                    <div class="acoes">
                        <button class="btn-admin" onclick="window.editarProduto(${prod.id})">✏️ Editar</button>
                        <button class="btn-admin btn-admin-excluir" onclick="window.excluirProduto(${prod.id})">🗑️ Excluir</button>
                    </div>
                </div>
            `).join('');
        }

        const produtosBaixos = produtos.filter(p => p.estoque <= 2 && p.estoque > 0);
        if (produtosBaixos.length > 0) {
            htmlLista = `
                <div style="background:#fde8e8; border:1px solid #E74C3C; padding:12px; border-radius:8px; margin-bottom:16px; color:#E74C3C;">
                    <strong>⚠️ ALERTA DE ESTOQUE BAIXO</strong><br>
                    ${produtosBaixos.map(p => `🔴 ${p.nome} (Estoque: ${p.estoque})`).join('<br>')}
                </div>
            ` + htmlLista;
        }

        listaDiv.innerHTML = htmlLista;

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
                    produtos.forEach(async (p) => { await supabase.from('produtos').update({ ordem: p.ordem }).eq('id', p.id); });
                    localStorage.setItem('aurora_produtos_admin', JSON.stringify(produtos));
                    renderizarLista();
                    mostrarMensagem('Ordem atualizada!', 'sucesso');
                }
            });
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const precoValor = preco.value.trim();
        if (!nome.value.trim() || !categoria.value || !precoValor || !custo.value.trim()) {
            alert('Preencha Nome, Categoria, Preço e Preço de Custo obrigatoriamente.');
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
            custo: custo.value.trim(),
            desconto: desconto.value.trim() || '',
            parcelas: parcelas.value.trim() || '',
            freteGratis: freteGratis.checked,
            descricao: descricao.value.trim(),
            imagens: imagensArray.length > 0 ? imagensArray : ['placeholder.jpg'],
            tag: tag.value.trim() || categoria.value,
            estoque: parseInt(estoque.value) || 0,
            video: video.value.trim()
        };

        const sucesso = await salvarProduto(novoProduto);
        if (sucesso) {
            if (editandoId) {
                const index = produtos.findIndex(p => p.id === editandoId);
                if (index !== -1) { produtos[index] = novoProduto; mostrarMensagem('Produto atualizado com sucesso!', 'sucesso'); }
            } else {
                produtos.push(novoProduto);
                mostrarMensagem('Produto adicionado com sucesso!', 'sucesso');
            }
            localStorage.setItem('aurora_produtos_admin', JSON.stringify(produtos));
            resetForm();
            renderizarLista();
        } else {
            mostrarMensagem('Erro ao salvar produto no Supabase.', 'info');
        }
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
        custo.value = prod.custo || '';
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

    window.excluirProduto = async function(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        const sucesso = await deletarProduto(id);
        if (sucesso) {
            produtos = produtos.filter(p => p.id !== id);
            localStorage.setItem('aurora_produtos_admin', JSON.stringify(produtos));
            if (editandoId === id) resetForm();
            renderizarLista();
            mostrarMensagem('Produto excluído.', 'sucesso');
        } else {
            mostrarMensagem('Erro ao excluir produto.', 'info');
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

    const btnBackup = document.getElementById('btnBackup');
    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            const { data: vendasData } = await supabase.from('vendas').select('*');
            todasVendas = vendasData || [];

            const backup = { produtos: produtos, vendas: todasVendas };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_aurora_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            mostrarMensagem('✅ Backup descarregado!', 'sucesso');
        });
    }

    const btnImportarCSV = document.getElementById('btnImportarCSV');
    const inputCSV = document.getElementById('inputCSV');
    if (btnImportarCSV && inputCSV) {
        btnImportarCSV.addEventListener('click', () => inputCSV.click());
        inputCSV.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function(e) {
                const text = e.target.result;
                const linhas = text.split('\n');
                let adicionados = 0;
                const produtosParaInserir = [];
                for (let i = 1; i < linhas.length; i++) {
                    const colunas = linhas[i].split(',');
                    if (colunas.length >= 4) {
                        const novoProd = {
                            id: produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 + adicionados : 1 + adicionados,
                            ordem: 999,
                            nome: colunas[0].trim(),
                            categoria: colunas[1].trim(),
                            preco: colunas[2].trim(),
                            custo: colunas[3] ? colunas[3].trim() : '0',
                            estoque: parseInt(colunas[4] ? colunas[4].trim() : 0) || 0,
                            imagens: ['placeholder.jpg'],
                            tag: colunas[1].trim()
                        };
                        produtosParaInserir.push(novoProd);
                        adicionados++;
                    }
                }
                if (produtosParaInserir.length > 0) {
                    const { error } = await supabase.from('produtos').insert(produtosParaInserir);
                    if (!error) {
                        produtos.push(...produtosParaInserir);
                        localStorage.setItem('aurora_produtos_admin', JSON.stringify(produtos));
                        renderizarLista();
                        mostrarMensagem(`✅ ${adicionados} produtos importados com sucesso!`, 'sucesso');
                    } else {
                        mostrarMensagem('Erro ao importar CSV.', 'info');
                    }
                }
                inputCSV.value = '';
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    carregarProdutos();
}