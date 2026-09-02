export async function onRequestPost({ request, env }) {
    try {
        const { bairro, itens } = await request.json();

        // Validação básica
        if (!bairro) {
            return Response.json({ error: 'Bairro não informado' }, { status: 400 });
        }
        if (!itens || !Array.isArray(itens)) {
            return Response.json({ error: 'Itens inválidos' }, { status: 400 });
        }

        // Busca a taxa do bairro na tabela bairros_frete
        const bairroInfo = await env.DB.prepare('SELECT taxa FROM bairros_frete WHERE nome = ?').bind(bairro).first();
        if (!bairroInfo) {
            return Response.json({ error: 'Bairro não atendido' }, { status: 404 });
        }

        let total = bairroInfo.taxa;

        // Adiciona custo extra por peso (se os itens tiverem peso)
        for (const item of itens) {
            if (item.peso && item.peso > 0) {
                total += item.peso * 50; // Exemplo: 50 Kz por kg
            }
            // Se a quantidade existir, multiplica o peso pela quantidade
            if (item.quantidade && item.peso) {
                total += (item.peso * item.quantidade) * 50;
            }
        }

        return Response.json({ frete: total });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}