export async function onRequestGet({ env, request }) {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = (page - 1) * limit;

    // Busca paginada
    const { results } = await env.DB.prepare(
        "SELECT * FROM produtos ORDER BY ordem LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();

    // Conta total de produtos para paginação
    const total = await env.DB.prepare("SELECT COUNT(*) as count FROM produtos").first();

    return Response.json({
        data: results,
        total: total.count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total.count / limit)
    });
}

export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        await env.DB.prepare(
            `INSERT INTO produtos (nome, categoria, preco, preco_antigo, descricao, imagem, estoque, tag, frete_gratis, prazo_entrega, ordem, video, custo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(body.nome, body.categoria, body.preco, body.preco_antigo || null, body.descricao || '', body.imagem || '', body.estoque, body.tag || '', body.frete_gratis ? 1 : 0, body.prazo_entrega || 'normal', body.ordem || 0, body.video || '', body.custo || '').run();
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const body = await request.json();

        await env.DB.prepare(
            `UPDATE produtos SET nome=?, categoria=?, preco=?, preco_antigo=?, descricao=?, imagem=?, estoque=?, tag=?, frete_gratis=?, prazo_entrega=?, ordem=?, video=?, custo=? WHERE id=?`
        ).bind(body.nome, body.categoria, body.preco, body.preco_antigo || null, body.descricao || '', body.imagem || '', body.estoque, body.tag || '', body.frete_gratis ? 1 : 0, body.prazo_entrega || 'normal', body.ordem || 0, body.video || '', body.custo || '', id).run();
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        await env.DB.prepare("DELETE FROM produtos WHERE id=?").bind(id).run();
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}