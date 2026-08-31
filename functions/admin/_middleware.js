export async function onRequest(context) {
  const { request, env, next } = context;
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