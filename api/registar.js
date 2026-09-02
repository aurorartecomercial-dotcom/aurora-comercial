export async function onRequestPost({ request, env }) {
    const { nome, email, telefone, senha } = await request.json();
    // Hash da senha (usar crypto.subtle)
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const senhaHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    await env.DB.prepare('INSERT INTO clientes (nome, email, telefone, senha_hash) VALUES (?, ?, ?, ?)')
        .bind(nome, email, telefone, senhaHash).run();
    
    return Response.json({ success: true });
}