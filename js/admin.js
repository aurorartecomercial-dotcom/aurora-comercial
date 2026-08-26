import { auth, db, CONFIG } from './config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { extrairValorNumerico, mostrarToast } from './utils.js';

let produtos = [];
let editandoId = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginDiv = document.getElementById('loginAdmin');
    const conteudoAdmin = document.getElementById('conteudoAdmin');
    const btnLogin = document.getElementById('btnLoginAdmin');
    const emailInput = document.getElementById('emailAdmin'); // Adicione este campo no HTML
    const senhaInput = document.getElementById('senhaAdmin');
    const erroLogin = document.getElementById('erroLogin');

    btnLogin.addEventListener('click', async () => {
        try {
            await signInWithEmailAndPassword(auth, emailInput.value, senhaInput.value);
            loginDiv.style.display = 'none';
            conteudoAdmin.style.display = 'block';
            iniciarAdmin();
        } catch (error) {
            erroLogin.style.display = 'block';
            erroLogin.textContent = 'Credenciais inválidas';
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
    const IMGBB_API_KEY = 'b85a8d73cde5cf0bf399fffbdcb53a69'; // (pode mover para o backend depois)

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
        try {
            const snapshot = await getDocs(collection(db, 'produtos'));
            produtos = snapshot.docs.map(doc => doc.data());
            renderizarLista();
        } catch (e) {
            console.error('Erro ao carregar produtos:', e);
            produtos = [];
            renderizarLista();
        }
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
        const precoValor = preco.value.trim();
        if (!nome.value.trim() || !categoria.value || !precoValor || !custo.value.trim()) {
            alert('Preencha Nome, Categoria, Preço e Preço de Custo obrigatoriamente.');
            return;
        }

        const imagensArray = imagens.value.split(',').map(s => s.trim()).filter(s => s);
        const novoProduto = {
            id: editandoId || crypto.randomUUID(),
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

        try {
            if (editandoId) {
                await updateDoc(doc(db, 'produtos', editandoId), novoProduto);
                mostrarMensagem('Produto atualizado!', 'sucesso');
            } else {
                await addDoc(collection(db, 'produtos'), novoProduto);
                mostrarMensagem('Produto adicionado!', 'sucesso');
            }
            resetForm();
            await carregarProdutos();
        } catch (e) {
            mostrarMensagem('Erro ao salvar produto.', 'info');
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
        try {
            await deleteDoc(doc(db, 'produtos', id));
            produtos = produtos.filter(p => p.id !== id);
            if (editandoId === id) resetForm();
            renderizarLista();
            mostrarMensagem('Produto excluído.', 'sucesso');
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

    // Botões simples (remover ou adaptar)
    document.getElementById('btnTestarJsonbin')?.addEventListener('click', async () => {
        try { const snap = await getDocs(collection(db, 'produtos')); mostrarMensagem('✅ Firestore OK! ' + snap.size + ' produtos', 'sucesso'); }
        catch(e) { mostrarMensagem('❌ Erro: ' + e.message, 'info'); }
    });

    document.getElementById('btnEnviarJsonbin')?.addEventListener('click', () => { mostrarMensagem('Dados já no Firestore.', 'sucesso'); });
    document.getElementById('btnForcarCache')?.addEventListener('click', () => { localStorage.removeItem(CONFIG.CACHE_KEY); mostrarMensagem('Cache limpo.', 'sucesso'); });

    carregarProdutos();
}