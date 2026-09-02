export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get('codigo');
  
  if (!codigo) {
    return Response.json({ error: "Código não fornecido" }, { status: 400 });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM vendas WHERE codigo_rastreio = ?"
  ).bind(codigo).all();

  if (results.length === 0) {
    return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  return Response.json(results[0]);
}