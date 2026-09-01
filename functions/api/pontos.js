export async function onRequestPost({ request, env }) {
    const { clienteId, valorCompra } = await request.json();
    const pontos = Math.floor(valorCompra / 100); // Ex: 1 ponto por 100 Kz
    await env.DB.prepare('INSERT INTO pontos_cliente (cliente_id, pontos, criado_em) VALUES (?, ?, datetime("now"))')
        .bind(clienteId, pontos).run();
    return Response.json({ success: true, pontos });
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const clienteId = url.searchParams.get('clienteId');
    const pontosTotal = await env.DB.prepare('SELECT SUM(pontos) as total FROM pontos_cliente WHERE cliente_id = ?').bind(clienteId).first();
    return Response.json({ pontos: pontosTotal.total || 0 });
}