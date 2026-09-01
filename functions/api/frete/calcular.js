export async function onRequestPost({ request, env }) {
    const { bairro, itens } = await request.json();
    // Tabela bairros_frete deve ser criada no D1
    const bairroInfo = await env.DB.prepare('SELECT taxa FROM bairros_frete WHERE nome = ?').bind(bairro).first();
    if (!bairroInfo) return Response.json({ error: 'Bairro não atendido' }, { status: 404 });
    let total = bairroInfo.taxa;
    // Adicionar peso dos itens (se tiver peso)
    for (const item of itens) {
        if (item.peso) total += item.peso * 50; // Exemplo: 50 Kz por kg
    }
    return Response.json({ frete: total });
}