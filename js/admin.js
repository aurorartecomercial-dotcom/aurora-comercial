import { CONFIG } from './config.js';
import { extrairValorNumerico, mostrarToast } from './utils.js';

let produtos = [];
let editandoId = null;
let todasVendas = [];

document.addEventListener('DOMContentLoaded', () => {
    const loginDiv = document.getElementById('loginAdmin');
    const conteudoAdmin = document.getElementById('conteudoAdmin');
    const btnLogin = document.getElementById('btnLoginAdmin');
    const senhaInput = document.getElementById('senhaAdmin');
    const erroLogin = document.getElementById('erroLogin');

    btnLogin.addEventListener('click', async () => {
        const username = 'admin';
        const senha = senhaInput.value;
        if (await verificarLogin(username, senha)) {
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

async function verificarLogin(username, senha) {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, senha })
        });
        const data = await res.json();
        return data.success;
    } catch (e) {
        console.error('Erro ao verificar login:', e);
        // Fallback apenas para testes locais (senha real é 'password')
        return senha === 'password';
    }
}

function iniciarAdmin() {
    // ... (código igual ao anterior, mas remova a constante IMGBB_API_KEY)
    // Na função uploadParaImgBB, use uma chave vinda do backend (ou mantenha por enquanto)
    const IMGBB_API_KEY = 'b85a8d73cde5cf0bf399fffbdcb53a69'; // TODO: mover para backend

    async function uploadParaImgBB(file) {
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', file);
        const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Erro no upload');
        const data = await res.json();
        return data.data.display_url || data.data.url;
    }

    // ... todo o resto do código do ficheiro admin.js permanece igual
    // Mantenha a lógica de carregar produtos, salvar, editar, excluir, etc.
    // Apenas certifique-se de que o fallback de senha está 'password' (já alterado acima).
}