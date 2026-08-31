export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json();

  if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
    const token = btoa(`${email}:${Date.now()}:${env.ADMIN_PASSWORD}`);
    return Response.json({ success: true, token });
  }

  return Response.json({ success: false, message: "Credenciais inválidas" }, { status: 401 });
}