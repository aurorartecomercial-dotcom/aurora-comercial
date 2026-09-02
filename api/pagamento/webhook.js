export async function onRequestPost({ request, env }) {
    const { referencia, status } = await request.json();
    await env.DB.prepare('UPDATE vendas SET status_pagamento = ? WHERE referencia_pagamento = ?')
        .bind(status === 'pago' ? 'pago' : 'falhou', referencia).run();
    return Response.json({ success: true });
}