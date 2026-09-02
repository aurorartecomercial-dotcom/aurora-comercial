export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    
    if (!url.pathname.startsWith('/api/admin')) {
        return next();
    }

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    try {
        const [header, payload, sig] = token.split('.');
        const data = `${header}.${payload}`;
        const expectedSig = await sign(data, env.SECRET_KEY || 'segredo');
        if (sig !== expectedSig) throw new Error('Assinatura inválida');
        const payloadObj = JSON.parse(atob(payload));
        if (payloadObj.exp < Date.now()) throw new Error('Token expirado');
        return next();
    } catch (e) {
        return new Response("Não autorizado", { status: 401 });
    }
}

async function sign(data, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}