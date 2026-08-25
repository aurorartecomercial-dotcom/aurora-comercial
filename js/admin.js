import { CONFIG } from './config.js';
import { extrairValorNumerico, mostrarToast } from './utils.js';

let produtos = [];
let editandoId = null;
let todasVendas = []; // Para o backup

document.addEventListener('DOMContentLoaded', () => {
    const loginDiv = document.getElementById('loginAdmin');
    const conteudoAdmin = document.getElementById('conteudoAdmin');
    const btnLogin = document.getElementById('btnLoginAdmin');
    const senhaInput = document.getElementById('senhaAdmin');
    const erroLogin = document.getElementById('erroLogin');

    btnLogin.addEventListener('click', async () => {
        const senha = senhaInput.value;
        if (await verificarSenha(senha)) {
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

async function verificarSenha(senha) {
    if (senha === CONFIG.ADMIN_SENHA) return true; // compatibilidade
    // Usar Web Crypto API para hash SHA-256
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(senha);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex === CONFIG.ADMIN_SENHA_HASH;
    } catch (e) {
        console.warn('Web Crypto não disponível, usando comparação simples.');
        return senha === CONFIG.ADMIN_SENHA;
    }
}

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

    const jsonbinIdInput = document.getElementById('jsonbinId');
    const jsonbinKeyInput = document.getElementById('jsonbinKey');
    const btnTestar = document.getElementById('btnTestarJsonbin');
    const btnEnviar = document.getElementById('btnEnviarJsonbin');
    const btnForcarCache = document.getElementById('btnForcarCache');

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

    function carregarProdutos() {
        const dados = localStorage.getItem('aurora_produtos_admin');
        if (dados) {
            try { produtos = JSON.parse(dados); if (!Array.isArray(produtos)) produtos = []; } catch (e) { produtos = []; }
        } else {
            fetch('produtos.json').then(res => res.json()).then(dados => { produtos = dados; salvarLocalStorage(); renderizarLista(); }).catch(() => { produtos = []; renderizarLista(); });
        }
        renderizarLista();
    }

    function salvarLocalStorage() {
        localStorage.setItem('aurora_produtos_admin', JSON.stringify(produtos));
        localStorage.removeItem(CONFIG.CACHE_KEY);
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
                    salvarLocalStorage();
                    renderizarLista();
                    mostrarMensagem('Ordem atualizada!', 'sucesso');
                }
            });
        }
    }

    form.addEventListener('submit', (e) => {
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

        if (editandoId) {
            const index = produtos.findIndex(p => p.id === editandoId);
            if (index !== -1) { produtos[index] = novoProduto; mostrarMensagem('Produto atualizado com sucesso!', 'sucesso'); }
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

    // ============================================================
    // IMPORTAR CSV E BACKUP
    // ============================================================
    const btnImportarCSV = document.getElementById('btnImportarCSV');
    const inputCSV = document.getElementById('inputCSV');
    if (btnImportarCSV && inputCSV) {
        btnImportarCSV.addEventListener('click', () => inputCSV.click());
        inputCSV.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;
                const linhas = text.split('\n');
                let adicionados = 0;
                for (let i = 1; i < linhas.length; i++) {
                    const colunas = linhas[i].split(',');
                    if (colunas.length >= 4) {
                        const novoProd = {
                            id: produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 + adicionados : 1 + adicionados,
                            ordem: 999,
                            nome: colunas[0].trim(),
                            categoria: colunas[1].trim(),
                            preco: colunas[2].trim(),
                            custo: colunas[3] ? colunas[3].trim() : '0', // Usa a 4ª coluna como custo se existir
                            estoque: parseInt(colunas[4] ? colunas[4].trim() : 0) || 0,
                            imagens: ['placeholder.jpg'],
                            tag: colunas[1].trim()
                        };
                        produtos.push(novoProd);
                        adicionados++;
                    }
                }
                salvarLocalStorage();
                renderizarLista();
                mostrarMensagem(`✅ ${adicionados} produtos importados com sucesso!`, 'sucesso');
                inputCSV.value = '';
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    // Backup Manual
    const btnBackup = document.getElementById('btnBackup');
    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            try {
                const resVendas = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID_VENDAS}/latest`, { headers: { 'X-Master-Key': CONFIG.MASTER_KEY_VENDAS } });
                const dataVendas = await resVendas.json();
                todasVendas = dataVendas.record || [];
            } catch (e) { console.warn('Erro ao carregar vendas para backup'); }

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

    // ============================================================
    // BOTÕES JSONBIN (TESTAR, ENVIAR, FORÇAR CACHE)
    // ============================================================
    btnTestar.addEventListener('click', async () => {
        const binId = jsonbinIdInput.value.trim();
        const key = jsonbinKeyInput.value.trim();
        if (!binId || !key) { alert('Preencha BIN ID e X-Master-Key.'); return; }
        try {
            const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: { 'X-Master-Key': key } });
            if (res.ok) {
                const data = await res.json();
                mostrarMensagem('✅ Conexão bem-sucedida! JSONbin contém ' + data.record.length + ' produtos.', 'sucesso');
            } else {
                mostrarMensagem('❌ Erro ao acessar JSONbin. Verifique as credenciais.', 'info');
            }
        } catch (e) { mostrarMensagem('❌ Erro de rede ao testar JSONbin.', 'info'); }
    });

    btnEnviar.addEventListener('click', async () => {
        const binId = jsonbinIdInput.value.trim();
        const key = jsonbinKeyInput.value.trim();
        if (!binId || !key) { alert('Configure o JSONbin primeiro.'); return; }
        if (!confirm('Isso substituirá o conteúdo do JSONbin pelo catálogo atual. Continuar?')) return;
        try {
            const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': key },
                body: JSON.stringify({ version: Date.now(), data: produtos })
            });
            if (res.ok) { mostrarMensagem('📤 Catálogo enviado ao JSONbin com sucesso!', 'sucesso'); localStorage.removeItem(CONFIG.CACHE_KEY); } 
            else { mostrarMensagem('❌ Falha ao enviar. Verifique permissões.', 'info'); }
        } catch (e) { mostrarMensagem('❌ Erro de rede.', 'info'); }
    });

    btnForcarCache.addEventListener('click', () => {
        localStorage.removeItem(CONFIG.CACHE_KEY);
        mostrarMensagem('Cache do catálogo removido. O site recarregará os dados na próxima visita.', 'sucesso');
    });

    carregarProdutos();
    jsonbinIdInput.value = CONFIG.BIN_ID;
    jsonbinKeyInput.value = CONFIG.MASTER_KEY;
}