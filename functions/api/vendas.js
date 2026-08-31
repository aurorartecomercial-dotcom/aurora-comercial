export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const codigo = 'AURORA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const dataHora = new Date().toLocaleString('pt-BR');

  await env.DB.prepare(
    `INSERT INTO vendas (codigo_rastreio, data_hora, nome_cliente, telefone_cliente, nif_cliente, morada_cliente, produtos_resumo, valor_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(codigo, dataHora, body.nome, body.telefone, body.nif, body.morada, body.produtos, body.total).run();

  for (const item of body.itens) {
    await env.DB.prepare("UPDATE produtos SET estoque = estoque - ? WHERE nome = ?")
      .bind(item.quantidade, item.nome).run();
  }

  return Response.json({ success: true, codigo });
}