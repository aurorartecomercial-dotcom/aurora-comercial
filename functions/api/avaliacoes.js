export async function onRequestPost({ request, env }) {
  const { produtoId, nota } = await request.json();
  await env.DB.prepare("INSERT INTO avaliacoes (produto_id, nota) VALUES (?, ?)").bind(produtoId, nota).run();
  return Response.json({ success: true });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const produtoId = url.searchParams.get('produtoId');
  const { results } = await env.DB.prepare("SELECT nota FROM avaliacoes WHERE produto_id = ?").bind(produtoId).all();
  const total = results.length;
  const media = total > 0 ? results.reduce((acc, r) => acc + r.nota, 0) / total : 0;
  return Response.json({ media, total });
}