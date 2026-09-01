export async function onRequestGet({ request, env }) {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    try {
        const [header, payload, sig] = token.split('.');
        const payloadObj = JSON.parse(atob(payload));
        const clienteId = payloadObj.id;
        const cliente = await env.DB.prepare('SELECT id, nome, email FROM clientes WHERE id = ?').bind(clienteId).first();
        return Response.json(cliente || { id: null });
    } catch (e) {
        return Response.json({ id: null });
    }
}