export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM produtos ORDER BY ordem").all();
  return Response.json(results);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  await env.DB.prepare(
    `INSERT INTO produtos (nome, categoria, preco, preco_antigo, descricao, imagem, estoque, tag, frete_gratis, prazo_entrega, ordem, video) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(body.nome, body.categoria, body.preco, body.preco_antigo || null, body.descricao || '', body.imagem || '', body.estoque, body.tag || '', body.frete_gratis ? 1 : 0, body.prazo_entrega || 'normal', body.ordem || 0, body.video || '').run();
  return Response.json({ success: true });
}