export async function onRequestPost({ request, env }) {
    const body = await request.json();
    const codigo = 'AURORA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const dataHora = new Date().toLocaleString('pt-BR');

    const clienteId = body.clienteId || null;

    const result = await env.DB.prepare(
        `INSERT INTO vendas (codigo_rastreio, data_hora, nome_cliente, telefone_cliente, nif_cliente, morada_cliente, produtos_resumo, valor_total, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(codigo, dataHora, body.nome, body.telefone, body.nif, body.morada, body.produtos, body.total, clienteId).run();

    const vendaId = result.meta.last_row_id;

    for (const item of body.itens) {
        await env.DB.prepare("UPDATE produtos SET estoque = estoque - ? WHERE id = ?")
            .bind(item.quantidade, item.id).run();
    }

    return Response.json({ success: true, codigo, id: vendaId });
}

export async function onRequestGet({ env }) {
    const { results } = await env.DB.prepare("SELECT * FROM vendas ORDER BY data_hora DESC").all();
    return Response.json(results);
}

export async function onRequestPut({ request, env }) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const { status } = await request.json();

    await env.DB.prepare("UPDATE vendas SET status=? WHERE id=?").bind(status, id).run();
    return Response.json({ success: true });
}