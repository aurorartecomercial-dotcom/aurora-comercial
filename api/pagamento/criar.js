export async function onRequestPost({ request, env }) {
    try {
        const { pedidoId, valor } = await request.json();

        if (!pedidoId || !valor) {
            return Response.json({ success: false, error: "Dados incompletos" }, { status: 400 });
        }
        if (valor <= 0) {
            return Response.json({ success: false, error: "Valor inválido" }, { status: 400 });
        }

        const venda = await env.DB.prepare("SELECT * FROM vendas WHERE id = ?").bind(pedidoId).first();
        if (!venda) {
            return Response.json({ success: false, error: "Pedido não encontrado" }, { status: 404 });
        }

        const referencia = `MCE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        await env.DB.prepare('UPDATE vendas SET referencia_pagamento = ?, status_pagamento = ? WHERE id = ?')
            .bind(referencia, 'pendente', pedidoId).run();

        return Response.json({ success: true, referencia });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}