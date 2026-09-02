export async function onRequestPost({ request, env }) {
    const { email, senha } = await request.json();
    const cliente = await env.DB.prepare('SELECT * FROM clientes WHERE email = ?').bind(email).first();
    if (!cliente) return Response.json({ success: false }, { status: 401 });
    
    const hash = await hashSenha(senha);
    if (hash !== cliente.senha_hash) return Response.json({ success: false }, { status: 401 });
    
    // Gera token do cliente com JWT similar ao admin
    const token = await criarJWT({ id: cliente.id, email: cliente.email, exp: Date.now() + 86400000 }, env.SECRET_KEY || 'segredo');
    return Response.json({ success: true, token, cliente: { nome: cliente.nome, email: cliente.email } });
}

async function hashSenha(senha) {
    const data = new TextEncoder().encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}