export async function onRequestPost({ request, env }) {
    const { email, password } = await request.json();

    if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
        const token = await criarJWT({ email, exp: Date.now() + 3600000 }, env.SECRET_KEY || 'segredo');
        return Response.json({ success: true, token });
    }

    return Response.json({ success: false, message: "Credenciais inválidas" }, { status: 401 });
}

async function criarJWT(payload, secret) {
    const encoder = new TextEncoder();
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = btoa(JSON.stringify(header));
    const payloadB64 = btoa(JSON.stringify(payload));
    const data = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return `${data}.${sigB64}`;
}