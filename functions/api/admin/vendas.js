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