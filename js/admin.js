export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const codigo = 'AURORA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const dataHora = new Date().toISOString(); // Guarda em formato ISO (2026-09-01T...)

  // Guarda os itens e a categoria como JSON
  const itensJSON = JSON.stringify(body.itens || []);
  const categorias = [...new Set((body.itens || []).map(i => {
      const prod = body.produtos_categorias && body.produtos_categorias[i.id];
      return prod ? prod.categoria : 'geral';
  }))].join(', ');

  await env.DB.prepare(
    `INSERT INTO vendas (codigo_rastreio, data_hora, nome_cliente, telefone_cliente, nif_cliente, morada_cliente, produtos_resumo, valor_total, itens, categoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(codigo, dataHora, body.nome, body.telefone, body.nif, body.morada, body.produtos, body.total, itensJSON, categorias).run();

  // Atualiza o estoque (usando ID se existir)
  for (const item of body.itens) {
    if (item.id) {
      await env.DB.prepare("UPDATE produtos SET estoque = estoque - ? WHERE id = ?")
        .bind(item.quantidade, item.id).run();
    } else {
      await env.DB.prepare("UPDATE produtos SET estoque = estoque - ? WHERE nome = ?")
        .bind(item.quantidade, item.nome).run();
    }
  }

  return Response.json({ success: true, codigo });
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM vendas ORDER BY data_hora DESC").all();
  // Converte os itens de volta para array
  results.forEach(v => {
    if (v.itens) {
      try { v.itens = JSON.parse(v.itens); } catch(e) { v.itens = []; }
    } else {
      v.itens = [];
    }
  });
  return Response.json(results);
}

export async function onRequestPut({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const { status } = await request.json();

  await env.DB.prepare("UPDATE vendas SET status=? WHERE id=?").bind(status, id).run();
  return Response.json({ success: true });
}