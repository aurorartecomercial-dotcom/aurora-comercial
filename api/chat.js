export async function onRequestPost({ request, env }) {
  const { mensagem } = await request.json();
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'Você é um assistente da Aurora Comercial, uma loja angolana. Responda de forma simpática e útil, em português.' },
      { role: 'user', content: mensagem }
    ]
  });
  return Response.json({ resposta: response.response });
}