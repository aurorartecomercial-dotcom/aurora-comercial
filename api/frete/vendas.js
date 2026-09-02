export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const codigo = 'AURORA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const dataHora = new Date().toLocaleString('pt-BR');

        const clienteId = body.clienteId || null;

        // Validação básica
        if (!body.nome || !body.telefone || !body.nif) {
            return Response.json({ success: false, error: 'Dados do cliente incompletos' }, { status: 400 });
        }

        // Inserir venda
        const result = await env.DB.prepare(
            `INSERT INTO vendas (codigo_rastreio, data_hora, nome_cliente, telefone_cliente, nif_cliente, morada_cliente, produtos_resumo, valor_total, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(codigo, dataHora, body.nome, body.telefone, body.nif, body.morada, body.produtos, body.total, clienteId).run();

        // Obter ID da venda
        const vendaId = result.meta.last_row_id;

        // Atualizar estoque (valida se existe stock suficiente)
        for (const item of body.itens) {
            if (!item.id) continue;
            
            const produto = await env.DB.prepare("SELECT estoque FROM produtos WHERE id = ?").bind(item.id).first();
            if (!produto) return Response.json({ success: false, error: `Produto ${item.nome} não encontrado` }, { status: 404 });
            
            if (produto.estoque < item.quantidade) {
                return Response.json({ success: false, error: `Stock insuficiente para ${item.nome}` }, { status: 400 });
            }
            
            await env.DB.prepare("UPDATE produtos SET estoque = estoque - ? WHERE id = ?")
                .bind(item.quantidade, item.id).run();
        }

        return Response.json({ success: true, codigo, id: vendaId });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function onRequestGet({ env }) {
    const { results } = await env.DB.prepare("SELECT * FROM vendas ORDER BY data_hora DESC").all();
    return Response.json(results);
}

export async function onRequestPut({ request, env }) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const { status } = await request.json();

        await env.DB.prepare("UPDATE vendas SET status=? WHERE id=?").bind(status, id).run();
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}