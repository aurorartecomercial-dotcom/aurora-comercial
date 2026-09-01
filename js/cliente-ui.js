export function initClienteUI() {
    const btnEntrar = document.getElementById('btnEntrar');
    if (!btnEntrar) return;
    btnEntrar.addEventListener('click', () => abrirModalLogin());
}

function abrirModalLogin() {
    const existing = document.getElementById('modalClienteLogin');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modalClienteLogin';
    modal.style.cssText = 'display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;';
    modal.innerHTML = `
        <div style="background:#fff; padding:30px; border-radius:20px; max-width:400px; width:100%;">
            <h2 style="color:var(--cor-esmeralda);">Entrar / Registrar</h2>
            <label>Email</label>
            <input type="email" id="loginEmail" />
            <label>Senha</label>
            <input type="password" id="loginSenha" />
            <button id="btnLoginCliente" style="background:var(--cor-ouro); padding:10px 20px; border-radius:40px; border:none; margin-top:10px;">Entrar</button>
            <button id="btnRegistarCliente" style="background:var(--cor-esmeralda); padding:10px 20px; border-radius:40px; border:none; color:#fff; margin-top:10px;">Registar</button>
            <button id="btnFecharModal" style="background:transparent; color:#999; border:none; margin-top:10px;">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btnFecharModal').addEventListener('click', () => modal.remove());

    document.getElementById('btnLoginCliente').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const senha = document.getElementById('loginSenha').value;
        const res = await fetch('/api/cliente/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('cliente_token', data.token);
            alert('Login bem-sucedido!');
            modal.remove();
            window.location.reload(); // Atualiza para mostrar seção de recomendações
        } else {
            alert('Credenciais inválidas.');
        }
    });

    document.getElementById('btnRegistarCliente').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const senha = document.getElementById('loginSenha').value;
        const nome = prompt('Seu nome:');
        const telefone = prompt('Seu telefone:');
        if (!nome || !telefone) return;
        const res = await fetch('/api/cliente/registar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, email, telefone, senha }) });
        const data = await res.json();
        if (data.success) {
            alert('Registo concluído! Faça login.');
            modal.remove();
        } else {
            alert('Erro ao registar.');
        }
    });
}