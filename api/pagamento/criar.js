export async function onRequestPost({ request, env }) {
    const { pedidoId, valor } = await request.json();
    const referencia = `MCE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    // Simulação: criar transação no gateway
    await env.DB.prepare('UPDATE vendas SET referencia_pagamento = ?, status_pagamento = ? WHERE id = ?')
        .bind(referencia, 'pendente', pedidoId).run();
    return Response.json({ success: true, referencia });
}