export function extrairValorNumerico(precoString) {
    if (!precoString) return 0;
    let valor = precoString.replace(/[^0-9,]/g, '');
    valor = valor.replace(/\./g, '');
    valor = valor.replace(',', '.');
    return parseFloat(valor) || 0;
}

export function formatarMoeda(valor) {
    return valor.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';
}

export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function gerarNumeroFatura() {
    const contador = parseInt(localStorage.getItem('aurora_fatura_contador') || '0') + 1;
    localStorage.setItem('aurora_fatura_contador', String(contador));
    const data = new Date();
    const ano = data.getFullYear().toString().slice(-2);
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `FR-${ano}${mes}${dia}-${String(contador).padStart(4, '0')}`;
}

export function mostrarToast(mensagem, tipo = 'info') {
    const toast = document.getElementById('toast-notificacao');
    const msgEl = document.getElementById('toastMensagem');
    if (!toast) return;
    msgEl.textContent = mensagem;
    toast.style.top = '20px';
    if (tipo === 'sucesso') toast.style.borderColor = '#28a745';
    else toast.style.borderColor = 'var(--cor-ouro)';
    setTimeout(() => { toast.style.top = '-100px'; }, 3000);
}

export function validarCliente(nome, telefone, nif) {
    const erros = {};
    if (!nome.trim()) erros.nome = 'Nome é obrigatório.';
    if (!telefone.trim()) erros.telefone = 'Telefone é obrigatório.';
    else if (!/^[0-9]{9,15}$/.test(telefone)) erros.telefone = 'Telefone deve conter apenas números (9 a 15 dígitos).';
    if (!nif.trim()) erros.nif = 'NIF é obrigatório.';
    else if (!/^[0-9]{10}$/.test(nif)) erros.nif = 'NIF deve conter 10 dígitos.';
    return erros;
}

export function atualizarMetaTags(titulo, descricao, imagem = '') {
    document.title = titulo;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = descricao;
    const ogTitulo = document.querySelector('meta[property="og:title"]');
    if (ogTitulo) ogTitulo.content = titulo;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = descricao;
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && imagem) ogImg.content = imagem;
}