export async function onRequest(context) {
  const { request, env, next } = context;
  
  // 1. Se a rota NÃO começar por /api/admin, deixa passar (para permitir o HTML normal)
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/admin')) {
    return next();
  }

  // 2. Se for API admin, exige token
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const [email, timestamp, password] = atob(token).split(':');
    if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
      return next();
    }
  } catch (e) { }

  return new Response("Não autorizado", { status: 401 });
}