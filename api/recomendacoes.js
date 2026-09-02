export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const clienteId = url.searchParams.get('clienteId');
    
    if (!clienteId) return Response.json([]);

    // Buscar últimas compras do cliente
    const compras = await env.DB.prepare('SELECT produtos_resumo FROM vendas WHERE cliente_id = ? ORDER BY data_hora DESC LIMIT 5').bind(clienteId).all();
    
    // Extrair categorias dos produtos comprados (simplificado)
    const categorias = [];
    for (const compra of compras.results) {
        const nomes = compra.produtos_resumo.split(',').map(s => s.trim());
        for (const nome of nomes) {
            const prod = await env.DB.prepare('SELECT categoria FROM produtos WHERE nome = ?').bind(nome).first();
            if (prod && !categorias.includes(prod.categoria)) categorias.push(prod.categoria);
        }
    }

    // Buscar catálogo
    const catalogo = await env.DB.prepare('SELECT * FROM produtos').all();
    const catalogoNomes = catalogo.results.map(p => p.nome).join(', ');

    // Chamar IA
    const prompt = `Sugira 3 produtos para um cliente que comprou ${categorias.join(', ')}. Catálogo: ${catalogoNomes}. Responda apenas com os nomes dos produtos.`;
    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'user', content: prompt }] });
    const nomesSugeridos = aiResponse.response.split(',').map(s => s.trim());
    
    const produtosSugeridos = catalogo.results.filter(p => nomesSugeridos.includes(p.nome));
    return Response.json(produtosSugeridos);
}