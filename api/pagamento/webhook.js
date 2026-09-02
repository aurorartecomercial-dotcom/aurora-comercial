export async function onRequestPost({ request, env }) {
    try {
        const { referencia, status } = await request.json();

        if (!referencia || !status) {
            return Response.json({ success: false, error: "Dados incompletos" }, { status: 400 });
        }

        const statusNormalizado = status === 'pago' ? 'pago' : 'falhou';

        const result = await env.DB.prepare('UPDATE vendas SET status_pagamento = ? WHERE referencia_pagamento = ?')
            .bind(statusNormalizado, referencia).run();

        if (result.meta.changes === 0) {
            return Response.json({ success: false, error: "Referência não encontrada" }, { status: 404 });
        }

        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}